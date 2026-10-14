import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Surface, Text } from 'react-native-paper';
import { EnTeteSection } from '../composants/EnTeteSection';
import { libelleScoreLu } from '../composants/LigneMatch';
import { heureDuMatch, jourDuMatch, libelleJour } from '../donnees/dates';
import { nomLisible, phraseResultat } from '../donnees/phrase';
import { matchParId, matchsDuCollectif, scoreEnAttente, serieEnCours } from '../donnees/selecteurs';
import type { Club, MatchAvecEquipe, Salle } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';

const LOGO = require('../../assets/logo-clamart.png');

interface Props {
  club: Club;
  matchId: string;
  maintenant: Date;
  onRetour: () => void;
  onItineraire: (salle: Salle) => void;
  onOuvrirLien: (url: string) => void;
  onAgenda: (m: MatchAvecEquipe) => void;
}

function Carte({ children, remplie = true }: { children: ReactNode; remplie?: boolean }) {
  const t = useThemeClub();
  return (
    <Surface style={{ borderRadius: t.rayonCarte }} elevation={1}>
      <View style={[styles.liste, remplie && styles.carte, { borderRadius: t.rayonCarte }]}>{children}</View>
    </Surface>
  );
}

export function VueMatch({ club, matchId, maintenant, onRetour, onItineraire, onOuvrirLien, onAgenda }: Props) {
  const t = useThemeClub();
  const m = matchParId(club, matchId);

  if (!m) {
    return (
      <View style={[styles.page, { backgroundColor: t.colors.background }]}>
        <Appbar.Header style={{ backgroundColor: t.colors.background }}>
          <Appbar.BackAction onPress={onRetour} accessibilityLabel="Retour" style={styles.action} />
        </Appbar.Header>
        <View style={styles.vide}>
          <Text variant="titleLarge" style={{ color: t.club.titre }}>Match introuvable</Text>
          <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>Il ne figure plus dans les résultats de la saison.</Text>
        </View>
      </View>
    );
  }

  const tous = matchsDuCollectif(club, m.equipe.collectif);
  const index = tous.findIndex((x) => x.id === m.id);
  const phrase = phraseResultat(m, serieEnCours(tous.slice(0, index + 1)));
  const adversaire = nomLisible(m.adversaire);
  const nous = `Clamart ${m.equipe.nom}`;
  const aVenir = m.resultat === null && m.date !== null && !scoreEnAttente(m, maintenant);
  const buteurs = m.equipe.stats_joueurs === true ? (m.buteurs ?? []).filter((b) => b.buts > 0) : [];
  const camps = m.domicile
    ? [{ nom: nous, score: m.score_nous, club: true }, { nom: adversaire, score: m.score_eux, club: false }]
    : [{ nom: adversaire, score: m.score_eux, club: false }, { nom: nous, score: m.score_nous, club: true }];
  const miTemps = m.mt_nous !== null && m.mt_eux !== null ? `Mi-temps ${m.mt_nous}–${m.mt_eux}` : undefined;

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.BackAction onPress={onRetour} accessibilityLabel="Retour" style={styles.action} />
        <Appbar.Content title={m.journee ? `${m.equipe.nom} · J${m.journee}` : m.equipe.nom} titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Carte>
          <Text variant="titleLarge" style={{ color: t.club.titre }} accessibilityRole="header">
            {phrase?.titre ?? `Contre ${adversaire}`}
          </Text>
          {phrase?.sousTitre ? <Text variant="bodyMedium" style={{ color: t.club.victoire.texte }}>{phrase.sousTitre}</Text> : null}
          <View style={styles.camps} accessible accessibilityLabel={libelleScoreLu(m)}>
            {camps.map((c) => (
              <View key={c.nom} style={styles.camp}>
                {c.club ? <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors /> : <View style={[styles.logo, { backgroundColor: t.colors.outlineVariant }]} />}
                <Text variant="bodyLarge" numberOfLines={2} style={[styles.nomCamp, { color: t.colors.onSurface }]}>{c.nom}</Text>
                <Text variant="headlineSmall" style={[styles.score, { color: t.club.titre }]}>{c.score ?? '–'}</Text>
              </View>
            ))}
          </View>
          {miTemps ? <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>{miTemps}</Text> : null}
          {m.resultat === null && scoreEnAttente(m, maintenant) ? (
            <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>Score pas encore publié</Text>
          ) : null}
        </Carte>

        <EnTeteSection titre="Infos" />
        <Carte>
          <Text variant="bodyLarge" style={{ color: t.colors.onSurface }}>
            {m.date ? `${libelleJour(jourDuMatch(m.date), 'long')} à ${heureDuMatch(m.date)}` : 'Date à venir'}
          </Text>
          <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
            {[m.equipe.detail, m.equipe.poule ? nomLisible(m.equipe.poule) : null, m.journee ? `journée ${m.journee}` : null, m.domicile ? 'domicile' : 'extérieur'].filter(Boolean).join(' · ')}
          </Text>
          {m.salle?.nom || m.salle?.adresse ? (
            <View style={styles.salle}>
              <View style={styles.texteSalle}>
                {m.salle.nom ? <Text variant="titleMedium" style={{ color: t.club.titre }}>{nomLisible(m.salle.nom)}</Text> : null}
                {m.salle.adresse ? <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>{m.salle.adresse}</Text> : null}
              </View>
              <Button mode="contained-tonal" icon="map-marker-radius" style={styles.bouton} onPress={() => onItineraire(m.salle!)}>Itinéraire</Button>
            </View>
          ) : null}
        </Carte>

        <View style={styles.actions}>
          {aVenir ? <Button mode="contained" icon="calendar-plus" style={styles.bouton} onPress={() => onAgenda(m)}>Ajouter à l'agenda</Button> : null}
          {m.feuille_de_match ? <Button mode="outlined" icon="file-document-outline" style={styles.bouton} onPress={() => onOuvrirLien(m.feuille_de_match!)}>Feuille de match</Button> : null}
          <Button mode="text" icon="open-in-new" style={styles.bouton} onPress={() => onOuvrirLien(m.url_ffhb)}>Voir sur ffhandball.fr</Button>
        </View>

        {buteurs.length ? (
          <>
            <EnTeteSection titre="Buteurs" />
            <Carte remplie={false}>
              {buteurs.map((b) => (
                <View key={b.joueur} style={[styles.rangee, { borderBottomColor: t.colors.outlineVariant }]}>
                  <Text variant="labelLarge" style={[styles.numero, { color: t.colors.onSurfaceVariant }]}>{b.numero ?? ''}</Text>
                  <Text variant="bodyLarge" style={[styles.joueur, { color: t.colors.onSurface }]}>{b.joueur}</Text>
                  <Text variant="titleMedium" style={[styles.buts, { color: t.club.titre, fontFamily: POLICES.gras }]}>{b.buts}</Text>
                </View>
              ))}
            </Carte>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  action: { width: 48, height: 48, margin: 0, borderRadius: 24 },
  bouton: { minHeight: 48, justifyContent: 'center' },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  carte: { padding: 16, gap: 8 },
  camps: { gap: 10, marginTop: 8 },
  camp: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 28, height: 28, borderRadius: 14 },
  nomCamp: { flex: 1 },
  score: { fontVariant: ['tabular-nums'], minWidth: 36, textAlign: 'right' },
  salle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  texteSalle: { flex: 1 },
  actions: { gap: 8, marginTop: 16 },
  liste: { overflow: 'hidden' },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  numero: { width: 28, fontVariant: ['tabular-nums'] },
  joueur: { flex: 1 },
  buts: { fontVariant: ['tabular-nums'] },
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
});
