const { readdirSync, readFileSync } = require('fs');
const { join } = require('path');

// Sur Android, un fontWeight explicite sur une police personnalisée la remplace par Roboto : le poids se choisit par
// la famille Nunito (POLICES). Seul theme.ts pose fontWeight: 'normal', qui ne change pas la police.
function fichiers(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? fichiers(join(dossier, e.name)) : [join(dossier, e.name)],
  );
}

test('aucun fontWeight explicite dans le code de l’app', () => {
  const fautifs = fichiers(__dirname)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .filter((f) => /fontWeight:\s*['"](?!normal['"])/.test(readFileSync(f, 'utf-8')));
  expect(fautifs).toEqual([]);
});
