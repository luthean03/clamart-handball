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
  /** Rouge du club, réservé à ce qui est actionnable. */
  action: string;
  surAction: string;
  ligne: string;
  indicateur: string;
  surIndicateur: string;
  surligne: string;
  /** Snackbar : fond, texte et couleur de l'action. */
  inverse: { fond: string; texte: string; accent: string };
  victoire: Paire;
  nul: Paire;
  defaite: Paire;
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
  indicateur: '#FADAD3',
  surIndicateur: '#7A1005',
  surligne: '#FFF1E0',
  inverse: { fond: '#142A3D', texte: '#FFFEF0', accent: '#FFB4A8' },
  victoire: { fond: '#E3F1E8', texte: '#1B5E3B' },
  nul: { fond: '#EBEEF2', texte: '#3D4A57' },
  defaite: { fond: '#F1E9E4', texte: '#6B4A3E' },
};

export const sombre: Palette = {
  fond: '#142A3D',
  carte: '#1E3549',
  texte: '#F4EFE6',
  texteDoux: '#B4C0CC',
  titre: '#FFFEF0',
  action: '#FF6B5E',
  surAction: '#2A0A06',
  ligne: '#2C4256',
  indicateur: '#5A1D18',
  surIndicateur: '#FFDAD4',
  surligne: '#26425A',
  inverse: { fond: '#FFFEF0', texte: '#142A3D', accent: '#DB0000' },
  victoire: { fond: '#21483A', texte: '#BFE8CF' },
  nul: { fond: '#2C4256', texte: '#D5DCE3' },
  defaite: { fond: '#4A3430', texte: '#F0D2C6' },
};
