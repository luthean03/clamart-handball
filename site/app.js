/* Clamart Handball — application d'une page, sans dépendance.
   Lit data/club.json (produit par collecteur/collecte.py) et affiche :
     #/              ce week-end : prochains matchs + derniers résultats
     #/equipes       toutes les équipes et leur place
     #/equipe/<id>   fiche équipe : classement, matchs (avec leurs buteurs), agenda */

"use strict";

const app = document.getElementById("app");
const TZ = "Europe/Paris";
const fJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
const fCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
const fHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const fCle = new Intl.DateTimeFormat("fr-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ });
const JOUR_MS = 86400000;

let DATA = null;

/* ------------------------------------------------------------------ utilitaires */
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/* 'LEVALLOIS SC 1D' -> 'Levallois SC 1D', 'GYMNASE DU PETIT CLAMART' -> 'Gymnase du Petit Clamart' */
const PETITS = new Set(["de", "du", "des", "la", "le", "les", "et", "sur", "sous", "en", "aux", "au", "ans"]);
const titre = (t) => String(t ?? "").split(/(\s+|[-/(])/).map((w, i) => {
  if (!/\p{L}/u.test(w)) return w;
  if (/^(st|ste)$/i.test(w)) return w[0].toUpperCase() + w.slice(1).toLowerCase();
  if (/\d/.test(w) || (w.length <= 3 && w === w.toUpperCase() && !PETITS.has(w.toLowerCase()))) return w.toUpperCase();
  const l = w.toLowerCase();
  if (i > 0 && PETITS.has(l)) return l;
  return l.replace(/^(\p{L})|(['’]\p{L})/gu, (c) => c.toUpperCase());
}).join("");
const date = (iso) => (iso ? new Date(iso) : null);
const lien = (h) => `#/${h}`;
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);

function tousLesMatchs() {
  return DATA.equipes.flatMap((e) => e.matchs.map((m) => ({ ...m, equipe: e })));
}

function forme(chaine) {
  if (!chaine) return "";
  const mots = { V: "victoire", N: "nul", D: "défaite" };
  return `<span class="forme" aria-label="Forme : ${[...chaine].map((r) => mots[r]).join(", ")}">${[...chaine]
    .map((r) => `<span class="f-${r}" aria-hidden="true">${r}</span>`).join("")}</span>`;
}

function lieu(m) {
  return m.domicile ? `<span class="lieu lieu--dom">Domicile</span>` : `<span class="lieu lieu--ext">Extérieur</span>`;
}

function salle(m) {
  if (!m.salle || !m.salle.nom) return "";
  const q = encodeURIComponent(`${m.salle.nom} ${m.salle.adresse || ""}`);
  return `<a href="https://www.google.com/maps/search/?api=1&query=${q}" rel="noopener">${esc(titre(m.salle.nom))}</a>${
    m.salle.adresse ? `, ${esc(titre(m.salle.adresse))}` : ""}`;
}

function relatif(iso) {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 2) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 48 * 60) return `il y a ${Math.round(min / 60)} h`;
  return `le ${fCourt.format(new Date(iso))}`;
}

function marquerNav(cle) {
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === cle) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

/* ------------------------------------------------------------------ blocs réutilisables */
function ligneMatchAVenir(m) {
  const d = date(m.date);
  return `<li><a class="match" href="${lien("equipe/" + m.equipe.id)}">
    <span class="match__heure num">${fHeure.format(d).replace(":", "h")}</span>
    <span class="match__equipe">${esc(m.equipe.nom)} <span class="note">${esc(m.equipe.detail)}</span></span>
    <span class="match__adv">contre ${esc(titre(m.adversaire))}</span>
    <span class="match__lieu">${lieu(m)}${m.salle && m.salle.nom ? esc(titre(m.salle.nom)) : ""}</span>
  </a></li>`;
}

function tableau(m) {
  const res = { V: "Victoire", N: "Match nul", D: "Défaite" }[m.resultat];
  return `<a class="tableau tableau--${m.resultat}" href="${lien("equipe/" + m.equipe.id)}"
      aria-label="${esc(m.equipe.nom)} ${res} ${m.score_nous} à ${m.score_eux} contre ${esc(titre(m.adversaire))}">
    <span class="tableau__equipe">${esc(m.equipe.nom)}</span>
    <span class="tableau__adv">${m.domicile ? "contre" : "chez"} ${esc(titre(m.adversaire))}</span>
    <span class="tableau__score" aria-hidden="true"><span class="nous">${m.score_nous}</span><span class="sep">–</span><span class="eux">${m.score_eux}</span></span>
    <span class="tableau__res">${res}, ${fCourt.format(date(m.date))}</span>
  </a>`;
}

function parJour(matchs, rendu) {
  const jours = new Map();
  for (const m of matchs) {
    const cle = fCle.format(date(m.date));
    if (!jours.has(cle)) jours.set(cle, []);
    jours.get(cle).push(m);
  }
  return [...jours.values()].map((ms) =>
    `<h3 class="jour">${fJour.format(date(ms[0].date))}</h3><ul class="liste">${ms.map(rendu).join("")}</ul>`).join("");
}

/* ------------------------------------------------------------------ pages */
function pageAccueil() {
  marquerNav("accueil");
  const maintenant = Date.now();
  const tous = tousLesMatchs().filter((m) => m.date);

  let aVenir = tous.filter((m) => !m.resultat && date(m.date) >= maintenant - 2 * 3600000)
    .sort((a, b) => date(a.date) - date(b.date));
  const semaine = aVenir.filter((m) => date(m.date) - maintenant < 7 * JOUR_MS);
  const titreVenir = semaine.length ? "Cette semaine" : "Prochains matchs";
  aVenir = semaine.length ? semaine : aVenir.slice(0, 6);

  let resultats = tous.filter((m) => m.resultat).sort((a, b) => date(b.date) - date(a.date));
  const recents = resultats.filter((m) => maintenant - date(m.date) < 8 * JOUR_MS);
  resultats = recents.length ? recents : resultats.slice(0, 6);

  app.innerHTML = `
    <section aria-labelledby="t-venir">
      <div class="tete">
        <h1 id="t-venir">${titreVenir}</h1>
        <p>Saison ${esc(DATA.saison)}, ${DATA.equipes.length} équipes engagées</p>
      </div>
      ${aVenir.length ? parJour(aVenir, ligneMatchAVenir)
        : `<p class="vide">Aucun match programmé pour l'instant. Les horaires apparaissent ici dès que le comité les publie.</p>`}
    </section>

    <section class="bloc" aria-labelledby="t-res">
      <h2 id="t-res">Derniers résultats</h2>
      <p class="sous">${recents.length ? "Matchs des 8 derniers jours" : "Les derniers matchs joués"}</p>
      ${resultats.length ? `<div class="tableaux">${resultats.map(tableau).join("")}</div>`
        : `<p class="vide">Pas encore de résultat cette saison.</p>`}
    </section>

    <section class="bloc" aria-labelledby="t-cl">
      <h2 id="t-cl">Au classement</h2>
      <p class="sous">Place de chaque équipe dans sa poule</p>
      <ul class="liste">${DATA.equipes.filter((e) => e.place).map(ligneEquipe).join("")}</ul>
    </section>`;
}

function ligneEquipe(e) {
  return `<li><a class="equipe-ligne" href="${lien("equipe/" + e.id)}">
    <span class="equipe-ligne__nom">${esc(e.nom)}</span>
    <span class="equipe-ligne__comp">${esc(e.detail)}${e.poule && !/unique/i.test(e.poule) ? `, ${esc(titre(e.poule))}` : ""} ${forme(e.forme)}</span>
    <span class="equipe-ligne__place">${e.place ? `<span class="place num">${ordinal(e.place)}<small>/ ${e.nb_equipes}</small></span>`
      : `<span class="note">${/coupe/i.test(e.detail) ? "Coupe" : ""}</span>`}</span>
  </a></li>`;
}

function pageEquipes() {
  marquerNav("equipes");
  const seniors = DATA.equipes.filter((e) => e.categorie === "seniors");
  const jeunes = DATA.equipes.filter((e) => e.categorie !== "seniors");
  app.innerHTML = `
    <div class="tete"><h1>Nos équipes</h1><p>Toutes les équipes engagées en championnat et en coupe</p></div>
    <h2 class="groupe">Seniors</h2><ul class="liste">${seniors.map(ligneEquipe).join("")}</ul>
    <h2 class="groupe">Jeunes</h2><ul class="liste">${jeunes.map(ligneEquipe).join("")}</ul>
    <p class="note" style="margin-top:20px">Tous les matchs du club dans votre agenda :
      <a href="data/agenda/club.ics">calendrier complet (.ics)</a></p>`;
}

function pageEquipe(id) {
  marquerNav("equipes");
  const e = DATA.equipes.find((x) => x.id === id);
  if (!e) {
    app.innerHTML = `<div class="erreur"><strong>Équipe introuvable</strong><a href="#/equipes">Voir toutes les équipes</a></div>`;
    return;
  }
  const maintenant = Date.now();
  const joues = e.matchs.filter((m) => m.resultat).sort((a, b) => date(b.date) - date(a.date));
  const prochain = e.matchs.filter((m) => !m.resultat && m.date && date(m.date) >= maintenant - 2 * 3600000)
    .sort((a, b) => date(a.date) - date(b.date))[0];
  const sansDate = e.matchs.filter((m) => !m.resultat && !m.date);
  const aVenir = e.matchs.filter((m) => !m.resultat && m.date && m !== prochain && date(m.date) >= maintenant)
    .sort((a, b) => date(a.date) - date(b.date));

  app.innerHTML = `
    <a class="retour" href="#/equipes">Toutes les équipes</a>
    <div class="tete">
      <h1>${esc(e.nom)}</h1>
      <p>${esc(titre(e.competition))}${e.poule && !/unique/i.test(e.poule) ? `, ${esc(titre(e.poule))}` : ""}</p>
      <ul class="chiffres">
        ${e.place ? `<li><span class="val">${ordinal(e.place)}<small class="note"> / ${e.nb_equipes}</small></span><span class="lib">au classement</span></li>` : ""}
        <li><span class="val">${e.bilan.victoires}–${e.bilan.nuls}–${e.bilan.defaites}</span><span class="lib">victoires, nuls, défaites</span></li>
        ${e.bilan.joues ? `<li><span class="val">${e.bilan.bp - e.bilan.bc > 0 ? "+" : ""}${e.bilan.bp - e.bilan.bc}</span><span class="lib">différence de buts</span></li>` : ""}
        ${e.forme ? `<li><span class="val">${forme(e.forme)}</span><span class="lib">derniers matchs</span></li>` : ""}
      </ul>
      <a class="agenda-lien" href="data/agenda/${encodeURIComponent(e.id)}.ics">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 8H5v10h14V10Z"/></svg>
        Ajouter les matchs à mon agenda
      </a>
    </div>

    ${prochain ? `<section class="bloc" aria-labelledby="t-pro">
      <h2 id="t-pro">Prochain match</h2>
      <div class="prochain">
        <h3>${esc(titre(prochain.adversaire))}</h3>
        <p>${fJour.format(date(prochain.date))} à ${fHeure.format(date(prochain.date)).replace(":", "h")}</p>
        <p>${lieu(prochain)}${salle(prochain)}</p>
      </div></section>` : ""}

    ${e.classement ? `<section class="bloc" aria-labelledby="t-cl">
      <h2 id="t-cl">Classement</h2>
      <p class="sous">${esc(titre(e.poule || ""))}${e.phase && !e.phase.includes(e.competition) && !/^1re phase$/i.test(e.phase)
        ? `, ${esc(titre(e.phase))}` : ""}</p>
      <div class="table-defile"><table>
        <thead><tr><th scope="col">#</th><th scope="col" class="equipe">Équipe</th><th scope="col">Pts</th>
          <th scope="col">J</th><th scope="col">G</th><th scope="col">N</th><th scope="col">P</th><th scope="col">Diff</th></tr></thead>
        <tbody>${e.classement.map((l) => `<tr class="${l.nous ? "nous" : ""}">
          <td>${l.place}</td><td class="equipe">${esc(titre(l.equipe))}</td><td class="pts">${l.points}</td>
          <td>${l.joues}</td><td>${l.gagnes}</td><td>${l.nuls}</td><td>${l.perdus}</td>
          <td>${l.diff > 0 ? "+" : ""}${l.diff}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="sous"><a href="${esc(e.url_ffhb)}" rel="noopener">Voir sur ffhandball.fr</a></p></section>` : ""}

    <section class="bloc" aria-labelledby="t-res">
      <h2 id="t-res">Résultats</h2>
      ${joues.length ? `<div class="liste">${joues.map((m) => detailMatch(m)).join("")}</div>`
        : `<p class="vide">Aucun match joué pour l'instant.</p>`}
    </section>

    ${aVenir.length || sansDate.length ? `<section class="bloc" aria-labelledby="t-cal">
      <h2 id="t-cal">Calendrier</h2>
      ${aVenir.length ? parJour(aVenir, (m) => ligneMatchAVenir({ ...m, equipe: e })) : ""}
      ${sansDate.length ? `<p class="note">${sansDate.length} match${sansDate.length > 1 ? "s" : ""} pas encore programmé${sansDate.length > 1 ? "s" : ""} :
        ${sansDate.map((m) => `${esc(titre(m.adversaire))} (${m.domicile ? "dom." : "ext."})`).join(", ")}.</p>` : ""}
    </section>` : ""}

    <p class="note" style="margin-top:28px"><a href="${esc(e.url_ffhb)}" rel="noopener">Voir cette équipe sur le site de la FFHB</a></p>`;
}

/* Buteurs d'un côté du match : titre + liste (rien si personne n'a marqué). */
function listeButeurs(nom, buteurs) {
  const lignes = (buteurs || []).filter((b) => b.buts > 0);
  return lignes.length ? `<h4 class="buteurs-titre">${esc(nom)}</h4><ul class="buteurs-match">${lignes.map((b) =>
    `<li><span>${esc(b.joueur)}</span><span class="num">${b.buts}</span></li>`).join("")}</ul>` : "";
}

/* Schéma 3 : buteurs (Clamart) et buteurs_adverses ; schéma 2 : buteurs seuls, absents pour les jeunes. */
function blocButeurs(m) {
  if (!m.buteurs) return "";
  const html = listeButeurs("Clamart", m.buteurs) + listeButeurs(titre(m.adversaire), m.buteurs_adverses);
  return html || `<p class="note">Buteurs pas encore publiés.</p>`;
}

function detailMatch(m) {
  return `<details class="mj">
    <summary>
      <span class="mj__adv">${esc(titre(m.adversaire))}</span>
      <span class="mj__date">${fCourt.format(date(m.date))}, ${m.domicile ? "à domicile" : "à l'extérieur"}</span>
      <span class="mj__score num">${m.score_nous}–${m.score_eux} ${forme(m.resultat)}</span>
    </summary>
    <div class="mj__det">
      ${m.mt_nous != null ? `<p>Mi-temps : ${m.mt_nous}–${m.mt_eux}</p>` : ""}
      ${m.salle && m.salle.nom ? `<p>Salle : ${salle(m)}</p>` : ""}
      ${blocButeurs(m)}
      <p class="liens">
        <a href="${esc(m.url_ffhb)}" rel="noopener">Page du match (FFHB)</a>
        ${m.feuille_de_match ? `<a href="${esc(m.feuille_de_match)}" rel="noopener">Feuille de match (PDF)</a>` : ""}
      </p>
    </div>
  </details>`;
}

/* ------------------------------------------------------------------ routeur */
function router() {
  if (!DATA) return;
  const [page, id] = (location.hash.replace(/^#\/?/, "") || "").split("/");
  if (page === "equipes") pageEquipes();
  else if (page === "equipe" && id) pageEquipe(decodeURIComponent(id));
  else pageAccueil();
  window.scrollTo(0, 0);
}

async function demarrer() {
  try {
    DATA = window.CLUB_DATA || await fetch("data/club.json", { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  } catch (err) {
    app.innerHTML = `<div class="erreur"><strong>Impossible de charger les résultats.</strong>
      Vérifiez votre connexion puis rechargez la page.</div>`;
    return;
  }
  const s = DATA.site || {};
  if (s.couleur_principale) document.documentElement.style.setProperty("--club", s.couleur_principale);
  if (s.couleur_accent) document.documentElement.style.setProperty("--accent", s.couleur_accent);
  if (s.titre) { document.getElementById("nom-club").textContent = s.titre; }
  document.getElementById("maj").textContent = `Dernière mise à jour ${relatif(DATA.mis_a_jour)}.`;
  router();
}

window.addEventListener("hashchange", router);
demarrer();
