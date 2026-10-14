import { VERSION_SCHEMA_MAX, VERSION_SCHEMA_MIN } from '../config';
import type { Club } from './types';

function erreur(name: 'ErreurReseau' | 'SchemaInconnu', message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

/** Télécharge et valide club.json. Les erreurs sont reconnaissables à leur `name`. */
export async function chargerClub(url: string, chercher: typeof fetch = fetch): Promise<Club> {
  let reponse: Response;
  try {
    reponse = await chercher(url, { headers: { Accept: 'application/json' } });
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
