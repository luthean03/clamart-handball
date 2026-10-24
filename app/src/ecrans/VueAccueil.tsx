import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Surface, Text } from 'react-native-paper';
import { BandeauEtat } from '../composants/BandeauEtat';
import { CarrouselEquipes } from '../composants/CarrouselEquipes';
import { CONTENU_BOUTON } from '../composants/commun';
import { EcussonClub } from '../composants/Ecusson';
import { EnTeteSection } from '../composants/EnTeteSection';
import { LigneMatch } from '../composants/LigneMatch';
import { ProtectionBarreEtat } from '../composants/ProtectionBarreEtat';
import { jourLocal, libelleMiseAJour, salutation } from '../donnees/dates';
import { formeRecente, matchsDuCollectif, prochainMatchDate, prochainsMatchsClub } from '../donnees/selecteurs';
import type { Club, MatchAvecEquipe } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

export interface PropsAccueil {
  club: Club;
  maintenant: Date;
  suivis: string[];
  horsLigne: boolean;
  majRequise: boolean;
  rafraichissement: boolean;
  rafraichir: () => void;
  /** `equipeId` précise l'équipe quand un même id de match figure chez plusieurs. */
  onOuvrirMatch: (id: string, equipeId?: string) => void;
  onAgenda: (m: MatchAvecEquipe) => void;
  onReglages: () => void;
  onChoisirEquipes: () => void;
  /** « Tous les matchs » : ouvre l'onglet Matchs. */
  onTousLesMatchs: () => void;
}

/** « mis à jour à 16:41 » → « Mis à jour à 16:41 ». */
const enCapitale = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);

export function VueAccueil(p: PropsAccueil) {
  const t = useThemeClub();
  const aujourdhui = jourLocal(p.maintenant);
  // Une équipe suivie sans prochain match daté n'a pas de carte.
  const cartes = p.club.collectifs
    .filter((c) => p.suivis.includes(c.id))
    .flatMap((c) => {
      const prochain = prochainMatchDate(p.club, c.id, p.maintenant);
      return prochain ? [{ collectif: c, prochain }] : [];
    })
    // Le match le plus proche en premier ; à date égale, l'ordre des équipes est conservé (tri stable).
    .sort((a, b) => Date.parse(a.prochain.date!) - Date.parse(b.prochain.date!));
  const duClub = prochainsMatchsClub(p.club, p.maintenant);

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <ProtectionBarreEtat />
      <ScrollView
        testID="defilement-accueil"
        contentContainerStyle={styles.contenu}
        refreshControl={<RefreshControl refreshing={p.rafraichissement} onRefresh={p.rafraichir} colors={[t.colors.primary]} />}
      >
        <View style={styles.entete}>
          <EcussonClub taille={48} libelle="Écusson du Clamart Handball" />
          <View style={styles.titres}>
            <Text variant="headlineSmall" style={{ color: t.club.titre }} accessibilityRole="header">
              {salutation(p.maintenant)}
            </Text>
            <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
              {enCapitale(libelleMiseAJour(p.club.mis_a_jour, p.maintenant))}
            </Text>
          </View>
          <IconButton icon="cog-outline" accessibilityLabel="Réglages" style={styles.reglages} onPress={p.onReglages} />
        </View>
  
        <BandeauEtat majRequise={p.majRequise} horsLigne={p.horsLigne} miseAJour={p.club.mis_a_jour} maintenant={p.maintenant} />
  
        {p.suivis.length === 0 || cartes.length > 0 ? <EnTeteSection titre="Mes équipes" /> : null}
        {p.suivis.length === 0 ? (
          <Surface style={[styles.invitation, { borderRadius: t.rayonCarte }]} elevation={1}>
            <Text variant="titleMedium" style={{ color: t.club.titre }}>
              Suivez vos équipes
            </Text>
            <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
              Leurs résultats et leurs prochains matchs s'afficheront ici en premier.
            </Text>
            <Button mode="contained" contentStyle={CONTENU_BOUTON} style={styles.bouton} onPress={p.onChoisirEquipes}>
              Choisir mes équipes
            </Button>
          </Surface>
        ) : (
          <CarrouselEquipes
            cartes={cartes.map(({ collectif, prochain }) => ({
              cle: collectif.id,
              carte: {
                collectif,
                prochain,
                forme: formeRecente(matchsDuCollectif(p.club, collectif.id)),
                aujourdhui,
                onOuvrirMatch: () => p.onOuvrirMatch(prochain.id, prochain.equipe.id),
                onAgenda: p.onAgenda,
              },
            }))}
          />
        )}
  
        <EnTeteSection titre="Tout le club" />
        <Surface style={{ borderRadius: t.rayonCarte }} elevation={1}>
          <View style={[styles.liste, { borderRadius: t.rayonCarte }]}>
            {duClub.length === 0 ? (
              <Text variant="bodyMedium" style={[styles.vide, { color: t.colors.onSurfaceVariant }]}>
                Aucun match à venir au club.
              </Text>
            ) : (
              duClub.map((m) => (
                <LigneMatch
                  key={`${m.equipe.id}-${m.id}`}
                  match={m}
                  maintenant={p.maintenant}
                  afficherDate
                  onPress={() => p.onOuvrirMatch(m.id, m.equipe.id)}
                />
              ))
            )}
            <Button mode="text" contentStyle={CONTENU_BOUTON} style={styles.tous} onPress={p.onTousLesMatchs}>
              Tous les matchs
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titres: { flex: 1 },
  reglages: { width: 48, height: 48, margin: 0, borderRadius: 24 },
  invitation: { padding: 16, gap: 6 },
  bouton: { alignSelf: 'flex-start', marginTop: 8 },
  liste: { overflow: 'hidden' },
  vide: { padding: 16 },
  tous: { alignSelf: 'center', marginVertical: 4 },
});
