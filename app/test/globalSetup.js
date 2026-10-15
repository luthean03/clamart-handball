// Fuseau fixe : les tests de dates donnent le même résultat sur toutes les machines.
module.exports = async () => {
  process.env.TZ = 'Europe/Paris';
};
