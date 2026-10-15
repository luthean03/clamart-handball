import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, IconButton, List, Surface, Text } from 'react-native-paper';
import { CONTENU_BOUTON } from '../composants/commun';
import { libelleMiseAJour } from '../donnees/dates';
import type { Club } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  maintenant: Date;
  suivis: string[];
  retires: string[];
  version: string;
  onRetirer: (id: string) => void;
  onGererEquipes: () => void;
  onEffacerRetires: () => void;
  onOuvrirLien: (url: string) => void;
  onRetour: () => void;
}

/** Bloc arrondi : l'ombre reste sur la Surface, le rognage des coins sur la View intérieure (sinon Android coupe l'ombre). */
function Bloc({ children }: { children: ReactNode }) {
  const t = useThemeClub();
  return (
    <Surface style={{ borderRadius: t.rayonCarte }} elevation={1}>
      <View style={[styles.bloc, { borderRadius: t.rayonCarte }]}>{children}</View>
    </Surface>
  );
}

export function VueReglages(p: Props) {
  const t = useThemeClub();
  const miens = p.club.collectifs.filter((c) => p.suivis.includes(c.id));
  const n = p.retires.length;
  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.BackAction onPress={p.onRetour} accessibilityLabel="Retour" style={styles.action} />
        <Appbar.Content title="Réglages" titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.contenu}>
        {n > 0 ? (
          <Surface style={[styles.message, { borderRadius: t.rayonCarte, backgroundColor: t.colors.surfaceVariant }]} elevation={0}>
            <Text variant="bodyMedium" style={[styles.texteMessage, { color: t.colors.onSurfaceVariant }]}>
              {n === 1
                ? '1 équipe suivie ne figure plus dans les résultats de la saison et a été retirée.'
                : `${n} équipes suivies ne figurent plus dans les résultats de la saison et ont été retirées.`}
            </Text>
            <Button mode="text" contentStyle={CONTENU_BOUTON} onPress={p.onEffacerRetires}>OK</Button>
          </Surface>
        ) : null}

        <List.Subheader style={{ color: t.club.titre }}>Mes équipes</List.Subheader>
        <Bloc>
          {miens.length === 0 ? <List.Item title="Aucune équipe suivie" /> : null}
          {miens.map((c) => (
            <List.Item
              key={c.id}
              title={c.nom}
              right={() => (
                <IconButton icon="close" accessibilityLabel={`Ne plus suivre ${c.nom}`} style={styles.action} onPress={() => p.onRetirer(c.id)} />
              )}
            />
          ))}
          <Button mode="text" contentStyle={CONTENU_BOUTON} style={styles.gerer} onPress={p.onGererEquipes}>Gérer mes équipes</Button>
        </Bloc>

        <List.Subheader style={{ color: t.club.titre }}>Données</List.Subheader>
        <Bloc>
          <List.Item
            title="Résultats issus de ffhandball.fr"
            description="Fédération française de handball"
            left={(props) => <List.Icon {...props} icon="open-in-new" />}
            onPress={() => p.onOuvrirLien('https://www.ffhandball.fr')}
          />
          <List.Item
            title="Dernière mise à jour"
            description={libelleMiseAJour(p.club.mis_a_jour, p.maintenant)}
            left={(props) => <List.Icon {...props} icon="update" />}
          />
        </Bloc>

        <List.Subheader style={{ color: t.club.titre }}>À propos</List.Subheader>
        <Bloc>
          <List.Item title="Clamart Handball" description={`Version ${p.version}`} left={(props) => <List.Icon {...props} icon="information-outline" />} />
        </Bloc>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  bloc: { overflow: 'hidden' },
  message: { flexDirection: 'row', alignItems: 'center', padding: 12, marginTop: 8 },
  texteMessage: { flex: 1 },
  action: { width: 48, height: 48, margin: 0, borderRadius: 24 },
  gerer: { alignSelf: 'flex-start', margin: 8 },
});
