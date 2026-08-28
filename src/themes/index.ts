import { boldTheme } from "@/themes/bold";
import { cleanTheme } from "@/themes/clean";
import { elegantTheme } from "@/themes/elegant";
import type { ResolvedTheme, ThemeOverrides } from "@/themes/types";
import type { ThemePreset } from "@/types/business";

const themes: Record<ThemePreset, ResolvedTheme> = {
  elegant: elegantTheme,
  clean: cleanTheme,
  bold: boldTheme,
};

export function isValidThemeColor(value: string | null | undefined): value is string {
  return typeof value === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function resolveTheme({
  preset,
  overrides = {},
}: {
  preset: ThemePreset;
  overrides?: ThemeOverrides;
}): ResolvedTheme {
  const base = themes[preset] ?? themes.elegant;
  const resolved = { ...base };

  for (const key of ["primary", "accent", "background", "dark"] as const) {
    const value = overrides[key];
    if (isValidThemeColor(value)) resolved[key] = value;
  }

  return resolved;
}

export type { ResolvedTheme, ThemeOverrides };
