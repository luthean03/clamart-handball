import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { dateCourte, heureDuMatch } from '../donnees/dates';
import { lierNumero, nomLisible, permettreCesure } from '../donnees/phrase';
import { scoreEnAttente } from '../donnees/selecteurs';
import type { MatchAvecEquipe } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';
import { NOM_SANS_COUPURE } from './commun';
import { Ecusson, EcussonClub } from './Ecusson';
import { LIBELLES } from './PastilleResultat';

interface Props {
  match: MatchAvecEquipe;
  maintenant: Date;
  onPress: () => void;
  afficherCompetition?: boolean;
  /** Date courte (17/10) au-dessus de l'heure, pour les listes de matchs à venir de dates différentes. */
  afficherDate?: boolean;
}

/** Les deux camps dans l'ordre d'affichage (celui qui reçoit en premier) et leurs scores. */
export function campsDuMatch(match: MatchAvecEquipe) {
  const nous = `Clamart ${match.equipe.nom}`;
  const eux = nomLisible(match.adversaire);
  const [dom, ext] = match.domicile ? [nous, eux] : [eux, nous];
  const [sDom, sExt] = match.domicile ? [match.score_nous, match.score_eux] : [match.score_eux, match.score_nous];
  const joue = match.resultat !== null && sDom !== null && sExt !== null;
  return { dom, ext, sDom, sExt, joue };
}

/** Le score lu en une phrase par les lecteurs d'écran, sans dépendre de la couleur. */
export function libelleScoreLu(match: MatchAvecEquipe): string {
  const { dom, ext, sDom, sExt, joue } = campsDuMatch(match);
  return joue ? `${dom} ${sDom}, ${ext} ${sExt}, ${LIBELLES[match.resultat!]}` : `${dom} contre ${ext}`;
}

/** Une ligne façon app de scores : statut, deux équipes (celle qui reçoit en premier), scores. */
export function LigneMatch({ match, maintenant, onPress, afficherCompetition = false, afficherDate = false }: Props) {
  const t = useThemeClub();
  const { dom, ext, sDom, sExt, joue } = campsDuMatch(match);
  const attente = !joue && scoreEnAttente(match, maintenant);
  const statut = joue ? 'Fin' : match.date === null ? 'À fixer' : attente ? 'Attente' : heureDuMatch(match.date);
  const lu = joue ? libelleScoreLu(match) : `${libelleScoreLu(match)}, ${attente ? 'score pas encore publié' : statut}`;
  const domGagne = joue && sDom! > sExt!;
  const extGagne = joue && sExt! > sDom!;

  return (
    <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={lu} testID="ligne-match">
      <View style={[styles.ligne, { borderBottomColor: t.colors.outlineVariant }]}>
        <View style={styles.statut} testID="statut">
          {afficherDate && !joue && match.date ? (
            <Text variant="labelMedium" numberOfLines={1} style={{ color: t.colors.onSurfaceVariant }}>
              {dateCourte(match.date)}
            </Text>
          ) : null}
          <Text variant="labelMedium" numberOfLines={1} style={{ color: t.colors.onSurfaceVariant }}>
            {statut}
          </Text>
          {joue && match.date ? (
            <Text variant="labelSmall" numberOfLines={1} style={{ color: t.colors.onSurfaceVariant }}>
              {heureDuMatch(match.date)}
            </Text>
          ) : null}
        </View>
        <View style={styles.equipes}>
          {afficherCompetition ? (
            <Text variant="labelSmall" numberOfLines={1} style={{ color: t.colors.onSurfaceVariant }}>
              {match.journee ? `${match.equipe.detail} · J${match.journee}` : match.equipe.detail}
            </Text>
          ) : null}
          <Nom texte={dom} gras={domGagne} club={match.domicile} logo={match.logo_adversaire} />
          <Nom texte={ext} gras={extGagne} club={!match.domicile} logo={match.logo_adversaire} />
        </View>
        <View style={styles.scores}>
          <Text variant="titleMedium" testID="score-dom" style={[styles.chiffre, { color: t.colors.onSurface }, !domGagne && styles.leger]}>
            {joue ? sDom : '–'}
          </Text>
          <Text variant="titleMedium" testID="score-ext" style={[styles.chiffre, { color: t.colors.onSurface }, !extGagne && styles.leger]}>
            {joue ? sExt : '–'}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  );
}

function Nom({ texte, gras, club, logo }: { texte: string; gras: boolean; club: boolean; logo: string | null | undefined }) {
  const t = useThemeClub();
  return (
    <View style={styles.nom}>
      {club ? <EcussonClub taille={24} /> : <Ecusson uri={logo} nom={texte} taille={24} />}
      <Text
        variant="bodyLarge"
        numberOfLines={3}
        {...NOM_SANS_COUPURE}
        style={[styles.texteNom, { color: t.colors.onSurface }, gras && { fontFamily: POLICES.gras }]}
      >
        {lierNumero(permettreCesure(texte))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  statut: { minWidth: 56, alignItems: 'center' },
  equipes: { flex: 1, gap: 4 },
  nom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  texteNom: { flexShrink: 1 },
  scores: { gap: 4, minWidth: 32 },
  chiffre: { minWidth: 32, textAlign: 'right', fontVariant: ['tabular-nums'] },
  leger: { fontFamily: POLICES.normal },
});
