import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { themeClair, type ThemeClub } from '../src/theme/theme';

/** `client` : à fournir pour espionner le cache (ex. invalidateQueries) ; sinon un client jetable sans nouvelle tentative. */
export function rendu(
  ui: ReactElement,
  theme: ThemeClub = themeClair,
  client: QueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return render(
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <PaperProvider theme={theme}>{ui}</PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}
