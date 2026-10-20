/** Seul fichier de l'app autorisé à contenir des couleurs en dur. Couleurs du club relevées sur le logo. */
export interface Paire {
  fond: string;
  texte: string;
}

export interface Palette {
  fond: string;
  carte: string;
  texte: string;
  texteDoux: string;
  /** Scores et titres : bleu nuit de l'écusson. */
  titre: string;
  /** Rouge du club : boutons et actions (le bandeau de date a sa propre paire, `bandeau`). */
  action: string;
  surAction: string;
  ligne: string;
  /** Trait discret « Aujourd'hui » de la liste Matchs (plus marqué que `ligne`, qui se perd sur le fond). */
  trait: string;
  indicateur: string;
  surIndicateur: string;
  surligne: string;
  /** Snackbar : fond, texte et couleur de l'action. */
  inverse: { fond: string; texte: string; accent: string };
  /** Bandeau de date des cartes d'accueil : fond rouge du club, texte, et mention « dans N jours » plus douce. */
  bandeau: { fond: string; texte: string; doux: string };
  victoire: Paire;
  nul: Paire;
  defaite: Paire;
  /** Disque derrière les écussons en mode sombre (blancs des logos sur fond clair). `null` en clair. */
  pastille: string | null;
}

export const clair: Palette = {
  fond: '#FAF6E6',
  carte: '#FFFFFF',
  texte: '#2A2622',
  texteDoux: '#6E655D',
  titre: '#142A3D',
  action: '#DB0000',
  surAction: '#FFFFFF',
  ligne: '#EFE7DC',
  trait: '#CFC6BA',
  indicateur: '#FADAD3',
  surIndicateur: '#7A1005',
  surligne: '#FFF1E0',
  inverse: { fond: '#142A3D', texte: '#FFFEF0', accent: '#FFB4A8' },
  bandeau: { fond: '#DB0000', texte: '#FFFFFF', doux: '#FFECE8' },
  victoire: { fond: '#E3F1E8', texte: '#1B5E3B' },
  nul: { fond: '#EBEEF2', texte: '#3D4A57' },
  defaite: { fond: '#F1E9E4', texte: '#6B4A3E' },
  pastille: null,
};

export const sombre: Palette = {
  fond: '#1A1C20',
  carte: '#26292F',
  texte: '#EDEDED',
  texteDoux: '#A6ABB3',
  titre: '#FFFFFF',
  action: '#FF5A4E',
  surAction: '#2A0A06',
  ligne: '#333842',
  trait: '#4A505A',
  indicateur: '#4A2320',
  surIndicateur: '#FFD9D3',
  surligne: '#2F333A',
  inverse: { fond: '#F4F1EA', texte: '#1A1C20', accent: '#C8201A' },
  bandeau: { fond: '#C8201A', texte: '#FFFFFF', doux: '#FFEDEA' },
  victoire: { fond: '#1F3D31', texte: '#B5E6C8' },
  nul: { fond: '#2F333A', texte: '#D5D9DE' },
  defaite: { fond: '#3D2B27', texte: '#F2CFC6' },
  pastille: '#F4F1EA',
};
