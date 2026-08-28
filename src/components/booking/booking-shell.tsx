import type { CSSProperties, ReactNode } from "react";

import { resolveTheme } from "@/themes";
import type { Business } from "@/types/business";

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

export function BookingShell({
  business,
  eyebrow,
  title,
  introduction,
  children,
}: {
  business: Business;
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  const tokens = resolveTheme({
    preset: business.themePreset,
    overrides: {
      primary: business.brandPrimary,
      accent: business.brandAccent,
      background: business.brandBackground,
      dark: business.brandDark,
    },
  });
  const style: ThemeStyle = {
    "--theme-font-heading": tokens.fontHeading,
    "--theme-font-body": tokens.fontBody,
    "--theme-radius": tokens.radius,
    "--theme-background": tokens.background,
    "--theme-foreground": tokens.foreground,
    "--theme-primary": tokens.primary,
    "--theme-accent": tokens.accent,
    "--theme-dark": tokens.dark,
    "--theme-muted": tokens.muted,
    "--theme-border": tokens.border,
    "--theme-surface": tokens.surface,
  };

  return (
    <main className="business-site booking-page" style={style}>
      <header className="booking-header">
        <a className="booking-wordmark" href={`/business/${business.slug}`}>{business.name}</a>
        <nav aria-label="Booking navigation">
          <a href={`/business/${business.slug}`}>Studio</a>
          <a href={`/business/${business.slug}/my-booking`}>My booking</a>
        </nav>
      </header>
      <section className="booking-intro page-shell">
        <p className="section-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{introduction}</p>
      </section>
      <div className="booking-workspace page-shell">{children}</div>
    </main>
  );
}
