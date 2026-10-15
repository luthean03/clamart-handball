import { VERSION_SCHEMA_MAX, VERSION_SCHEMA_MIN } from '../config';
import type { Club } from './types';

function erreur(name: 'ErreurReseau' | 'SchemaInconnu', message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

/** Au-delà, le téléchargement est abandonné : sans cela, un réseau qui n'achève jamais la réponse garde l'app en chargement. */
export const DELAI_TELECHARGEMENT_MS = 15_000;

/** Télécharge et valide club.json. Les erreurs sont reconnaissables à leur `name`. */
export async function chargerClub(url: string, chercher: typeof fetch = fetch): Promise<Club> {
  // AbortSignal.timeout n'existe pas sous Hermes : contrôleur + minuteur. La course garantit la fin même si fetch ignore le signal.
  const controleur = new AbortController();
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, rejeter) => {
    minuteur = setTimeout(() => {
      controleur.abort();
      rejeter(erreur('ErreurReseau', 'Délai dépassé'));
    }, DELAI_TELECHARGEMENT_MS);
  });
  try {
    return await Promise.race([telecharger(url, chercher, controleur.signal), delai]);
  } finally {
    clearTimeout(minuteur);
  }
}

async function telecharger(url: string, chercher: typeof fetch, signal: AbortSignal): Promise<Club> {
  let reponse: Response;
  try {
    reponse = await chercher(url, { headers: { Accept: 'application/json' }, signal });
  } catch {
    throw erreur('ErreurReseau', 'Pas de connexion');
  }
  if (!reponse.ok) throw erreur('ErreurReseau', `Réponse ${reponse.status}`);
  let club: Club;
  try {
    club = (await reponse.json()) as Club;
  } catch {
    throw erreur('ErreurReseau', 'Réponse illisible');
  }
  const version = typeof club?.version_schema === 'number' ? club.version_schema : 1;
  if (version < VERSION_SCHEMA_MIN || version > VERSION_SCHEMA_MAX) {
    throw erreur('SchemaInconnu', `Format de données ${version} non pris en charge`);
  }
  return club;
}
