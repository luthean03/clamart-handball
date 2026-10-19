/** Contrat de club.json, version_schema 3 (produit par collecteur/collecte.py ; le schéma 2 reste lisible). */
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
  /** Écusson FFHB de l'adversaire (URL), absent s'il n'est pas publié. */
  logo_adversaire?: string | null;
  score_nous: number | null;
  score_eux: number | null;
  mt_nous: number | null;
  mt_eux: number | null;
  resultat: Resultat | null;
  url_ffhb: string;
  feuille_de_match: string | null;
  salle?: Salle | null;
  /** Nos buteurs (schéma 3 : toutes catégories ; schéma 2 : seniors uniquement). */
  buteurs?: Buteur[];
  /** Buteurs de l'équipe adverse (schéma 3). */
  buteurs_adverses?: Buteur[];
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
  /** Page « classements » de la poule en cours sur ffhandball.fr (optionnel : absent des anciennes collectes). */
  url_classement?: string | null;
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

export interface Club {
  version_schema: number;
  club: { nom: string; id_ffhb: string };
  saison: string;
  /** ISO UTC de la dernière collecte. */
  mis_a_jour: string;
  source: string;
  collectifs: Collectif[];
  equipes: Equipe[];
  erreurs: string[];
}

export type MatchAvecEquipe = Match & { equipe: Equipe };
