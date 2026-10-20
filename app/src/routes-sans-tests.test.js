const { readdirSync } = require('fs');
const { join } = require('path');

// expo-router traite chaque fichier de src/app comme un écran : un test placé là casse le build de l'app.
function fichiers(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? fichiers(join(dossier, e.name)) : [join(dossier, e.name)],
  );
}

test('aucun fichier de test dans src/app (les routes)', () => {
  expect(fichiers(join(__dirname, 'app')).filter((f) => /\.test\.[jt]sx?$/.test(f))).toEqual([]);
});
