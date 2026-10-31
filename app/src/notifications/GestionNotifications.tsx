import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Snackbar, Text } from 'react-native-paper';
import { CONTENU_BOUTON, DECALAGE_BANDEAU } from '../composants/commun';
import { EcussonClub } from '../composants/Ecusson';
import { CLE_CLUB } from '../donnees/requetes';
import { POLICES, useThemeClub } from '../theme/theme';
import { ecouterOuverture, ecouterPremierPlan, notificationInitiale, type NotifRecue } from './fcm';
import { lienNotification } from './liens';

/** Notifications reçues : bandeau « Voir » au premier plan (logo du club, titre en gras, une ligne de texte),
 *  fiche du match quand on touche la notification. */
export function GestionNotifications() {
  const routeur = useRouter();
  const t = useThemeClub();
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

  // Composant global : le bandeau ne monte au-dessus de la barre d'onglets que si elle est à l'écran.
  const surOnglets = useSegments()[0] === '(tabs)';
  const lien = affichee ? lienNotification(affichee.donnees) : undefined;
  // Une ligne chacun : une notification groupée (plusieurs lignes de détail) ne couvre pas l'écran ; « Voir » ouvre le détail.
  const couleur = { color: t.colors.inverseOnSurface };
  return (
    <Portal>
      <Snackbar
        visible={affichee !== null}
        onDismiss={() => setAffichee(null)}
        duration={6000}
        wrapperStyle={surOnglets ? DECALAGE_BANDEAU : undefined}
        action={lien ? { label: 'Voir', contentStyle: CONTENU_BOUTON, onPress: () => routeur.push(lien as never) } : undefined}
      >
        {affichee ? (
          <View style={styles.ligne}>
            <EcussonClub taille={32} />
            <View style={styles.textes}>
              {affichee.titre ? <Text numberOfLines={1} style={[couleur, { fontFamily: POLICES.gras }]}>{affichee.titre}</Text> : null}
              {affichee.corps ? <Text numberOfLines={1} style={couleur}>{affichee.corps}</Text> : null}
            </View>
          </View>
        ) : null}
      </Snackbar>
    </Portal>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textes: { flex: 1, minWidth: 0 },
});
