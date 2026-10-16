import { useState } from 'react';
import { Image } from 'react-native';
import { Monogramme } from './Monogramme';

const LOGO_ROND = require('../../assets/logo-rond.png');

/** Écusson d'un adversaire : l'image publiée par la FFHB, ou ses initiales sans image ou si elle ne charge pas.
 *  Décoratif : le nom de l'équipe est toujours lu par la ligne ou le bloc qui l'entoure. */
export function Ecusson({ uri, nom, taille }: { uri: string | null | undefined; nom: string; taille: number }) {
  const [echec, setEchec] = useState(false);
  if (!uri || echec) return <Monogramme nom={nom} taille={taille} />;
  return (
    <Image
      testID="ecusson-image"
      source={{ uri }}
      onError={() => setEchec(true)}
      style={{ width: taille, height: taille, borderRadius: taille / 2 }}
      accessibilityIgnoresInvertColors
    />
  );
}

/** Logo du club, rond (assets/logo-rond.png, tiré de l'écusson officiel). `libelle` : seulement quand rien autour ne le dit déjà. */
export function EcussonClub({ taille, libelle }: { taille: number; libelle?: string }) {
  return (
    <Image
      testID="ecusson-club"
      source={LOGO_ROND}
      style={{ width: taille, height: taille, borderRadius: taille / 2 }}
      accessible={libelle !== undefined}
      accessibilityLabel={libelle}
      accessibilityIgnoresInvertColors
    />
  );
}
