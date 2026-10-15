import { FlatList, StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { buteursClubAffichables } from '../donnees/selecteurs';
import type { Club } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

export function VueButeurs({ club }: { club: Club }) {
  const t = useThemeClub();
  const buteurs = buteursClubAffichables(club);
  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.Content title="Buteurs" titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      <FlatList
        data={buteurs}
        keyExtractor={(b) => b.joueur}
        contentContainerStyle={styles.contenu}
        ListHeaderComponent={
          buteurs.length ? (
            <Text variant="bodyMedium" style={[styles.note, { color: t.colors.onSurfaceVariant }]}>
              {`Seniors uniquement · ${buteurs.length === 1 ? '1 joueur ou joueuse' : `${buteurs.length} joueurs et joueuses`}`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <Text variant="bodyLarge" style={[styles.vide, { color: t.colors.onSurfaceVariant }]}>
            Pas encore de buteurs cette saison.
          </Text>
        }
        renderItem={({ item, index }) => (
          <View
            style={[styles.rangee, { backgroundColor: t.colors.surface, borderBottomColor: t.colors.outlineVariant }]}
            accessible
            accessibilityLabel={`${index + 1}, ${item.joueur}, ${item.buts} buts en ${item.matchs} matchs`}
          >
            <Text variant="labelLarge" style={[styles.rang, { color: t.colors.onSurfaceVariant }]}>{index + 1}</Text>
            <View style={styles.joueur}>
              <Text variant="bodyLarge" style={{ color: t.colors.onSurface }}>{item.joueur}</Text>
              <Text variant="bodySmall" style={{ color: t.colors.onSurfaceVariant }}>
                {`${item.equipes.join(', ')} · ${item.matchs} matchs · moy. ${item.moyenne} · record ${item.record}`}
              </Text>
            </View>
            <Text variant="titleLarge" style={[styles.buts, { color: t.club.titre }]}>{item.buts}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  note: { marginVertical: 12 },
  vide: { textAlign: 'center', paddingTop: 48 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rang: { width: 28, fontVariant: ['tabular-nums'] },
  joueur: { flex: 1 },
  buts: { fontVariant: ['tabular-nums'] },
});
