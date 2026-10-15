import { fireEvent, screen } from '@testing-library/react-native';
import { rendu } from '../../test/rendu';
import { VueAutorisation } from './VueAutorisation';

test('propose d’activer les notifications ou plus tard', () => {
  const onActiver = jest.fn();
  const onPlusTard = jest.fn();
  rendu(<VueAutorisation onActiver={onActiver} onPlusTard={onPlusTard} />);
  expect(screen.getByText('Recevoir les résultats de vos équipes ?')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Activer les notifications'));
  expect(onActiver).toHaveBeenCalled();
  fireEvent.press(screen.getByText('Plus tard'));
  expect(onPlusTard).toHaveBeenCalled();
});
