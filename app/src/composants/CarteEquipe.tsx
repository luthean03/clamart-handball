import { StyleSheet, View } from 'react-native';
import { Button, Surface, Text, TouchableRipple } from 'react-native-paper';
import { heureDuMatch, jourDuMatch, libelleJour } from '../donnees/dates';
import { nomLisible, ordinal, scoreTexte } from '../donnees/phrase';
import type { ResumeCarte } from '../donnees/resume';
import type { Collectif, Equipe, Match, MatchAvecEquipe, Resultat } from '../donnees/types';
import { useThemeClub } from '../theme/theme';
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

function contenu(r: ResumeCarte) {
  switch (r.type) {
    case 'resultat':
      return {
        quand: libelleJour(jourDuMatch(r.match.date!), 'long'),
        titre: r.phrase.titre,
        sousTitre: r.phrase.sousTitre,
        droite: scoreTexte(r.match),
        droiteLue: `${r.match.score_nous} à ${r.match.score_eux}`,
        meta: lieu(r.match),
      };
    case 'en-attente':
      return {
        quand: libelleJour(jourDuMatch(r.match.date!), 'long'),
        titre: `Contre ${nomLisible(r.match.adversaire)}`,
        droite: '–',
        droiteLue: 'score inconnu',
        meta: 'Score pas encore publié',
      };
    case 'a-venir':
      return {
        quand: libelleJour(jourDuMatch(r.match.date!), 'long'),
        titre: `Contre ${nomLisible(r.match.adversaire)}`,
        droite: heureDuMatch(r.match.date!),
        droiteLue: `à ${heureDuMatch(r.match.date!)}`,
        meta: lieu(r.match),
      };
    case 'sans-match':
      return {
        quand: 'ce week-end',
        titre: 'Pas de match ce week-end',
        meta: r.prochain?.date
          ? `Prochain : ${libelleJour(jourDuMatch(r.prochain.date))} à ${heureDuMatch(r.prochain.date)}`
          : 'Aucun match programmé pour le moment',
      };
  }
}

export function CarteEquipe({ collectif, resume, equipe, forme, onOuvrirEquipe, onOuvrirMatch, onAgenda }: Props) {
  const t = useThemeClub();
  const c: { quand: string; titre: string; sousTitre?: string; droite?: string; droiteLue?: string; meta?: string } = contenu(resume);
  return (
    <Surface style={[styles.carte, { borderRadius: t.rayonCarte }]} elevation={1}>
      <TouchableRipple
        onPress={onOuvrirEquipe}
        borderless
        style={{ borderRadius: t.rayonCarte }}
        accessibilityRole="button"
        accessibilityLabel={`${collectif.nom}, ${c.quand} : ${c.titre}${c.droiteLue ? `, ${c.droiteLue}` : ''}`}
      >
        <View style={styles.interieur}>
          <Text variant="labelLarge" style={{ color: t.colors.onSurfaceVariant }}>
            {`${collectif.nom} · ${c.quand}`}
          </Text>
          <View style={styles.ligne}>
            <View style={styles.texte}>
              <Text variant="titleLarge" numberOfLines={2} style={{ color: t.club.titre }}>
                {c.titre}
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
          <View style={styles.pied}>
            <Forme resultats={forme} />
            {equipe?.place ? (
              <Text variant="labelLarge" style={{ color: t.colors.onSurfaceVariant }}>
                {`${ordinal(equipe.place)} sur ${equipe.nb_equipes}`}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableRipple>
      {resume.type === 'resultat' ? (
        <Button mode="text" style={styles.action} onPress={() => onOuvrirMatch(resume.match.id)}>
          Voir le match
        </Button>
      ) : null}
      {resume.type === 'a-venir' ? (
        <Button mode="contained" icon="calendar-plus" style={styles.action} onPress={() => onAgenda(resume.match)}>
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
  pied: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  action: { alignSelf: 'flex-start', marginHorizontal: 12, marginBottom: 12 },
});
