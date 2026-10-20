import { readdirSync } from 'fs';
import { join } from 'path';

// expo-router traite chaque fichier de src/app comme un écran : un test placé là casse le build de l'app.
function fichiers(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? fichiers(join(dossier, e.name)) : [join(dossier, e.name)],
  );
}

test('aucun fichier de test dans src/app (les routes)', () => {
  expect(fichiers(join(__dirname, 'app')).filter((f) => /\.test\.[jt]sx?$/.test(f))).toEqual([]);
});
