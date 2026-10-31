import '@testing-library/react-native/matchers';

// Node 26 affiche un avertissement à chaque accès à globalThis.localStorage ; zustand (persist, storage par défaut)
// y accède. Le stockage réel est fourni par AsyncStorage (mocké ci-dessous), donc on masque la propriété.
Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true });

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => {
  const routeur = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
  const Vide = () => null;
  return {
    __routeur: routeur,
    useRouter: () => routeur,
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    useRoute: jest.fn(() => ({ key: 'onglet' })),
    useNavigation: jest.fn(() => ({ setParams: jest.fn() })),
    Redirect: Vide,
    ThemeProvider: ({ children }: { children: unknown }) => children,
    DarkTheme: { dark: true, colors: {}, fonts: {} },
    DefaultTheme: { dark: false, colors: {}, fonts: {} },
    Stack: Object.assign(Vide, { Screen: Vide }),
    Tabs: Object.assign(Vide, { Screen: Vide }),
  };
});
// Onglets (useOngletAffiche) : un seul onglet, toujours affiché.
jest.mock('expo-router/react-navigation', () => ({
  ...jest.requireActual('expo-router/react-navigation'),
  useNavigationState: jest.fn((choisir: (etat: unknown) => unknown) => choisir({ index: 0, routes: [{ key: 'onglet' }] })),
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })) }));
// Les icônes de Paper chargent leur police en asynchrone (mise à jour d'état hors act) : en test, un glyphe synchrone suffit.
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ name }: { name: string }) => createElement(Text, null, name) };
});
jest.mock('../src/notifications/fcm', () => ({
  clientFcm: { abonner: jest.fn(() => Promise.resolve()), desabonner: jest.fn(() => Promise.resolve()) },
  demanderAutorisation: jest.fn(() => Promise.resolve('accordee')),
  lireAutorisation: jest.fn(() => Promise.resolve('accordee')),
  ecouterPremierPlan: jest.fn(() => () => {}),
  ecouterOuverture: jest.fn(() => () => {}),
  notificationInitiale: jest.fn(() => Promise.resolve(null)),
}));
