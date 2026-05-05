export type ReviewTheme = {
  primary: string;
  accent: string;
  button: string;
  background: string;
};

export const reviewThemePresets: Record<string, ReviewTheme> = {
  Electronics: { primary: '#2563eb', accent: '#dbeafe', button: '#0f172a', background: '#f5f7fb' },
  Fashion: { primary: '#ea580c', accent: '#ffe7d6', button: '#111827', background: '#fdf5ef' },
  Beauty: { primary: '#db2777', accent: '#fce7f3', button: '#831843', background: '#fff0f6' },
  Wellness: { primary: '#22c55e', accent: '#dcfce7', button: '#064e3b', background: '#f2fbf5' },
  default: { primary: '#0ea5e9', accent: '#e0f2fe', button: '#020617', background: '#f8fafc' },
};

export const getThemeForCategory = (category?: string) => {
  if (!category) return reviewThemePresets.default;
  return reviewThemePresets[category] ?? reviewThemePresets.default;
};

export const buildReviewColors = (theme?: ReviewTheme) => {
  const applied = theme ?? reviewThemePresets.default;
  const primary = applied.primary || reviewThemePresets.default.primary;
  const accent = applied.accent || reviewThemePresets.default.accent;
  const background = applied.background || reviewThemePresets.default.background;

  return {
    primary,
    accent,
    background,
    gradient: `linear-gradient(135deg, ${background} 0%, ${accent} 45%, #ffffff 100%)`,
    cardBorder: `${primary}33`,
    highlightBg: `${accent}80`,
    highlightText: '#0f172a',
  } as const;
};
