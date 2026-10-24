const ID = /^[A-Za-z0-9-]+$/;

export const parametre = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/**
 * Route de la fiche d'un match. `equipe` désigne l'équipe du club : un derby entre deux équipes du club porte le même
 * id de match chez chacune, et sans elle la fiche montrerait l'une ou l'autre au hasard de l'ordre des données.
 */
export const routeMatch = (id: string, equipe?: string): string => (equipe ? `/match/${id}?equipe=${equipe}` : `/match/${id}`);

/** Route ouverte par une notification. Les ids viennent du réseau : validés avant d'en faire une route. */
export function lienNotification(d: Record<string, string>): string | undefined {
  if (d.match_id && ID.test(d.match_id) && d.equipe_id && ID.test(d.equipe_id)) {
    return routeMatch(d.match_id, d.equipe_id);
  }
  if (d.collectif && ID.test(d.collectif)) return `/equipe/${d.collectif}`;
  return undefined;
}

/**
 * Identité d'une fiche match dans la pile (`dangerouslySingular`) : un lien vers un autre match ouvre une nouvelle fiche
 * au lieu de réutiliser celle qui est déjà ouverte ; le même match deux fois ramène à sa fiche.
 */
export const idFicheMatch = (_nom: string, params: Record<string, unknown>): string =>
  `${parametre(params.id as string | string[] | undefined) ?? ''}|${parametre(params.equipe as string | string[] | undefined) ?? ''}`;
