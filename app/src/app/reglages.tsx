import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { ouvrirLien, sansRejet } from '../actions/actions';
import { EtatSansDonnees } from '../composants/EtatSansDonnees';
import { useMaintenant } from '../donnees/maintenant';
import { useClub } from '../donnees/requetes';
import { VueReglages } from '../ecrans/VueReglages';
import { useSuivi } from '../suivi/suivi';

export default function Reglages() {
  const { club, chargement, erreur, rafraichir } = useClub();
  const maintenant = useMaintenant();
  const suivis = useSuivi((s) => s.suivis);
  const retires = useSuivi((s) => s.retires);
  const notifResultats = useSuivi((s) => s.notifResultats);
  const rappels = useSuivi((s) => s.rappels);
  const autorisation = useSuivi((s) => s.autorisation);
  const { basculer, effacerRetires, setNotifResultats, setRappels } = useSuivi.getState();
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueReglages
      club={club}
      maintenant={maintenant}
      suivis={suivis}
      retires={retires}
      version={Constants.expoConfig?.version ?? ''}
      notifResultats={notifResultats}
      rappels={rappels}
      autorisation={autorisation}
      onNotifResultats={setNotifResultats}
      onRappels={setRappels}
      onOuvrirReglagesSysteme={() => sansRejet(() => Linking.openSettings())}
      onRetirer={basculer}
      onGererEquipes={() => routeur.push('/gerer-equipes')}
      onEffacerRetires={effacerRetires}
      onOuvrirLien={(url) => sansRejet(() => ouvrirLien(url))}
      onRetour={() => (routeur.canGoBack() ? routeur.back() : routeur.replace('/'))}
    />
  );
}
