import { jourDuMatch, type Weekend } from './dates';
import { phraseResultat, type Phrase } from './phrase';
import { matchsDuCollectif, prochainMatch, serieEnCours } from './selecteurs';
import type { Club, MatchAvecEquipe } from './types';

export type ResumeCarte =
  | { type: 'resultat'; match: MatchAvecEquipe; phrase: Phrase }
  | { type: 'a-venir'; match: MatchAvecEquipe }
  | { type: 'en-attente'; match: MatchAvecEquipe }
  | { type: 'sans-match'; prochain?: MatchAvecEquipe };

/**
 * Ce que la carte d'une équipe montre pour ce week-end : le dernier match commencé
 * (résultat ou score en attente), sinon le prochain match du week-end, sinon le prochain match connu.
 */
export function resumeCarte(club: Club, collectifId: string, weekend: Weekend, maintenant: Date): ResumeCarte {
  const tous = matchsDuCollectif(club, collectifId);
  const duWeekend = tous.filter(
    (m) => m.date !== null && jourDuMatch(m.date) >= weekend.vendredi && jourDuMatch(m.date) <= weekend.dimanche,
  );
  const commences = duWeekend.filter((m) => Date.parse(m.date!) <= maintenant.getTime());
  const courant = commences[commences.length - 1];
  if (courant) {
    if (courant.resultat === null) return { type: 'en-attente', match: courant };
    const jusquIci = tous.slice(0, tous.indexOf(courant) + 1);
    return { type: 'resultat', match: courant, phrase: phraseResultat(courant, serieEnCours(jusquIci))! };
  }
  if (duWeekend[0]) return { type: 'a-venir', match: duWeekend[0] };
  return { type: 'sans-match', prochain: prochainMatch(club, collectifId, maintenant) };
}
