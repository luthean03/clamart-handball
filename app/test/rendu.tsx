import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { themeClair, type ThemeClub } from '../src/theme/theme';

export function rendu(ui: ReactElement, theme: ThemeClub = themeClair) {
  return render(
    <SafeAreaProvider>
      <PaperProvider theme={theme}>{ui}</PaperProvider>
    </SafeAreaProvider>,
  );
}
