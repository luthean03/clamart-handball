import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { CONTENU_BOUTON, useDecalageBandeau } from '../composants/commun';
import { CLE_CLUB } from '../donnees/requetes';
import { ecouterOuverture, ecouterPremierPlan, notificationInitiale, type NotifRecue } from './fcm';
import { lienNotification } from './liens';

/** Notifications reçues : bandeau « Voir » au premier plan, fiche du match quand on touche la notification. */
export function GestionNotifications() {
  const routeur = useRouter();
  const clientRequetes = useQueryClient();
  const [affichee, setAffichee] = useState<NotifRecue | null>(null);

  useEffect(() => {
    // Une notification annonce de nouvelles données : on rafraîchit le club à sa réception (premier plan ou ouverture).
    const rafraichir = () => { void clientRequetes.invalidateQueries({ queryKey: CLE_CLUB }); };
    const ouvrir = (n: NotifRecue) => {
      rafraichir();
      const lien = lienNotification(n.donnees);
      if (lien) routeur.push(lien as never);
    };
    notificationInitiale().then((n) => n && ouvrir(n)).catch(() => {});
    const arreterOuverture = ecouterOuverture(ouvrir);
    const arreterPremierPlan = ecouterPremierPlan((n) => { rafraichir(); setAffichee(n); });
    return () => { arreterOuverture(); arreterPremierPlan(); };
  }, [routeur, clientRequetes]);

  const decalage = useDecalageBandeau();
  const lien = affichee ? lienNotification(affichee.donnees) : undefined;
  return (
    <Portal>
      <Snackbar
        visible={affichee !== null}
        onDismiss={() => setAffichee(null)}
        duration={6000}
        wrapperStyle={decalage}
        action={lien ? { label: 'Voir', contentStyle: CONTENU_BOUTON, onPress: () => routeur.push(lien as never) } : undefined}
      >
        {affichee ? [affichee.titre, affichee.corps].filter(Boolean).join('\n') : ''}
      </Snackbar>
    </Portal>
  );
}
