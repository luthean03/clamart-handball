import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Modal, Portal, SegmentedButtons, Text, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lienCompetitionFfhb, lienMatch, type Appli, type Competition } from '../actions/agenda';
import { URL_AGENDAS } from '../config';
import type { MatchAvecEquipe } from '../donnees/types';
import { useThemeClub } from '../theme/theme';
import { CIBLE, MARGE_SEGMENT } from './commun';

type Portee = 'match' | 'saison';

interface Props {
  visible: boolean;
  /** Compétitions du collectif : « Toute la saison » abonne leurs calendriers officiels FFHB. */
  competitions: Competition[];
  /** Identifiant FFHB du club. */
  clubId: string;
  /** Avec un match : choix entre « Ce match » et « Toute la saison » ; sans : la saison seule. */
  match?: MatchAvecEquipe;
  onFermer: () => void;
  onOuvrir: (url: string) => void;
  /** Toute la saison d'un collectif à plusieurs compétitions : le choix des compétitions se fait à part. */
  onChoisir: (appli: Appli) => void;
}

const CHOIX: { appli: Appli; titre: string; detail: string; icone: string }[] = [
  { appli: 'google', titre: 'Google Agenda', detail: 'Android, Samsung…', icone: 'google' },
  { appli: 'apple', titre: 'Apple Calendrier', detail: 'iPhone, iPad, Mac', icone: 'apple' },
  { appli: 'ics', titre: 'Fichier .ics', detail: 'Outlook et autres agendas', icone: 'calendar-import' },
];

const PORTEES = [
  { value: 'match', label: 'Ce match', hitSlop: MARGE_SEGMENT },
  { value: 'saison', label: 'Toute la saison', hitSlop: MARGE_SEGMENT },
];

/** Contenu monté à chaque ouverture : la portée choisie repart de « Ce match » sans rien réinitialiser à la main. */
function Contenu({ competitions, clubId, match, onOuvrir, onChoisir }: Omit<Props, 'visible' | 'onFermer'>) {
  const t = useThemeClub();
  // On ne retient que le choix de l'utilisateur ; sans match, la saison s'impose.
  const [choisie, setChoisie] = useState<Portee>('match');
  const portee: Portee = match ? choisie : 'saison';

  const choisir = (appli: Appli) => {
    if (portee === 'match' && match) return onOuvrir(lienMatch(appli, match, URL_AGENDAS));
    if (competitions.length === 1) return onOuvrir(lienCompetitionFfhb(appli, competitions[0].competitionId, clubId));
    onChoisir(appli);
  };

  return (
    <>
      <View style={[styles.poignee, { backgroundColor: t.colors.outlineVariant }]} />
      <Text variant="titleLarge" style={{ color: t.club.titre }} accessibilityRole="header">
        Ajouter à l'agenda
      </Text>
      {match ? (
        <SegmentedButtons
          style={styles.portee}
          value={portee}
          onValueChange={(v) => setChoisie(v as Portee)}
          buttons={PORTEES}
        />
      ) : (
        <View style={styles.espace} />
      )}
      {CHOIX.map((c) => (
        <TouchableRipple
          key={c.appli}
          accessibilityRole="button"
          onPress={() => choisir(c.appli)}
          style={[styles.choix, { borderColor: t.colors.outlineVariant }]}
          borderless
        >
          <>
            <Icon source={c.icone} size={22} color={t.club.titre} />
            <View style={styles.textes}>
              <Text variant="labelLarge" style={{ color: t.colors.onSurface }}>{c.titre}</Text>
              <Text variant="bodySmall" style={{ color: t.colors.onSurfaceVariant }}>{c.detail}</Text>
            </View>
          </>
        </TouchableRipple>
      ))}
    </>
  );
}

/** Panneau du bas « Ajouter à l'agenda » : Google Agenda, Apple Calendrier ou fichier .ics, pour un match ou toute la saison. */
export function PanneauAgenda({ visible, onFermer, ...contenu }: Props) {
  const t = useThemeClub();
  const { bottom } = useSafeAreaInsets();
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onFermer}
        overlayAccessibilityLabel="Fermer"
        style={styles.bas}
        contentContainerStyle={[
          styles.feuille,
          { backgroundColor: t.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 22 + bottom },
        ]}
      >
        <Contenu {...contenu} />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  // Le Modal de Paper centre son contenu et réserve la zone des barres système : on l'ancre au bord bas.
  bas: { justifyContent: 'flex-end', marginBottom: 0 },
  feuille: { justifyContent: 'flex-start', paddingTop: 10, paddingHorizontal: 16 },
  poignee: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  portee: { marginTop: 12, marginBottom: 14 },
  espace: { height: 14 },
  choix: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: CIBLE + 8, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, marginBottom: 8 },
  textes: { flex: 1 },
});
