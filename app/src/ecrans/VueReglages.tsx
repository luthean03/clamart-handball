import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Icon, IconButton, List, RadioButton, Surface, Switch, Text, TouchableRipple } from 'react-native-paper';
import { CONTENU_BOUTON } from '../composants/commun';
import { libelleMiseAJour } from '../donnees/dates';
import type { Club } from '../donnees/types';
import type { Autorisation } from '../notifications/sujets';
import type { Apparence } from '../suivi/suivi';
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
  notifResultats: boolean;
  rappels: boolean;
  autorisation: Autorisation;
  onNotifResultats: (b: boolean) => void;
  onRappels: (b: boolean) => void;
  onOuvrirReglagesSysteme: () => void;
  onDemanderAutorisation: () => void;
  apparence: Apparence;
  onApparence: (a: Apparence) => void;
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

const HAUTEUR_CHOIX = 56;

const CHOIX_APPARENCE: { value: Apparence; titre: string; sousTitre?: string; icone: string; libelle: string }[] = [
  { value: 'auto', titre: 'Appareil', sousTitre: 'Comme le réglage du téléphone', icone: 'cellphone', libelle: 'Appareil, comme le réglage du téléphone' },
  { value: 'clair', titre: 'Clair', icone: 'white-balance-sunny', libelle: 'Clair' },
  { value: 'sombre', titre: 'Sombre', icone: 'weather-night', libelle: 'Sombre' },
];

export function VueReglages(p: Props) {
  const t = useThemeClub();
  const miens = p.club.collectifs.filter((c) => p.suivis.includes(c.id));
  const n = p.retires.length;
  return (
    <View testID="page-reglages" style={[styles.page, { backgroundColor: t.colors.background }]}>
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

        <List.Subheader style={{ color: t.club.titre }}>Apparence</List.Subheader>
        <Bloc>
          <RadioButton.Group value={p.apparence} onValueChange={(v) => p.onApparence(v as Apparence)}>
            {CHOIX_APPARENCE.map((c, i) => {
              const coche = p.apparence === c.value;
              return (
                <TouchableRipple
                  key={c.value}
                  onPress={() => p.onApparence(c.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: coche }}
                  accessibilityLabel={c.libelle}
                  style={[
                    styles.choix,
                    i > 0 && { borderTopColor: t.colors.outlineVariant, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={styles.choixContenu}>
                    <Icon source={c.icone} size={24} color={coche ? t.club.action : t.colors.onSurfaceVariant} />
                    <View style={styles.choixTexte}>
                      <Text variant="bodyLarge" style={{ color: t.colors.onSurface }}>{c.titre}</Text>
                      {c.sousTitre ? (
                        <Text variant="bodySmall" style={{ color: t.colors.onSurfaceVariant }}>{c.sousTitre}</Text>
                      ) : null}
                    </View>
                    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                      <RadioButton value={c.value} status={coche ? 'checked' : 'unchecked'} color={t.club.action} />
                    </View>
                  </View>
                </TouchableRipple>
              );
            })}
          </RadioButton.Group>
        </Bloc>

        <List.Subheader style={{ color: t.club.titre }}>Notifications</List.Subheader>
        <Bloc>
          {p.autorisation === 'refusee' ? (
            <View style={styles.bloque}>
              <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
                Les notifications sont bloquées dans les réglages d’Android.
              </Text>
              <Button mode="text" contentStyle={CONTENU_BOUTON} onPress={p.onOuvrirReglagesSysteme}>Ouvrir les réglages</Button>
            </View>
          ) : null}
          {p.autorisation === 'inconnue' ? (
            <View style={styles.bloque}>
              <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
                Autorisez les notifications pour recevoir les résultats de vos équipes.
              </Text>
              <Button mode="text" contentStyle={CONTENU_BOUTON} onPress={p.onDemanderAutorisation}>Activer les notifications</Button>
            </View>
          ) : null}
          <List.Item
            title="Résultats de mes équipes"
            description="Dès que le score est publié"
            onPress={() => p.onNotifResultats(!p.notifResultats)}
            right={() => (
              <Switch value={p.notifResultats} onValueChange={p.onNotifResultats} accessibilityLabel="Résultats de mes équipes" />
            )}
          />
          <List.Item
            title="Rappel la veille du match"
            description="Désactivé par défaut"
            onPress={() => p.onRappels(!p.rappels)}
            right={() => <Switch value={p.rappels} onValueChange={p.onRappels} accessibilityLabel="Rappel la veille du match" />}
          />
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
  bloque: { padding: 16, gap: 4 },
  gerer: { alignSelf: 'flex-start', margin: 8 },
  choix: { minHeight: HAUTEUR_CHOIX, justifyContent: 'center' },
  choixContenu: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 8 },
  choixTexte: { flex: 1 },
});
