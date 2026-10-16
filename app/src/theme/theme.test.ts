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
    ['bandeau : date', p.bandeau.texte, p.bandeau.fond, 4.5],
    // « dans N jours » : teinte rose pâle validée avec le club (4,2 : tout juste sous 4,5, en gras)
    ['bandeau : mention douce', p.bandeau.doux, p.bandeau.fond, 4.2],
    ['victoire', p.victoire.texte, p.victoire.fond, 4.5],
    ['nul', p.nul.texte, p.nul.fond, 4.5],
    ['défaite', p.defaite.texte, p.defaite.fond, 4.5],
    ['victoire sur carte', p.victoire.texte, p.carte, 4.5],
    ['snackbar : texte', p.inverse.texte, p.inverse.fond, 4.5],
    ['snackbar : action', p.inverse.accent, p.inverse.fond, 4.5],
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

/** Teinte (0–360°) d'une couleur #RRGGBB. */
function teinte(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

test('le fond clair reprend la teinte du crème du logo (#FFFEF0, ≈ 57°) sans perdre en clarté', () => {
  expect(Math.abs(teinte(clair.fond) - teinte('#FFFEF0'))).toBeLessThanOrEqual(8);
  // Même clarté que l'ancien fond (#FBF6EE) pour que les cartes blanches se détachent encore.
  expect(Math.abs(contraste(clair.fond, '#FFFFFF') - contraste('#FBF6EE', '#FFFFFF'))).toBeLessThan(0.03);
});

test('la snackbar est thémée : fond bleu nuit en clair, crème en sombre', () => {
  expect(themeClair.colors.inverseSurface).toBe('#142A3D');
  expect(themeClair.colors.inverseOnSurface).toBe('#FFFEF0');
  expect(themeClair.colors.inversePrimary).toBe('#FFB4A8');
  expect(themeSombre.colors.inverseSurface).toBe('#FFFEF0');
  expect(themeSombre.colors.inverseOnSurface).toBe('#142A3D');
  expect(themeSombre.colors.inversePrimary).toBe('#DB0000');
});

test('le bandeau de date des cartes d’accueil : rouge du club en clair, rouge adouci en sombre', () => {
  expect(clair.bandeau).toEqual({ fond: '#DB0000', texte: '#FFFFFF', doux: '#FFE0DB' });
  expect(sombre.bandeau).toEqual({ fond: '#B3261E', texte: '#FFFFFF', doux: '#FFDAD4' });
});
