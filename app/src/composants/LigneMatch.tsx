import { Image, StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { heureDuMatch } from '../donnees/dates';
import { nomLisible } from '../donnees/phrase';
import { scoreEnAttente } from '../donnees/selecteurs';
import type { MatchAvecEquipe } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';
import { LIBELLES } from './PastilleResultat';

const LOGO = require('../../assets/logo-clamart.png');

interface Props {
  match: MatchAvecEquipe;
  maintenant: Date;
  onPress: () => void;
  afficherCompetition?: boolean;
}

/** Une ligne façon app de scores : statut, deux équipes (celle qui reçoit en premier), scores. */
export function LigneMatch({ match, maintenant, onPress, afficherCompetition = false }: Props) {
  const t = useThemeClub();
  const nous = `Clamart ${match.equipe.nom}`;
  const eux = nomLisible(match.adversaire);
  const [dom, ext] = match.domicile ? [nous, eux] : [eux, nous];
  const [sDom, sExt] = match.domicile ? [match.score_nous, match.score_eux] : [match.score_eux, match.score_nous];
  const joue = match.resultat !== null && sDom !== null && sExt !== null;
  const attente = !joue && scoreEnAttente(match, maintenant);
  const statut = joue ? 'Fin' : match.date === null ? 'À fixer' : attente ? 'Attente' : heureDuMatch(match.date);
  const lu = joue
    ? `${dom} ${sDom}, ${ext} ${sExt}, ${LIBELLES[match.resultat!]}`
    : `${dom} contre ${ext}, ${attente ? 'score pas encore publié' : statut}`;
  const domGagne = joue && sDom! > sExt!;
  const extGagne = joue && sExt! > sDom!;

  return (
    <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={lu} testID="ligne-match">
      <View style={[styles.ligne, { borderBottomColor: t.colors.outlineVariant }]}>
        <View style={styles.statut}>
          <Text variant="labelMedium" style={{ color: t.colors.onSurfaceVariant }}>
            {statut}
          </Text>
          {joue && match.date ? (
            <Text variant="labelSmall" style={{ color: t.colors.onSurfaceVariant }}>
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
          <Nom texte={dom} gras={domGagne} club={match.domicile} />
          <Nom texte={ext} gras={extGagne} club={!match.domicile} />
        </View>
        <View style={styles.scores}>
          <Text variant="titleMedium" style={[styles.chiffre, { color: t.colors.onSurface }, !domGagne && styles.leger]}>
            {joue ? sDom : '–'}
          </Text>
          <Text variant="titleMedium" style={[styles.chiffre, { color: t.colors.onSurface }, !extGagne && styles.leger]}>
            {joue ? sExt : '–'}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  );
}

function Nom({ texte, gras, club }: { texte: string; gras: boolean; club: boolean }) {
  const t = useThemeClub();
  return (
    <View style={styles.nom}>
      {club ? (
        <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.logo, { backgroundColor: t.colors.outlineVariant }]} />
      )}
      <Text
        variant="bodyLarge"
        numberOfLines={2}
        style={[styles.texteNom, { color: t.colors.onSurface }, gras && { fontFamily: POLICES.gras }]}
      >
        {texte}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  statut: { width: 56, alignItems: 'center' },
  equipes: { flex: 1, gap: 4 },
  nom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 18, height: 18, borderRadius: 9 },
  texteNom: { flexShrink: 1 },
  scores: { alignItems: 'flex-end', gap: 4, minWidth: 32 },
  chiffre: { fontVariant: ['tabular-nums'] },
  leger: { fontFamily: POLICES.normal },
});
