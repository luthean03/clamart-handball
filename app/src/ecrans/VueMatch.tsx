import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Surface, Text } from 'react-native-paper';
import { CONTENU_BOUTON, NOM_SANS_COUPURE } from '../composants/commun';
import { EnTeteSection } from '../composants/EnTeteSection';
import { libelleScoreLu } from '../composants/LigneMatch';
import { Ecusson, EcussonClub } from '../composants/Ecusson';
import { heureDuMatch, jourDuMatch, libelleJour } from '../donnees/dates';
import { lierNumero, nomLisible, phraseResultat } from '../donnees/phrase';
import { matchParId, matchsDuCollectif, scoreEnAttente, serieEnCours } from '../donnees/selecteurs';
import type { Buteur, Club, MatchAvecEquipe, Salle } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  matchId: string;
  equipeId?: string;
  maintenant: Date;
  onRetour: () => void;
  onItineraire: (salle: Salle) => void;
  onOuvrirLien: (url: string) => void;
  onAgenda: (m: MatchAvecEquipe) => void;
}

function Carte({ children }: { children: ReactNode }) {
  const t = useThemeClub();
  return (
    <Surface style={{ borderRadius: t.rayonCarte }} elevation={1}>
      <View style={[styles.liste, styles.carte, { borderRadius: t.rayonCarte }]}>{children}</View>
    </Surface>
  );
}

/** Seulement ceux qui ont marqué, du meilleur au moins bon (le tri est stable : l'ordre de la feuille départage). */
function ayantMarque(liste: Buteur[] | undefined): Buteur[] {
  return (liste ?? []).filter((b) => b.buts > 0).sort((a, b) => b.buts - a.buts);
}

function ColonneButeurs({ titre, ecusson, buteurs }: { titre: string; ecusson: ReactNode; buteurs: Buteur[] }) {
  const t = useThemeClub();
  return (
    <View style={styles.colonne}>
      <View style={styles.titreColonne}>
        {ecusson}
        <Text variant="labelMedium" numberOfLines={1} style={[styles.nomColonne, { color: t.colors.onSurfaceVariant }]}>{titre}</Text>
      </View>
      {buteurs.map((b, i) => (
        <View
          key={i}
          style={[styles.buteur, i > 0 && { borderTopColor: t.colors.outlineVariant, borderTopWidth: StyleSheet.hairlineWidth }]}
          accessible
          accessibilityLabel={`${b.joueur}, ${b.buts} ${b.buts > 1 ? 'buts' : 'but'}`}
        >
          <Text variant="bodyMedium" style={[styles.joueur, { color: t.colors.onSurface }]}>{b.joueur}</Text>
          <Text variant="titleSmall" style={{ color: t.club.titre, fontFamily: POLICES.gras }}>{b.buts}</Text>
        </View>
      ))}
    </View>
  );
}

