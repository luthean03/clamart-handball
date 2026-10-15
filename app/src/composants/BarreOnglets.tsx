import { CommonActions } from 'expo-router/react-navigation';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { BottomNavigation } from 'react-native-paper';

const PLAFOND_POLICE = 1.5;

/** Barre de navigation Material 3 de react-native-paper, branchée sur les onglets d'expo-router. */
export function BarreOnglets({ navigation, state, descriptors, insets }: BottomTabBarProps) {
  return (
    <BottomNavigation.Bar
      navigationState={state}
      // Paper fige les libellés à 1× par défaut : on suit la police de l'appareil, avec un plafond pour que quatre libellés tiennent.
      labelMaxFontSizeMultiplier={PLAFOND_POLICE}
      safeAreaInsets={insets}
      onTabPress={({ route, preventDefault }) => {
        const evenement = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (evenement.defaultPrevented) preventDefault();
        else navigation.dispatch({ ...CommonActions.navigate(route.name, route.params), target: state.key });
      }}
      renderIcon={({ route, focused, color }) =>
        descriptors[route.key].options.tabBarIcon?.({ focused, color, size: 24 }) ?? null
      }
      getLabelText={({ route }) => (descriptors[route.key].options.title as string | undefined) ?? route.name}
    />
  );
}
