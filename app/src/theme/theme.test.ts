import { contraste } from './contraste';
import { clair, sombre, type Palette } from './couleurs';
import { themeClair, themeSombre } from './theme';

function paires(p: Palette): [string, string, string, number][] {
  return [
    ['texte / fond', p.texte, p.fond, 4.5],
    ['texte / carte', p.texte, p.carte, 4.5],
    ['texte doux / carte', p.texteDoux, p.carte, 4.5],
    ['texte doux / fond', p.texteDoux, p.fond, 4.5],
    ['texte doux / surligné', p.texteDoux, p.surligne, 4.5],
    ['titre / carte', p.titre, p.carte, 4.5],
    ['titre / fond', p.titre, p.fond, 4.5],
    ['texte sur action', p.surAction, p.action, 4.5],
    ['action / carte', p.action, p.carte, 3],
    ['action / fond', p.action, p.fond, 3],
    ['indicateur d’onglet', p.surIndicateur, p.indicateur, 4.5],
    ['victoire', p.victoire.texte, p.victoire.fond, 4.5],
    ['nul', p.nul.texte, p.nul.fond, 4.5],
    ['défaite', p.defaite.texte, p.defaite.fond, 4.5],
    ['victoire sur carte', p.victoire.texte, p.carte, 4.5],
  ];
}

describe.each([['clair', clair], ['sombre', sombre]] as const)('palette %s', (_nom, palette) => {
  test.each(paires(palette))('%s ≥ %#', (_libelle, a, b, minimum) => {
    expect(contraste(a, b)).toBeGreaterThanOrEqual(minimum);
  });
});

test('contraste de référence', () => {
  expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
});

test('les rôles Material pointent vers la palette', () => {
  expect(themeClair.colors.primary).toBe(clair.action);
  expect(themeClair.colors.background).toBe(clair.fond);
  expect(themeSombre.dark).toBe(true);
  expect(themeSombre.colors.surface).toBe(sombre.carte);
  expect(themeClair.rayonCarte).toBe(20);
});
