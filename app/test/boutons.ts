import type { ReactTestInstance } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

/**
 * `contentStyle` aplati du bouton Paper qui contient l'élément : c'est lui qui donne la hauteur réelle de la zone
 * tactile (le `style` ne s'applique qu'à la Surface extérieure).
 */
export function contenuDuBouton(element: ReactTestInstance) {
  for (let n: ReactTestInstance | null = element; n; n = n.parent) {
    if (n.type === Button) return StyleSheet.flatten(n.props.contentStyle) ?? {};
  }
  throw new Error("L'élément n'est pas dans un bouton Paper");
}
