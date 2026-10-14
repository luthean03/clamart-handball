import { fireEvent, screen } from '@testing-library/react-native';
import { club } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { VueBienvenue } from './VueBienvenue';

test('choisir ses équipes puis continuer', () => {
  const onTerminer = jest.fn();
  rendu(<VueBienvenue club={club} onTerminer={onTerminer} onPasser={jest.fn()} />);
  expect(screen.getByText('Bienvenue au Clamart Handball')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Seniors F 1'));
  fireEvent.press(screen.getByText('U13 M'));
  fireEvent.press(screen.getByText('Continuer (2)'));
  expect(onTerminer).toHaveBeenCalledWith(['seniors-f-1', 'u13-m']);
});

test('une deuxième pression retire l’équipe', () => {
  const onTerminer = jest.fn();
  rendu(<VueBienvenue club={club} onTerminer={onTerminer} onPasser={jest.fn()} />);
  fireEvent.press(screen.getByText('U18 F'));
  fireEvent.press(screen.getByText('U18 F'));
  fireEvent.press(screen.getByText('Continuer'));
  expect(onTerminer).toHaveBeenCalledWith([]);
});

test('passer', () => {
  const onPasser = jest.fn();
  rendu(<VueBienvenue club={club} onTerminer={jest.fn()} onPasser={onPasser} />);
  fireEvent.press(screen.getByText('Passer'));
  expect(onPasser).toHaveBeenCalled();
});
