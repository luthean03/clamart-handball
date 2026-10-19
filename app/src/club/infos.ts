import type { Salle } from '../donnees/types';

/** Ce que l'onglet « Le club » affiche : valeurs publiques du club, qui ne viennent pas de club.json. */
export const INFOS_CLUB = {
  nom: 'Clamart Handball',
  devise: 'Éducation · Plaisir · Compétition · depuis 2006',
  instagram: { nom: '@clamart_handball', url: 'https://www.instagram.com/clamart_handball/' },
  facebook: { nom: 'ClamartHandball', url: 'https://www.facebook.com/ClamartHandball/' },
  site: { nom: 'clamart-handball.clubeo.com', url: 'https://clamart-handball.clubeo.com/' },
  gymnase: { nom: 'Gymnase du Petit Clamart', adresse: '56 rue de la Bourcillière, 92140 Clamart' } satisfies Salle,
  adresse: '1 place Jules Hunebelle, 92140 Clamart',
  contact: 'https://clamart-handball.clubeo.com/contact.html',
  horaires: 'https://clamart-handball.clubeo.com/page/horaires-et-categories.html',
};
