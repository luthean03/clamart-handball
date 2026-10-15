import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { CONTENU_BOUTON } from '../composants/commun';
import { ecouterOuverture, ecouterPremierPlan, notificationInitiale, type NotifRecue } from './fcm';
import { lienNotification } from './liens';

/** Notifications reçues : bandeau « Voir » au premier plan, fiche du match quand on touche la notification. */
export function GestionNotifications() {
  const routeur = useRouter();
  const [affichee, setAffichee] = useState<NotifRecue | null>(null);

  useEffect(() => {
    const ouvrir = (n: NotifRecue) => {
      const lien = lienNotification(n.donnees);
      if (lien) routeur.push(lien as never);
    };
    notificationInitiale().then((n) => n && ouvrir(n)).catch(() => {});
    const arreterOuverture = ecouterOuverture(ouvrir);
    const arreterPremierPlan = ecouterPremierPlan(setAffichee);
    return () => { arreterOuverture(); arreterPremierPlan(); };
  }, [routeur]);

  const lien = affichee ? lienNotification(affichee.donnees) : undefined;
  return (
    <Portal>
      <Snackbar
        visible={affichee !== null}
        onDismiss={() => setAffichee(null)}
        duration={6000}
        action={lien ? { label: 'Voir', contentStyle: CONTENU_BOUTON, onPress: () => routeur.push(lien as never) } : undefined}
      >
        {affichee?.titre ?? affichee?.corps ?? ''}
      </Snackbar>
    </Portal>
  );
}
