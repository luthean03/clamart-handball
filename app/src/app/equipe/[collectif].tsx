import { useLocalSearchParams, useRouter } from 'expo-router';
import { copier, urlAgenda } from '../../actions/actions';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { URL_AGENDAS } from '../../config';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueEquipe } from '../../ecrans/VueEquipe';
import { parametre } from '../../notifications/liens';
import { useSuivi } from '../../suivi/suivi';

export default function Equipe() {
  const p = useLocalSearchParams<{ collectif: string | string[] }>();
  const collectif = parametre(p.collectif) ?? '';
  const { club, chargement, erreur, rafraichir } = useClub();
  const maintenant = useMaintenant();
  const suivi = useSuivi((s) => s.suivis.includes(collectif));
  const basculer = useSuivi((s) => s.basculer);
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueEquipe
      club={club}
      collectifId={collectif}
      maintenant={maintenant}
      suivi={suivi}
      onBasculer={() => basculer(collectif)}
      onOuvrirMatch={(id) => routeur.push(`/match/${id}`)}
      onRetour={() => (routeur.canGoBack() ? routeur.back() : routeur.replace('/'))}
      onCopierAgenda={(e) => copier(urlAgenda(URL_AGENDAS, e.id))}
    />
  );
}
