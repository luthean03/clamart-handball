import { useRouter } from 'expo-router';
import { EtatSansDonnees } from '../composants/EtatSansDonnees';
import { useClub } from '../donnees/requetes';
import { VueEquipes } from '../ecrans/VueEquipes';
import { useSuivi } from '../suivi/suivi';

/**
 * « Gérer mes équipes » (Réglages) et « Choisir mes équipes » (Accueil) : la liste des équipes ouverte comme écran de pile,
 * pour que le retour système ramène à l'écran d'origine (et non à l'onglet Équipes).
 */
export default function GererEquipes() {
  const { club, chargement, erreur, rafraichir } = useClub();
  const suivis = useSuivi((s) => s.suivis);
  const basculer = useSuivi((s) => s.basculer);
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueEquipes
      club={club}
      suivis={suivis}
      onBasculer={basculer}
      onOuvrirEquipe={(id) => routeur.push(`/equipe/${id}`)}
      onRetour={() => (routeur.canGoBack() ? routeur.back() : routeur.replace('/'))}
    />
  );
}
