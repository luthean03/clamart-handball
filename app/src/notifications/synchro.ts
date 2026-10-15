import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSuivi } from '../suivi/suivi';
import { clientFcm, lireAutorisation } from './fcm';
import { planAbonnements, sujetsAttendus } from './sujets';

export interface ClientSujets {
  abonner(sujet: string): Promise<void>;
  desabonner(sujet: string): Promise<void>;
}

export async function synchroniser(attendus: string[], actuels: string[], client: ClientSujets): Promise<string[]> {
  const plan = planAbonnements(attendus, actuels);
  const etat = new Set(actuels);
  for (const s of plan.abonner) {
    try { await client.abonner(s); etat.add(s); } catch { /* restera dans l'état précédent, retenté au prochain lancement */ }
  }
  for (const s of plan.desabonner) {
    try { await client.desabonner(s); etat.delete(s); } catch { /* idem */ }
  }
  return [...etat];
}

/** Garde les abonnements FCM alignés sur les équipes suivies et les préférences (au lancement et à chaque changement). */
export function useSynchroAbonnements(): void {
  const pret = useSuivi((s) => s.pret);
  const suivis = useSuivi((s) => s.suivis);
  const notifResultats = useSuivi((s) => s.notifResultats);
  const rappels = useSuivi((s) => s.rappels);
  const autorisation = useSuivi((s) => s.autorisation);

  useEffect(() => {
    // L'utilisateur peut changer l'autorisation dans les réglages Android : la relire au retour dans l'app.
    const relire = () => lireAutorisation().then((a) => {
      const actuelle = useSuivi.getState().autorisation;
      if (a === 'accordee' && actuelle !== 'accordee') useSuivi.getState().setAutorisation('accordee');
      if (a !== 'accordee' && actuelle === 'accordee') useSuivi.getState().setAutorisation('refusee');
    }).catch(() => {});
    relire();
    const abonnement = AppState.addEventListener('change', (e) => e === 'active' && relire());
    return () => abonnement.remove();
  }, []);

  useEffect(() => {
    if (!pret) return;
    const attendus = sujetsAttendus(suivis, { notifResultats, rappels, autorisation });
    synchroniser(attendus, useSuivi.getState().sujets, clientFcm)
      .then((sujets) => useSuivi.getState().setSujets(sujets))
      .catch(() => {});
  }, [pret, suivis, notifResultats, rappels, autorisation]);
}
