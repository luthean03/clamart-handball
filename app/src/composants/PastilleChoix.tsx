import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import { useThemeClub } from '../theme/theme';

interface Props {
  libelle: string;
  choisie: boolean;
  onPress: () => void;
  /** `checkbox` pour un choix multiple, `radio` pour un choix unique. */
  role: 'checkbox' | 'radio';
}

/** Puce de choix : pastille de 32 dp au minimum, dans une cible tactile de 48 dp. L'état choisi est aussi marqué par une coche. */
export function PastilleChoix({ libelle, choisie, onPress, role }: Props) {
  const t = useThemeClub();
  const couleur = choisie ? t.colors.onSecondaryContainer : t.colors.onSurface;
  return (
    <TouchableRipple
      borderless
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ checked: choisie }}
      style={styles.cible}
    >
      <View
        style={[
          styles.pastille,
          { borderColor: choisie ? t.colors.secondaryContainer : t.colors.outline },
          choisie && { backgroundColor: t.colors.secondaryContainer },
        ]}
      >
        {choisie ? <Icon source="check" size={18} color={couleur} /> : null}
        <Text variant="labelLarge" style={{ color: couleur }}>
          {libelle}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  cible: { minHeight: 48, minWidth: 48, justifyContent: 'center', borderRadius: 24 },
  pastille: { minHeight: 32, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
});
