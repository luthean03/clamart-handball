import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useOngletAffiche } from '../../composants/useOngletAffiche';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueMatchs, type Vue } from '../../ecrans/VueMatchs';
import { routeMatch } from '../../notifications/liens';
import { useSuivi } from '../../suivi/suivi';

export default function Matchs() {
  const { club, chargement, erreur, rafraichir, rafraichissement } = useClub();
  const maintenant = useMaintenant();
  const suivis = useSuivi((s) => s.suivis);
  const routeur = useRouter();
  const navigation = useNavigation();
  // « Voir tous les matchs » de l'accueil ouvre l'onglet sur « Tout le club » (?filtre=tous).
  const { filtre } = useLocalSearchParams<{ filtre?: string }>();
  // Hors de l'onglet affiché, rien n'est rendu : au retour, la vue repart de sa base (liste sur aujourd'hui,
  // calendrier sur le mois en cours, filtre par défaut). Seul choix gardé : liste ou calendrier.
  const affiche = useOngletAffiche();
  const [vue, setVue] = useState<Vue>('liste');

  // En quittant l'onglet, le « Tout le club » demandé par l'accueil ne vaut plus : le retour par la barre
  // d'onglets rouvre le filtre par défaut.
  useEffect(() => {
    if (!affiche && filtre) navigation.setParams({ filtre: undefined } as never);
  }, [affiche, filtre, navigation]);

  if (!affiche) return null;
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueMatchs
      club={club}
      maintenant={maintenant}
      suivis={suivis}
      filtreInitial={filtre === 'tous' ? 'tous' : undefined}
      vueInitiale={vue}
      onChangerVue={setVue}
      onOuvrirMatch={(id, equipe) => routeur.push(routeMatch(id, equipe) as never)}
      rafraichir={rafraichir}
      rafraichissement={rafraichissement}
    />
  );
}
