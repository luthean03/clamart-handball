import { render } from '@testing-library/react-native';
import { club } from '../../test/donnees';
import { ajouterAgenda } from '../actions/actions';
import { matchParId } from '../donnees/selecteurs';
import Accueil from '../app/(tabs)/index';

let props: { onAgenda: (m: unknown) => void } | undefined;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../actions/actions', () => ({ ...jest.requireActual('../actions/actions'), ajouterAgenda: jest.fn() }));
jest.mock('../donnees/maintenant', () => ({ useMaintenant: () => new Date('2026-10-13T19:05:00+02:00') }));
jest.mock('../donnees/requetes', () => ({
  useClub: () => ({
    club: require('../../test/donnees').club, chargement: false, erreur: null, horsLigne: false, majRequise: false,
    rafraichir: jest.fn(), rafraichissement: false,
  }),
}));
jest.mock('./VueAccueil', () => ({
  VueAccueil: (p: typeof props) => {
    props = p;
    return null;
  },
}));

test('Accueil : l’ajout à l’agenda ne produit jamais de rejection non gérée (refus du téléphone)', () => {
  const catcher = jest.fn();
  jest.mocked(ajouterAgenda).mockReturnValue({ catch: catcher } as unknown as ReturnType<typeof ajouterAgenda>);
  render(<Accueil />);
  props!.onAgenda(matchParId(club, '2734038'));
  expect(ajouterAgenda).toHaveBeenCalledTimes(1);
  expect(catcher).toHaveBeenCalledTimes(1);
});

test('Accueil : transmet majRequise à la vue', () => {
  render(<Accueil />);
  expect(props).toHaveProperty('majRequise', false);
});
