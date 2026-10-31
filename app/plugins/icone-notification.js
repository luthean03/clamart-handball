// Petite icône des notifications Android (barre d'état ; pastille jusqu'à Android 15, qui y met l'icône de l'app
// à partir d'Android 16). Android n'affiche que la silhouette d'une icône : sans elle, l'écusson rouge devient un
// carré blanc. Ici l'écusson complet d'une seule couleur (assets/notification/<densité>.png, blanc sur transparent,
// généré par collecteur/icones_app.py). Couleur transparente (#00000000, « pas de couleur » pour Android) :
// pas de rond rouge derrière l'écusson dans la pastille.
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidColors, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const DENSITES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const ICONE = 'com.google.firebase.messaging.default_notification_icon';
const COULEUR = 'com.google.firebase.messaging.default_notification_color';

const copierIcones = (config, dossierSource) =>
  withDangerousMod(config, ['android', async (c) => {
    const res = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    for (const densite of DENSITES) {
      const dossier = path.join(res, `drawable-${densite}`);
      fs.mkdirSync(dossier, { recursive: true });
      fs.copyFileSync(path.join(c.modRequest.projectRoot, dossierSource, `${densite}.png`),
        path.join(dossier, 'notification_icon.png'));
    }
    return c;
  }]);

function metaDonnee(application, nom, ressource, remplacer) {
  application['meta-data'] = (application['meta-data'] ?? []).filter((m) => m.$['android:name'] !== nom);
  application['meta-data'].push({
    $: { 'android:name': nom, 'android:resource': ressource, ...(remplacer ? { 'tools:replace': 'android:resource' } : {}) },
  });
}

module.exports = function iconeNotification(config, { dossier, couleur }) {
  config = copierIcones(config, dossier);
  config = withAndroidColors(config, (c) => {
    c.modResults = AndroidConfig.Colors.assignColorValue(c.modResults, { name: 'notification_icon_color', value: couleur });
    return c;
  });
  return withAndroidManifest(config, (c) => {
    c.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    metaDonnee(application, ICONE, '@drawable/notification_icon', false);
    metaDonnee(application, COULEUR, '@color/notification_icon_color', true);
    return c;
  });
};
