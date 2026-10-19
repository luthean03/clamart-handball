import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Button, Dialog, Icon, Portal, Text, TouchableRipple } from 'react-native-paper';
import { lienCompetitionFfhb, type Appli, type Competition } from '../actions/agenda';
import { POLICES, useThemeClub } from '../theme/theme';
import { CIBLE, CONTENU_BOUTON } from './commun';

interface Props {
  visible: boolean;
  /** Nom du collectif, repris dans le sous-titre. */
  collectif: string;
  appli: Appli;
  competitions: Competition[];
  clubId: string;
  /** Ouvre le lien ; vaut `false` si le téléphone ne peut pas l'ouvrir (le message d'erreur est alors déjà affiché). */
  onOuvrir: (url: string) => Promise<boolean>;
  onFermer: () => void;
}

/**
 * Choix des compétitions d'un collectif à ajouter à l'agenda, une à une (chaque compétition a son propre calendrier FFHB).
 * L'app ne sait pas si l'abonnement a abouti : une compétition est « ajoutée » quand l'utilisateur revient de l'application agenda.
 * État monté à chaque ouverture (le parent change de `key`) : tout repart cochée.
 */
export function DialogueCompetitions({ visible, collectif, appli, competitions, clubId, onOuvrir, onFermer }: Props) {
  const t = useThemeClub();
  const [cochees, setCochees] = useState(() => competitions.map((c) => c.competitionId));
  const [ajoutees, setAjoutees] = useState<string[]>([]);
  // Compétition dont le lien est ouvert : elle passe à « ajoutée » au prochain retour dans l'app.
  const enCours = useRef<string | null>(null);

  useEffect(() => {
    const abonnement = AppState.addEventListener('change', (etat) => {
      const id = enCours.current;
      if (etat !== 'active' || !id) return;
      enCours.current = null;
      setAjoutees((a) => [...a, id]);
    });
    return () => abonnement.remove();
  }, []);

  const aAjouter = competitions.filter((c) => cochees.includes(c.competitionId) && !ajoutees.includes(c.competitionId));
  const demarre = ajoutees.length > 0;
  const total = ajoutees.length + aAjouter.length;

  const abonner = async () => {
    const suivante = aAjouter[0];
    if (!suivante) return;
    if (await onOuvrir(lienCompetitionFfhb(appli, suivante.competitionId, clubId))) enCours.current = suivante.competitionId;
  };
  const basculer = (id: string) => setCochees((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onFermer}>
        <Dialog.Title style={{ color: t.club.titre, fontFamily: POLICES.titre }}>Compétitions à ajouter</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodySmall" style={[styles.sousTitre, { color: t.colors.onSurfaceVariant }]}>
            {collectif} · calendriers officiels ffhandball.fr
          </Text>
          {competitions.map((c) => {
            const fait = ajoutees.includes(c.competitionId);
            const coche = fait || cochees.includes(c.competitionId);
            const couleurs = fait
              ? { fond: t.club.victoire.fond, texte: t.club.victoire.texte, bord: t.club.victoire.fond }
              : coche
                ? { fond: t.colors.primaryContainer, texte: t.colors.onPrimaryContainer, bord: t.colors.primary }
                : { fond: 'transparent', texte: t.colors.onSurface, bord: t.club.trait };
            return (
              <TouchableRipple
                key={c.competitionId}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: coche, disabled: fait }}
                disabled={fait}
                onPress={() => basculer(c.competitionId)}
                style={[styles.pastille, { backgroundColor: couleurs.fond, borderColor: couleurs.bord }]}
                borderless
              >
                <>
                  <View style={styles.coche}>{coche && !fait ? <Icon source="check" size={20} color={couleurs.texte} /> : null}</View>
                  <Text variant="labelLarge" style={[styles.libelle, { color: couleurs.texte }]}>{c.detail}</Text>
                  {fait ? <Text variant="labelMedium" style={[styles.ajoute, { color: couleurs.texte }]}>✓ Ajouté</Text> : null}
                </>
              </TouchableRipple>
            );
          })}
          {demarre ? (
            <Text variant="labelMedium" style={[styles.progres, { color: t.colors.onSurfaceVariant }]}>
              {ajoutees.length} sur {total} ajouté
            </Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" contentStyle={CONTENU_BOUTON} onPress={onFermer}>{demarre ? 'Terminer' : 'Annuler'}</Button>
          {!demarre || aAjouter.length > 0 ? (
            <Button mode="contained" contentStyle={CONTENU_BOUTON} disabled={aAjouter.length === 0} onPress={abonner}>
              {demarre ? "S'abonner à la suivante" : "S'abonner"}
            </Button>
          ) : null}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sousTitre: { marginBottom: 16 },
  pastille: { flexDirection: 'row', alignItems: 'center', minHeight: CIBLE, paddingHorizontal: 16, borderWidth: 1.5, borderRadius: 12, marginBottom: 8 },
  coche: { width: 20, height: 20, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  libelle: { flex: 1 },
  ajoute: { marginLeft: 10 },
  progres: { marginTop: 4, marginHorizontal: 4 },
});
