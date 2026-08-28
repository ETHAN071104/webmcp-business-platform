export type ResolvedTheme = {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  dark: string;
  muted: string;
  border: string;
  surface: string;
  fontHeading: string;
  fontBody: string;
  radius: string;
  sectionSpacing: string;
};

export type ThemeOverrides = {
  primary?: string | null;
  accent?: string | null;
  background?: string | null;
  dark?: string | null;
};
