import { screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

/** Le bandeau porte son décalage sur le conteneur absolu de Paper : on remonte jusqu'au premier ancêtre qui a un `bottom`. */
export function basDuBandeau(texte: string | RegExp): number | undefined {
  for (let n = screen.getByText(texte).parent; n; n = n.parent) {
    const bottom = (StyleSheet.flatten(n.props.style) as ViewStyle | undefined)?.bottom;
    if (typeof bottom === 'number') return bottom;
  }
  return undefined;
}
