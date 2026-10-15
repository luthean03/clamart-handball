/** Contrat de club.json, version_schema 2 (produit par collecteur/collecte.py). */
export type Resultat = 'V' | 'N' | 'D';

export interface Salle {
  nom: string | null;
  adresse: string | null;
}

export interface Buteur {
  joueur: string;
  numero: number | null;
  buts: number;
}

export interface Match {
  id: string;
  /** ISO avec décalage de Paris, ou null si pas encore programmé. */
  date: string | null;
  journee: number | null;
  domicile: boolean;
  adversaire: string;
  score_nous: number | null;
  score_eux: number | null;
  mt_nous: number | null;
  mt_eux: number | null;
  resultat: Resultat | null;
  url_ffhb: string;
  feuille_de_match: string | null;
  salle?: Salle | null;
  /** Seniors uniquement. */
  buteurs?: Buteur[];
}

export interface LigneClassement {
  place: number | null;
  equipe: string;
  points: number | null;
  joues: number | null;
  gagnes: number | null;
  nuls: number | null;
  perdus: number | null;
  bp: number | null;
  bc: number | null;
  diff: number | null;
  nous: boolean;
}

export interface Bilan {
  joues: number;
  victoires: number;
  nuls: number;
  defaites: number;
  bp: number;
  bc: number;
}

export interface Equipe {
  id: string;
  nom: string;
  libelle_ffhb: string;
  competition: string;
  detail: string;
  organisateur: string | null;
  niveau: string;
  categorie: string;
  genre: string;
  phase: string | null;
  poule: string | null;
  url_ffhb: string;
  stats_joueurs: boolean;
  classement: LigneClassement[] | null;
  matchs: Match[];
  bilan: Bilan;
  forme: string;
  place?: number | null;
  nb_equipes?: number;
  collectif: string;
}

export interface Collectif {
  id: string;
  nom: string;
  categorie: string;
  genre: string;
  equipes: string[];
}

export interface ButeurClub {
  joueur: string;
  equipes: string[];
  matchs: number;
  buts: number;
  record: number;
  moyenne: number;
}

export interface Club {
  version_schema: number;
  club: { nom: string; id_ffhb: string };
  saison: string;
  /** ISO UTC de la dernière collecte. */
  mis_a_jour: string;
  source: string;
  collectifs: Collectif[];
  equipes: Equipe[];
  buteurs_club: ButeurClub[];
  erreurs: string[];
}

export type MatchAvecEquipe = Match & { equipe: Equipe };
