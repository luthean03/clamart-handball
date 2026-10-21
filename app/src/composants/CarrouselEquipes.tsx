import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useThemeClub } from '../theme/theme';
import { CarteEquipe } from './CarteEquipe';

type PropsCarte = Omit<Parameters<typeof CarteEquipe>[0], 'rang' | 'total'>;

export interface CarteCarrousel {
  cle: string;
  carte: PropsCarte;
}

const MARGE_PAGE = 16;
const ESPACE = 12;
const PART = 0.85;

/** Cartes « affiche » défilant à l'horizontale : la suivante dépasse, le défilement s'accroche à chaque carte.
 *  Une seule carte : pleine largeur, sans points. Les points sont décoratifs (le rang est lu sur la carte). */
export function CarrouselEquipes({ cartes }: { cartes: CarteCarrousel[] }) {
  const t = useThemeClub();
  const { width } = useWindowDimensions();
  const [actif, setActif] = useState(0);
  const seule = cartes.length === 1;
  const largeur = seule ? width - 2 * MARGE_PAGE : Math.round(width * PART);
  const pas = largeur + ESPACE;

  const surDefilement = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / pas);
    setActif(Math.min(cartes.length - 1, Math.max(0, i)));
  };

  return (
    <View>
      <FlatList
        testID="carrousel-equipes"
        horizontal
        data={cartes}
        keyExtractor={(c) => c.cle}
        snapToInterval={pas}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={surDefilement}
        style={styles.liste}
        contentContainerStyle={styles.contenu}
        ItemSeparatorComponent={Separateur}
        renderItem={({ item, index }) => (
          // Les cartes d'une même rangée prennent la hauteur de la plus haute : le carrousel ne saute pas d'une carte à l'autre.
          <View testID="carte-equipe" style={{ width: largeur }}>
            <CarteEquipe {...item.carte} rang={index + 1} total={cartes.length} />
          </View>
        )}
      />
      {seule ? null : (
        <View testID="points-carrousel" style={styles.points} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {cartes.map((c, i) => (
            <View
              key={c.cle}
              testID="point-carrousel"
              style={[styles.point, i === actif ? { width: 22, backgroundColor: t.colors.primary } : { width: 8, backgroundColor: t.colors.outline }]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const Separateur = () => <View style={{ width: ESPACE }} />;

const styles = StyleSheet.create({
  // Déborde des marges de la page pour que le défilement aille bord à bord.
  liste: { marginHorizontal: -MARGE_PAGE, flexGrow: 0 },
  contenu: { paddingHorizontal: MARGE_PAGE, paddingBottom: 4 },
  points: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginVertical: 12 },
  point: { height: 8, borderRadius: 4 },
});
