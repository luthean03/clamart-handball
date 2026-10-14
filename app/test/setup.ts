import '@testing-library/react-native/matchers';

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
    Redirect: Vide,
    Stack: Object.assign(Vide, { Screen: Vide }),
    Tabs: Object.assign(Vide, { Screen: Vide }),
  };
});
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })) }));
jest.mock('expo-calendar', () => ({ createEventInCalendarAsync: jest.fn(() => Promise.resolve({ action: 'saved' })) }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
