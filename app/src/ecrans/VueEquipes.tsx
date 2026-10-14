import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, IconButton, List, Surface } from 'react-native-paper';
import { EnTeteSection } from '../composants/EnTeteSection';
import { ordinal } from '../donnees/phrase';
import { collectifsParCategorie, equipePrincipale, equipesDuCollectif } from '../donnees/selecteurs';
import type { Club } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  suivis: string[];
  onBasculer: (id: string) => void;
  onOuvrirEquipe: (id: string) => void;
}

export function VueEquipes({ club, suivis, onBasculer, onOuvrirEquipe }: Props) {
  const t = useThemeClub();
  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.Content title="Équipes" titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.contenu}>
        {collectifsParCategorie(club).map((g) => (
          <View key={g.categorie}>
            <EnTeteSection titre={g.titre} />
            <Surface style={{ borderRadius: t.rayonCarte }} elevation={1}>
              <View style={[styles.liste, { borderRadius: t.rayonCarte }]}>
                {g.collectifs.map((c) => {
                  const suivi = suivis.includes(c.id);
                  const principale = equipePrincipale(club, c.id);
                  const details = [...new Set(equipesDuCollectif(club, c.id).map((e) => e.detail))].join(' · ');
                  const place = principale?.place ? `\n${ordinal(principale.place)} sur ${principale.nb_equipes}` : '';
                  return (
                    <List.Item
                      key={c.id}
                      title={c.nom}
                      titleStyle={{ fontFamily: POLICES.gras, color: t.club.titre }}
                      description={`${details}${place}`}
                      descriptionNumberOfLines={3}
                      onPress={() => onOuvrirEquipe(c.id)}
                      right={() => (
                        <IconButton
                          icon={suivi ? 'bell' : 'bell-outline'}
                          iconColor={suivi ? t.colors.primary : t.colors.onSurfaceVariant}
                          accessibilityLabel={suivi ? `Ne plus suivre ${c.nom}` : `Suivre ${c.nom}`}
                          style={styles.cloche}
                          onPress={() => onBasculer(c.id)}
                        />
                      )}
                    />
                  );
                })}
              </View>
            </Surface>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  liste: { overflow: 'hidden' },
  cloche: { width: 48, height: 48, margin: 0, borderRadius: 24 },
});
