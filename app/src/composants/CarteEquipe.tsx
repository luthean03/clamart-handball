import { StyleSheet, View } from 'react-native';
import { Button, Surface, Text, TouchableRipple } from 'react-native-paper';
import { compteARebours, heureDuMatch, jourDuMatch, libelleBandeau, libelleJour } from '../donnees/dates';
import { lierNumero, nomLisible, ordinal, rangAffiche } from '../donnees/phrase';
import { classementDuMatch } from '../donnees/selecteurs';
import type { Collectif, MatchAvecEquipe, Resultat } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';
import { CONTENU_BOUTON, NOM_SANS_COUPURE } from './commun';
import { Ecusson, EcussonClub } from './Ecusson';
import { Forme, LIBELLES } from './PastilleResultat';

interface Props {
  collectif: Collectif;
  /** Prochain match daté du collectif : sans lui, l'accueil n'affiche pas de carte. */
  prochain: MatchAvecEquipe;
  forme: Resultat[];
  /** Jour local, 'AAAA-MM-JJ' : sert au compte à rebours du bandeau. */
  aujourdhui: string;
  /** Rang de la carte dans le carrousel (à partir de 1) et nombre de cartes : lus par les lecteurs d'écran. */
  rang: number;
  total: number;
  onOuvrirMatch: () => void;
  onAgenda: (m: MatchAvecEquipe) => void;
}

/** Largeur fixe de chaque colonne d'équipe (dp) : écusson et nom centrés, rien ne déborde. */
const COLONNE = 104;
const ECUSSON = 56;
const INTERLIGNE_NOM = 16;

/** Salle (si connue) et domicile ou extérieur. */
const lieu = (m: MatchAvecEquipe) => [m.salle?.nom ? nomLisible(m.salle.nom) : undefined, m.domicile ? 'domicile' : 'extérieur'];

export function CarteEquipe({ collectif, prochain, forme, aujourdhui, rang, total, onOuvrirMatch, onAgenda }: Props) {
  const t = useThemeClub();
  const bandeau = t.club.bandeau;
  const classement = classementDuMatch(prochain);
  const competition = prochain.equipe.detail;
  const compte = compteARebours(jourDuMatch(prochain.date!), aujourdhui);
  const nomClub = `Clamart ${collectif.nom}`;
  const adversaire = nomLisible(prochain.adversaire);
  // Équipe à domicile d'abord, dans le même ordre que l'écran : gauche puis droite.
  const [domicileNom, exterieurNom] = prochain.domicile ? [nomClub, adversaire] : [adversaire, nomClub];
  const lu = [
    `${libelleJour(jourDuMatch(prochain.date!), 'long')} à ${heureDuMatch(prochain.date!)}`,
    compte,
    `${domicileNom} contre ${exterieurNom}`,
    competition,
    ...lieu(prochain),
    classement && `${ordinal(classement.place)} sur ${classement.nb}`,
    forme.length > 0 && `forme : ${forme.map((r) => LIBELLES[r]).join(', ')}`,
    `carte ${rang} sur ${total}`,
    'ouvre le match',
  ];

  const colonneClub = (
    <View testID="colonne-club" style={styles.colonne}>
      <EcussonClub taille={ECUSSON} />
      <Text variant="labelLarge" numberOfLines={2} ellipsizeMode="tail" {...NOM_SANS_COUPURE} style={[styles.nom, { color: t.club.titre }]}>
        {lierNumero(nomClub)}
      </Text>
    </View>
  );
  const colonneAdversaire = (
    <View testID="colonne-adversaire" style={styles.colonne}>
      <Ecusson uri={prochain.logo_adversaire} nom={adversaire} taille={ECUSSON} />
      <Text variant="labelLarge" numberOfLines={2} ellipsizeMode="tail" {...NOM_SANS_COUPURE} style={[styles.nom, { color: t.club.titre }]}>
        {lierNumero(adversaire)}
      </Text>
    </View>
  );
  // Clamart à gauche à domicile, à droite à l'extérieur.
  const gauche = prochain.domicile ? colonneClub : colonneAdversaire;
  const droite = prochain.domicile ? colonneAdversaire : colonneClub;

  return (
    <Surface style={[styles.carte, { borderRadius: t.rayonCarte }]} elevation={1}>
      <TouchableRipple
        onPress={onOuvrirMatch}
        borderless
        style={[styles.zone, { borderTopLeftRadius: t.rayonCarte, borderTopRightRadius: t.rayonCarte }]}
        accessibilityRole="button"
        accessibilityLabel={lu.filter(Boolean).join(', ')}
      >
        <View>
          <View testID="bandeau-date" style={[styles.bandeau, { backgroundColor: bandeau.fond }]}>
            <Text variant="labelLarge" style={[styles.date, { color: bandeau.texte }]}>
              {libelleBandeau(prochain.date!)}
            </Text>
            <Text variant="labelMedium" style={{ color: bandeau.doux, fontFamily: POLICES.gras }}>
              {compte}
            </Text>
          </View>
          <View style={styles.duel}>
            {gauche}
            <View style={styles.centreDuel}>
              <Text variant="labelLarge" style={[styles.vs, { color: t.colors.onSurfaceVariant }]}>
                VS
              </Text>
              <Text testID="heure-match" variant="labelLarge" style={[styles.heure, { color: t.club.titre }]}>
                {heureDuMatch(prochain.date!)}
              </Text>
            </View>
            {droite}
          </View>
          <View style={styles.details}>
            <Text variant="titleMedium" numberOfLines={2} style={[styles.centre, { color: t.club.titre }]}>
              {competition}
            </Text>
            <Text variant="bodyMedium" numberOfLines={2} style={[styles.centre, { color: t.colors.onSurfaceVariant }]}>
              {lieu(prochain).filter(Boolean).join(' · ')}
            </Text>
            {classement ? (
              <Text variant="labelLarge" style={[styles.centre, { color: t.colors.onSurfaceVariant }]}>
                {rangAffiche(classement.place, classement.nb)}
              </Text>
            ) : null}
            <View style={styles.forme}>
              <Forme resultats={forme} />
            </View>
          </View>
        </View>
      </TouchableRipple>
      <View style={[styles.pied, { borderTopColor: t.colors.outlineVariant }]}>
        <Button mode="text" icon="calendar-plus" contentStyle={CONTENU_BOUTON} onPress={() => onAgenda(prochain)}>
          Ajouter à l'agenda
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  // La carte remplit la hauteur de la plus haute du carrousel ; l'agenda reste en bas.
  carte: { flex: 1 },
  zone: { flex: 1 },
  bandeau: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  date: { flexShrink: 1 },
  duel: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 16, paddingHorizontal: 8 },
  colonne: { width: COLONNE, alignItems: 'center', gap: 6 },
  nom: { width: COLONNE, textAlign: 'center', fontSize: 13, lineHeight: INTERLIGNE_NOM, minHeight: 2 * INTERLIGNE_NOM },
  centreDuel: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 18 },
  // Poids par la famille Nunito, jamais par fontWeight : sur Android, un poids explicite remplace Nunito par Roboto.
  vs: { textAlign: 'center', fontFamily: POLICES.titre },
  heure: { textAlign: 'center', fontFamily: POLICES.gras },
  details: { alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  centre: { textAlign: 'center' },
  forme: { marginTop: 4, alignItems: 'center' },
  pied: { borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
});
