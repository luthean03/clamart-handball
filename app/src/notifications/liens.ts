const ID = /^[A-Za-z0-9-]+$/;

export const parametre = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** Route ouverte par une notification. Les ids viennent du réseau : validés avant d'en faire une route. */
export function lienNotification(d: Record<string, string>): string | undefined {
  if (d.match_id && ID.test(d.match_id) && d.equipe_id && ID.test(d.equipe_id)) {
    return `/match/${d.match_id}?equipe=${d.equipe_id}`;
  }
  if (d.collectif && ID.test(d.collectif)) return `/equipe/${d.collectif}`;
  return undefined;
}
