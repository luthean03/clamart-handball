/** Ratio de contraste WCAG 2.x entre deux couleurs #RRGGBB. */
export function contraste(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, v] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * v;
  };
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (fonce + 0.05);
}
