import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** L'heure courante, actualisée chaque minute et au retour dans l'app. */
export function useMaintenant(): Date {
  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') setMaintenant(new Date());
    });
    const minuterie = setInterval(() => setMaintenant(new Date()), 60_000);
    return () => {
      abonnement.remove();
      clearInterval(minuterie);
    };
  }, []);
  return maintenant;
}
