// Sur EAS Build, google-services.json n'est pas dans le dépôt (il est ignoré par git) :
// il est fourni par la variable d'environnement fichier GOOGLE_SERVICES_JSON du projet Expo.
// En local, on garde le fichier ./google-services.json.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
});
