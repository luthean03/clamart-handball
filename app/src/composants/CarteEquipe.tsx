import { StyleSheet, View } from 'react-native';
import { Button, Surface, Text, TouchableRipple } from 'react-native-paper';
import { heureDuMatch, jourDuMatch, libelleJour } from '../donnees/dates';
import { lierNumero, nomLisible, rangAffiche, scoreTexte } from '../donnees/phrase';
import type { ResumeCarte } from '../donnees/resume';
import type { Collectif, Equipe, Match, MatchAvecEquipe, Resultat } from '../donnees/types';
import { useThemeClub } from '../theme/theme';
import { CONTENU_BOUTON, NOM_SANS_COUPURE } from './commun';
import { Forme } from './PastilleResultat';

interface Props {
  collectif: Collectif;
  resume: ResumeCarte;
  equipe?: Equipe;
  forme: Resultat[];
  onOuvrirEquipe: () => void;
  onOuvrirMatch: (id: string) => void;
  onAgenda: (m: MatchAvecEquipe) => void;
}

const lieu = (m: Match) =>
  [m.salle?.nom ? nomLisible(m.salle.nom) : undefined, m.domicile ? 'domicile' : 'extérieur'].filter(Boolean).join(' · ');

interface Contenu {
  /** Jour du match, en toutes lettres (« dimanche 11 oct. »). */
  quand?: string;
  titre: string;
  sousTitre?: string;
  droite?: string;
  droiteLue?: string;
  /** Ligne sous la phrase : jour · salle · domicile ou extérieur. */
  meta?: string;
  dernier?: string;
}

const ligne = (...parties: (string | undefined)[]) => parties.filter(Boolean).join(' · ');

function contenu(r: ResumeCarte): Contenu {
  switch (r.type) {
    case 'resultat': {
      const quand = libelleJour(jourDuMatch(r.match.date!), 'long');
      return {
        quand,
        titre: r.phrase.titre,
        sousTitre: r.phrase.sousTitre,
        droite: scoreTexte(r.match),
        droiteLue: `${r.match.score_nous} à ${r.match.score_eux}`,
        meta: ligne(quand, lieu(r.match)),
      };
    }
    case 'en-attente': {
      const quand = libelleJour(jourDuMatch(r.match.date!), 'long');
      return {
        quand,
        titre: `Contre ${nomLisible(r.match.adversaire)}`,
        droite: '–',
        droiteLue: 'score inconnu',
        meta: ligne(quand, 'Score pas encore publié'),
      };
    }
    case 'a-venir': {
      const quand = libelleJour(jourDuMatch(r.match.date!), 'long');
      return {
        quand,
        titre: `Contre ${nomLisible(r.match.adversaire)}`,
        droite: heureDuMatch(r.match.date!),
        droiteLue: `à ${heureDuMatch(r.match.date!)}`,
        meta: ligne(quand, lieu(r.match)),
        dernier: r.dernier ? `Dernier match : ${r.dernier.phrase.titre}, ${scoreTexte(r.dernier.match)}` : undefined,
      };
    }
    case 'sans-match':
      return {
        titre: 'Pas de match ce week-end',
        meta: r.prochain?.date
          ? `Prochain : ${libelleJour(jourDuMatch(r.prochain.date))} à ${heureDuMatch(r.prochain.date)}`
          : 'Aucun match programmé pour le moment',
      };
  }
}

export function CarteEquipe({ collectif, resume, equipe, forme, onOuvrirEquipe, onOuvrirMatch, onAgenda }: Props) {
  const t = useThemeClub();
  const c = contenu(resume);
  const lu = [collectif.nom, c.titre, c.sousTitre, c.droiteLue, c.quand].filter(Boolean).join(', ');
  return (
    <Surface style={[styles.carte, { borderRadius: t.rayonCarte }]} elevation={1}>
      <TouchableRipple
        onPress={onOuvrirEquipe}
        borderless
        style={{ borderRadius: t.rayonCarte }}
        accessibilityRole="button"
        accessibilityLabel={lu}
      >
        <View style={styles.interieur}>
          <View style={styles.ligne} testID="entete-carte">
            <Text variant="titleLarge" numberOfLines={2} {...NOM_SANS_COUPURE} style={[styles.texte, { color: t.club.titre }]}>
              {lierNumero(collectif.nom)}
            </Text>
            {equipe?.place && equipe.nb_equipes ? (
              <Text variant="labelLarge" style={{ color: t.colors.onSurfaceVariant }}>
                {rangAffiche(equipe.place, equipe.nb_equipes)}
              </Text>
            ) : null}
          </View>
          <View style={styles.ligne}>
            <View style={styles.texte}>
              <Text variant="titleMedium" numberOfLines={3} {...NOM_SANS_COUPURE} style={{ color: t.colors.onSurface }}>
                {lierNumero(c.titre)}
              </Text>
              {c.sousTitre ? (
                <Text variant="bodyMedium" style={{ color: t.club.victoire.texte }}>
                  {c.sousTitre}
                </Text>
              ) : null}
            </View>
            {c.droite ? (
              <Text variant="headlineSmall" style={[styles.score, { color: t.club.titre }]}>
                {c.droite}
              </Text>
            ) : null}
          </View>
          {c.meta ? (
            <Text variant="bodyMedium" numberOfLines={2} style={{ color: t.colors.onSurfaceVariant }}>
              {c.meta}
            </Text>
          ) : null}
          {c.dernier ? (
            <Text variant="bodyMedium" numberOfLines={3} style={{ color: t.colors.onSurfaceVariant }}>
              {c.dernier}
            </Text>
          ) : null}
          <View style={styles.pied}>
            <Forme resultats={forme} />
          </View>
        </View>
      </TouchableRipple>
      {resume.type === 'resultat' ? (
        <Button mode="text" contentStyle={CONTENU_BOUTON} style={styles.action} onPress={() => onOuvrirMatch(resume.match.id)}>
          Voir le match
        </Button>
      ) : null}
      {resume.type === 'a-venir' ? (
        <Button mode="contained" icon="calendar-plus" contentStyle={CONTENU_BOUTON} style={styles.action} onPress={() => onAgenda(resume.match)}>
          Ajouter à l'agenda
        </Button>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  carte: { marginBottom: 12 },
  interieur: { padding: 16, gap: 6 },
  ligne: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  texte: { flex: 1, gap: 2 },
  score: { fontVariant: ['tabular-nums'] },
  pied: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  action: { alignSelf: 'flex-start', marginHorizontal: 12, marginBottom: 12 },
});
