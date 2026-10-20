import { useState, type ReactNode } from 'react';
import { Image, View } from 'react-native';
import { useThemeClub } from '../theme/theme';
import { Monogramme } from './Monogramme';

const LOGO_ROND = require('../../assets/logo-rond.png');

/** Mode sombre : l'écusson est posé sur un disque clair (la pastille du thème), pour que ses blancs ne se fondent pas dans le fond.
 *  `rendre` reçoit la taille de l'image : `taille` en clair, `taille - 4` (anneau de 2 px) sur la pastille. */
function SurPastille({ taille, rendre }: { taille: number; rendre: (taille: number) => ReactNode }) {
  const pastille = useThemeClub().club.pastille;
  if (!pastille) return <>{rendre(taille)}</>;
  return (
    <View
      testID="pastille"
      style={{
        width: taille,
        height: taille,
        borderRadius: taille / 2,
        backgroundColor: pastille,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {rendre(taille - 4)}
    </View>
  );
}

/** Écusson d'un adversaire : l'image publiée par la FFHB, ou ses initiales sans image ou si elle ne charge pas
 *  (on retient l'URL en échec : une autre URL pour la même ligne est essayée).
 *  Décoratif : le nom de l'équipe est toujours lu par la ligne ou le bloc qui l'entoure. */
export function Ecusson({ uri, nom, taille }: { uri: string | null | undefined; nom: string; taille: number }) {
  const [echec, setEchec] = useState<string | null>(null);
  if (!uri || echec === uri) return <Monogramme nom={nom} taille={taille} />;
  return (
    <SurPastille
      taille={taille}
      rendre={(t) => (
        <Image
          testID="ecusson-image"
          source={{ uri }}
          resizeMode="contain"
          onError={() => setEchec(uri)}
          style={{ width: t, height: t, borderRadius: t / 2 }}
          accessibilityIgnoresInvertColors
        />
      )}
    />
  );
}

/** Logo du club, rond (assets/logo-rond.png, tiré de l'écusson officiel). `libelle` : seulement quand rien autour ne le dit déjà. */
export function EcussonClub({ taille, libelle }: { taille: number; libelle?: string }) {
  return (
    <SurPastille
      taille={taille}
      rendre={(t) => (
        <Image
          testID="ecusson-club"
          source={LOGO_ROND}
          style={{ width: t, height: t, borderRadius: t / 2 }}
          accessible={libelle !== undefined}
          accessibilityLabel={libelle}
          accessibilityIgnoresInvertColors
        />
      )}
    />
  );
}
