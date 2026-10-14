import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import type { Resultat } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

export const LIBELLES: Record<Resultat, string> = { V: 'victoire', N: 'match nul', D: 'défaite' };

export function PastilleResultat({ resultat }: { resultat: Resultat }) {
  const { club } = useThemeClub();
  const paire = resultat === 'V' ? club.victoire : resultat === 'N' ? club.nul : club.defaite;
  return (
    <View style={[styles.pastille, { backgroundColor: paire.fond }]}>
      <Text variant="labelMedium" style={{ color: paire.texte }}>
        {resultat}
      </Text>
    </View>
  );
}

export function Forme({ resultats }: { resultats: Resultat[] }) {
  if (!resultats.length) return null;
  return (
    <View style={styles.forme} accessible accessibilityLabel={`Forme : ${resultats.map((r) => LIBELLES[r]).join(', ')}`}>
      {resultats.map((r, i) => (
        <PastilleResultat key={i} resultat={r} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pastille: { minWidth: 24, minHeight: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  forme: { flexDirection: 'row', gap: 4 },
});
