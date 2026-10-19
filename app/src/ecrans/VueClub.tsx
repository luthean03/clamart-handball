import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Surface, Text, TouchableRipple } from 'react-native-paper';
import { CIBLE } from '../composants/commun';
import { EcussonClub } from '../composants/Ecusson';
import { EnTeteSection } from '../composants/EnTeteSection';
import { ProtectionBarreEtat } from '../composants/ProtectionBarreEtat';
import { INFOS_CLUB } from '../club/infos';
import type { Salle } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

interface Props {
  onOuvrirExterne: (url: string) => void;
  onItineraire: (salle: Salle) => void;
}

interface LigneProps {
  icone: string;
  titre: string;
  detail: string;
  /** Sans appui : la ligne est une simple information (pas de chevron). */
  onPress?: () => void;
}

function Ligne({ icone, titre, detail, onPress }: LigneProps) {
  const t = useThemeClub();
  const contenu = (
    <View style={styles.ligne}>
      <Icon source={icone} size={24} color={t.club.titre} />
      <View style={styles.texte}>
        <Text variant="bodyLarge" style={{ color: t.colors.onSurface }}>{titre}</Text>
        <Text variant="bodySmall" style={{ color: t.colors.onSurfaceVariant }}>{detail}</Text>
      </View>
      {onPress ? <Icon source="chevron-right" size={24} color={t.colors.onSurfaceVariant} /> : null}
    </View>
  );
  if (!onPress) return <View accessible accessibilityLabel={`${titre}, ${detail}`}>{contenu}</View>;
  return (
    <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={`${titre}, ${detail}`} style={styles.cible}>
      {contenu}
    </TouchableRipple>
  );
}

function Carte({ children }: { children: React.ReactNode }) {
  const t = useThemeClub();
  return (
    <Surface style={{ borderRadius: t.rayonCarte }} elevation={1}>
      <View style={[styles.liste, { borderRadius: t.rayonCarte }]}>{children}</View>
    </Surface>
  );
}

export function VueClub({ onOuvrirExterne, onItineraire }: Props) {
  const t = useThemeClub();
  const { instagram, facebook, site, gymnase } = INFOS_CLUB;
  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <ProtectionBarreEtat />
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.identite}>
          <EcussonClub taille={84} />
          <Text variant="headlineSmall" accessibilityRole="header" style={{ color: t.club.titre }}>{INFOS_CLUB.nom}</Text>
          <Text variant="bodyMedium" style={[styles.devise, { color: t.colors.onSurfaceVariant }]}>{INFOS_CLUB.devise}</Text>
        </View>

        <EnTeteSection titre="Nous suivre" />
        <Carte>
          <Ligne icone="instagram" titre="Instagram" detail={instagram.nom} onPress={() => onOuvrirExterne(instagram.url)} />
          <Ligne icone="facebook" titre="Facebook" detail={facebook.nom} onPress={() => onOuvrirExterne(facebook.url)} />
          <Ligne icone="web" titre="Site du club" detail={site.nom} onPress={() => onOuvrirExterne(site.url)} />
        </Carte>

        <EnTeteSection titre="Nous trouver" />
        <Carte>
          <Ligne icone="map-marker" titre={gymnase.nom} detail={gymnase.adresse} onPress={() => onItineraire(gymnase)} />
          <Ligne icone="home-city-outline" titre="Adresse du club" detail={INFOS_CLUB.adresse} />
        </Carte>

        <EnTeteSection titre="Nous écrire" />
        <Carte>
          <Ligne icone="email-outline" titre="Formulaire de contact" detail="sur le site du club" onPress={() => onOuvrirExterne(INFOS_CLUB.contact)} />
          <Ligne icone="clock-outline" titre="Horaires d’entraînement" detail="par catégorie, sur le site du club" onPress={() => onOuvrirExterne(INFOS_CLUB.horaires)} />
        </Carte>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  identite: { alignItems: 'center', gap: 4, paddingTop: 16, paddingBottom: 4 },
  devise: { textAlign: 'center' },
  liste: { overflow: 'hidden' },
  cible: { minHeight: CIBLE },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: CIBLE },
  texte: { flex: 1 },
});