export function VueMatch({ club, matchId, equipeId, maintenant, onRetour, onItineraire, onOuvrirLien, onAgenda }: Props) {
  const t = useThemeClub();
  const m = matchParId(club, matchId, equipeId);

  if (!m) {
    return (
      <View style={[styles.page, { backgroundColor: t.colors.background }]}>
        <Appbar.Header style={{ backgroundColor: t.colors.background }}>
          <Appbar.BackAction onPress={onRetour} accessibilityLabel="Retour" style={styles.action} />
        </Appbar.Header>
        <View style={styles.vide}>
          <Text variant="titleLarge" style={{ color: t.club.titre }}>Match introuvable</Text>
          <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>Il ne figure plus dans les résultats de la saison.</Text>
        </View>
      </View>
    );
  }

  const tous = matchsDuCollectif(club, m.equipe.collectif);
  const index = tous.findIndex((x) => x.id === m.id && x.equipe.id === m.equipe.id);
  const phrase = phraseResultat(m, serieEnCours(tous.slice(0, index + 1)));
  const adversaire = nomLisible(m.adversaire);
  const nous = `Clamart ${m.equipe.nom}`;
  const aVenir = m.resultat === null && m.date !== null && !scoreEnAttente(m, maintenant);
  const butsNous = ayantMarque(m.buteurs);
  const butsEux = ayantMarque(m.buteurs_adverses);
  const camps = m.domicile
    ? [{ nom: nous, score: m.score_nous, club: true }, { nom: adversaire, score: m.score_eux, club: false }]
    : [{ nom: adversaire, score: m.score_eux, club: false }, { nom: nous, score: m.score_nous, club: true }];
  const miTemps = m.mt_nous !== null && m.mt_eux !== null ? `Mi-temps ${m.mt_nous}–${m.mt_eux}` : undefined;

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.BackAction onPress={onRetour} accessibilityLabel="Retour" style={styles.action} />
        <Appbar.Content title={m.journee ? `${m.equipe.nom} · J${m.journee}` : m.equipe.nom} titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Carte>
          <Text variant="titleLarge" style={{ color: t.club.titre }} accessibilityRole="header">
            {lierNumero(phrase?.titre ?? `Contre ${adversaire}`)}
          </Text>
          {phrase?.sousTitre ? <Text variant="bodyMedium" style={{ color: t.club.victoire.texte }}>{phrase.sousTitre}</Text> : null}
          <View style={styles.camps} accessible accessibilityLabel={libelleScoreLu(m)}>
            {camps.map((c) => (
              <View key={c.nom} style={styles.camp}>
                {c.club ? <EcussonClub taille={28} /> : <Ecusson uri={m.logo_adversaire} nom={c.nom} taille={28} />}
                <Text variant="bodyLarge" numberOfLines={2} {...NOM_SANS_COUPURE} style={[styles.nomCamp, { color: t.colors.onSurface }]}>{lierNumero(c.nom)}</Text>
                <Text variant="headlineSmall" style={[styles.score, { color: t.club.titre }]}>{c.score ?? '–'}</Text>
              </View>
            ))}
          </View>
          {miTemps ? <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>{miTemps}</Text> : null}
          {m.resultat === null && scoreEnAttente(m, maintenant) ? (
            <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>Score pas encore publié</Text>
          ) : null}
        </Carte>

        <EnTeteSection titre="Infos" />
        <Carte>
          <Text variant="titleSmall" style={{ color: t.colors.onSurface, fontFamily: POLICES.gras }}>
            {[m.equipe.detail, m.journee ? `journée ${m.journee}` : null].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="bodyLarge" style={{ color: t.colors.onSurface }}>
            {m.date ? `${libelleJour(jourDuMatch(m.date), 'long')} à ${heureDuMatch(m.date)}` : 'Date à venir'}
          </Text>
          <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
            {[m.salle?.nom ? nomLisible(m.salle.nom) : null, m.domicile ? 'domicile' : 'extérieur'].filter(Boolean).join(' · ')}
          </Text>
          {m.salle?.adresse ? <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>{m.salle.adresse}</Text> : null}
          {m.salle?.nom || m.salle?.adresse ? (
            <Button mode="contained-tonal" icon="map-marker-radius" style={styles.itineraire} contentStyle={CONTENU_BOUTON} onPress={() => onItineraire(m.salle!)}>Itinéraire</Button>
          ) : null}
        </Carte>

        {aVenir ? (
          <View style={styles.actions}>
            <Button mode="contained" icon="calendar-plus" contentStyle={CONTENU_BOUTON} onPress={() => onAgenda(m)}>Ajouter à l'agenda</Button>
          </View>
        ) : null}

        {butsNous.length || butsEux.length ? (
          <>
            <EnTeteSection titre="Buteurs" />
            <Carte>
              <View style={styles.colonnes}>
                {butsNous.length ? <ColonneButeurs titre="Clamart" ecusson={<EcussonClub taille={16} />} buteurs={butsNous} /> : null}
                {butsEux.length ? <ColonneButeurs titre={adversaire} ecusson={<Ecusson uri={m.logo_adversaire} nom={adversaire} taille={16} />} buteurs={butsEux} /> : null}
              </View>
            </Carte>
          </>
        ) : null}

        <View style={styles.bas}>
          {m.feuille_de_match ? (
            <Button
              mode="elevated"
              icon="file-document-outline"
              buttonColor={t.colors.surface}
              textColor={t.colors.onSurface}
              labelStyle={styles.libelleFeuille}
              contentStyle={CONTENU_BOUTON}
              onPress={() => onOuvrirLien(m.feuille_de_match!)}
            >
              Feuille de match
            </Button>
          ) : null}
          <Button mode="text" icon="open-in-new" labelStyle={styles.libelleLien} contentStyle={CONTENU_BOUTON} onPress={() => onOuvrirLien(m.url_ffhb)}>Voir sur ffhandball.fr</Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  action: { width: 48, height: 48, margin: 0, borderRadius: 24 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  carte: { padding: 16, gap: 8 },
  camps: { gap: 10, marginTop: 8 },
  camp: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nomCamp: { flex: 1 },
  score: { fontVariant: ['tabular-nums'], minWidth: 36, textAlign: 'right' },
  itineraire: { marginTop: 8 },
  actions: { marginTop: 16 },
  bas: { gap: 4, marginTop: 24 },
  libelleFeuille: { fontSize: 13, fontFamily: POLICES.gras },
  libelleLien: { fontSize: 12, fontFamily: POLICES.gras },
  liste: { overflow: 'hidden' },
  colonnes: { flexDirection: 'row', gap: 12 },
  colonne: { flex: 1 },
  titreColonne: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  nomColonne: { flex: 1, textTransform: 'uppercase', fontFamily: POLICES.gras },
  buteur: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 4 },
  joueur: { flex: 1 },
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
});
