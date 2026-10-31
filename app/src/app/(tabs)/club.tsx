import { useState } from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { ouvrirExterne, ouvrirItineraire } from '../../actions/actions';
import { DECALAGE_BANDEAU } from '../../composants/commun';
import { useOngletAffiche } from '../../composants/useOngletAffiche';
import { VueClub } from '../../ecrans/VueClub';

/** Les infos du club ne viennent pas de club.json : l'onglet marche aussi sans données ni réseau. */
export default function ClubOnglet() {
  const [echec, setEchec] = useState<string | null>(null);
  // Hors de l'onglet affiché, rien n'est rendu : au retour, la page repart en haut.
  const affiche = useOngletAffiche();
  if (!affiche) return null;
  // Un refus (pas d'application pour ce lien, pas de carte) ne doit jamais rester silencieux.
  const tenter = (action: () => Promise<unknown>, message: string) => action().catch(() => setEchec(message));
  return (
    <>
      <VueClub
        onOuvrirExterne={(url) => tenter(() => ouvrirExterne(url), "Impossible d'ouvrir le lien")}
        onItineraire={(salle) => tenter(() => ouvrirItineraire(salle), "Impossible d'ouvrir l'itinéraire")}
      />
      <Portal>
        <Snackbar visible={echec !== null} onDismiss={() => setEchec(null)} duration={4000} wrapperStyle={DECALAGE_BANDEAU}>
          {echec}
        </Snackbar>
      </Portal>
    </>
  );
}
