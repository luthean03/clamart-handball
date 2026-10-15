import { useRouter } from 'expo-router';
import { VueAutorisation } from '../ecrans/VueAutorisation';
import { demanderAutorisation } from '../notifications/fcm';
import { useSuivi } from '../suivi/suivi';

export default function Autorisation() {
  const routeur = useRouter();
  const fin = () => routeur.replace('/');
  return (
    <VueAutorisation
      onActiver={() => demanderAutorisation().then((a) => useSuivi.getState().setAutorisation(a)).catch(() => {}).finally(fin)}
      onPlusTard={fin}
    />
  );
}
