import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Surface, Text } from 'react-native-paper';
import { BandeauEtat } from '../composants/BandeauEtat';
import { CarteEquipe } from '../composants/CarteEquipe';
import { CONTENU_BOUTON } from '../composants/commun';
import { EcussonClub } from '../composants/Ecusson';
import { EnTeteSection } from '../composants/EnTeteSection';
import { LigneMatch } from '../composants/LigneMatch';
import { ProtectionBarreEtat } from '../composants/ProtectionBarreEtat';
import { jourLocal, libelleMiseAJour, libelleWeekend, salutation, weekendDeReference } from '../donnees/dates';
import { resumeCarte } from '../donnees/resume';
import { equipePrincipale, formeRecente, matchsDuCollectif, matchsDuWeekend } from '../donnees/selecteurs';
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
  onOuvrirEquipe: (id: string) => void;
  onOuvrirMatch: (id: string) => void;
  onAgenda: (m: MatchAvecEquipe) => void;
  onReglages: () => void;
  onChoisirEquipes: () => void;
}

export function VueAccueil(p: PropsAccueil) {
  const t = useThemeClub();
  const weekend = weekendDeReference(jourLocal(p.maintenant));
  const miens = p.club.collectifs.filter((c) => p.suivis.includes(c.id));
  const duClub = matchsDuWeekend(p.club, weekend);

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
              {`Week-end du ${libelleWeekend(weekend)} · ${libelleMiseAJour(p.club.mis_a_jour, p.maintenant)}`}
            </Text>
          </View>
          <IconButton icon="cog-outline" accessibilityLabel="Réglages" style={styles.reglages} onPress={p.onReglages} />
        </View>
  
        <BandeauEtat majRequise={p.majRequise} horsLigne={p.horsLigne} miseAJour={p.club.mis_a_jour} maintenant={p.maintenant} />
  
        <EnTeteSection titre="Mes équipes" />
        {miens.length === 0 ? (
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
          miens.map((c) => (
            <CarteEquipe
              key={c.id}
              collectif={c}
              resume={resumeCarte(p.club, c.id, weekend, p.maintenant)}
              equipe={equipePrincipale(p.club, c.id)}
              forme={formeRecente(matchsDuCollectif(p.club, c.id))}
              onOuvrirEquipe={() => p.onOuvrirEquipe(c.id)}
              onOuvrirMatch={p.onOuvrirMatch}
              onAgenda={p.onAgenda}
            />
          ))
        )}
  
        <EnTeteSection
          titre="Tout le club ce week-end"
          detail={duClub.length ? `${duClub.length} match${duClub.length > 1 ? 's' : ''}` : undefined}
        />
        <Surface style={{ borderRadius: t.rayonCarte }} elevation={1}>
          <View style={[styles.liste, { borderRadius: t.rayonCarte }]}>
            {duClub.length === 0 ? (
              <Text variant="bodyMedium" style={[styles.vide, { color: t.colors.onSurfaceVariant }]}>
                Aucun match au club ce week-end.
              </Text>
            ) : (
              duClub.map((m) => (
                <LigneMatch key={`${m.equipe.id}-${m.id}`} match={m} maintenant={p.maintenant} onPress={() => p.onOuvrirMatch(m.id)} />
              ))
            )}
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
});
