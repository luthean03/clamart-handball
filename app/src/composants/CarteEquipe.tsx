import { StyleSheet, View } from 'react-native';
import { Button, Surface, Text, TouchableRipple } from 'react-native-paper';
import { compteARebours, heureDuMatch, jourDuMatch, libelleBandeau, libelleJour } from '../donnees/dates';
import { lierNumero, nomLisible, ordinal, rangAffiche } from '../donnees/phrase';
import { classementDuMatch } from '../donnees/selecteurs';
import type { Collectif, MatchAvecEquipe, Resultat } from '../donnees/types';
import { useThemeClub } from '../theme/theme';
import { CONTENU_BOUTON, NOM_SANS_COUPURE } from './commun';
import { Ecusson } from './Ecusson';
import { Forme } from './PastilleResultat';

interface Props {
  collectif: Collectif;
  /** Prochain match daté du collectif : sans lui, l'accueil n'affiche pas de carte. */
  prochain: MatchAvecEquipe;
  forme: Resultat[];
  /** Jour local, 'AAAA-MM-JJ' : sert au compte à rebours du bandeau. */
  aujourdhui: string;
  onOuvrirMatch: () => void;
  onAgenda: (m: MatchAvecEquipe) => void;
}

/** Salle (si connue) et domicile ou extérieur. */
const lieu = (m: MatchAvecEquipe) => [m.salle?.nom ? nomLisible(m.salle.nom) : undefined, m.domicile ? 'domicile' : 'extérieur'];

export function CarteEquipe({ collectif, prochain, forme, aujourdhui, onOuvrirMatch, onAgenda }: Props) {
  const t = useThemeClub();
  const bandeau = t.club.bandeau;
  const rang = classementDuMatch(prochain);
  const competition = prochain.equipe.detail;
  const compte = compteARebours(jourDuMatch(prochain.date!), aujourdhui);
  const lu = [
    collectif.nom,
    rang && `${ordinal(rang.place)} sur ${rang.nb}`,
    `${libelleJour(jourDuMatch(prochain.date!), 'long')} à ${heureDuMatch(prochain.date!)}`,
    compte,
    prochain.equipe.detail,
    `contre ${nomLisible(prochain.adversaire)}`,
    ...lieu(prochain),
    'ouvre le match',
  ];

  return (
    <Surface style={[styles.carte, { borderRadius: t.rayonCarte }]} elevation={1}>
      <TouchableRipple
        onPress={onOuvrirMatch}
        borderless
        style={{ borderRadius: t.rayonCarte }}
        accessibilityRole="button"
        accessibilityLabel={lu.filter(Boolean).join(', ')}
      >
        <View>
          <View
            testID="bandeau-date"
            style={[styles.bandeau, { backgroundColor: bandeau.fond, borderTopLeftRadius: t.rayonCarte, borderTopRightRadius: t.rayonCarte }]}
          >
            <Text variant="labelLarge" style={[styles.date, { color: bandeau.texte }]}>
              {libelleBandeau(prochain.date!)}
            </Text>
            <Text variant="labelMedium" style={{ color: bandeau.doux, fontWeight: '700' }}>
              {compte}
            </Text>
          </View>
          <View style={styles.interieur}>
            <View style={styles.ligne} testID="entete-carte">
              <Text variant="titleLarge" numberOfLines={2} {...NOM_SANS_COUPURE} style={[styles.texte, { color: t.club.titre }]}>
                {lierNumero(collectif.nom)}
              </Text>
              {rang ? (
                <Text variant="labelLarge" style={{ color: t.colors.onSurfaceVariant }}>
                  {rangAffiche(rang.place, rang.nb)}
                </Text>
              ) : null}
            </View>
            <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
              {competition}
            </Text>
            <View style={styles.adversaire} testID="adversaire-carte">
              <Ecusson uri={prochain.logo_adversaire} nom={nomLisible(prochain.adversaire)} taille={32} />
              <View style={styles.texte}>
                <Text variant="titleMedium" numberOfLines={3} {...NOM_SANS_COUPURE} style={{ color: t.colors.onSurface }}>
                  {lierNumero(`Contre ${nomLisible(prochain.adversaire)}`)}
                </Text>
                <Text variant="bodyMedium" numberOfLines={2} style={{ color: t.colors.onSurfaceVariant }}>
                  {lieu(prochain).filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
            <View style={styles.pied}>
              <Forme resultats={forme} />
            </View>
          </View>
        </View>
      </TouchableRipple>
      <Button mode="contained" icon="calendar-plus" contentStyle={CONTENU_BOUTON} style={styles.action} onPress={() => onAgenda(prochain)}>
        Ajouter à l'agenda
      </Button>
    </Surface>
  );
}

const styles = StyleSheet.create({
  carte: { marginBottom: 12 },
  bandeau: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  date: { flexShrink: 1 },
  interieur: { padding: 16, gap: 6 },
  ligne: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  texte: { flex: 1, gap: 2 },
  adversaire: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  pied: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  action: { alignSelf: 'flex-start', marginHorizontal: 12, marginBottom: 12 },
});
