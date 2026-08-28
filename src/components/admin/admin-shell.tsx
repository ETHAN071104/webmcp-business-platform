"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Text } from "@radix-ui/themes";

import { ADMIN_SECTIONS } from "@/features/admin/types";
import type { Business } from "@/types/business";

const LABELS: Record<(typeof ADMIN_SECTIONS)[number], string> = {
  template: "Overview",
  business: "Business info",
  capabilities: "Capabilities",
  services: "Services",
  staff: "Staff",
  availability: "Availability",
  content: "Content",
  appearance: "Appearance",
  preview: "Human / Agent view",
  publish: "Publish readiness",
};

export function AdminShell({ business, children }: { business: Business; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-wordmark">Relay</Link>
        <div className="admin-business-switcher">
          <Text as="p" size="1" color="gray" weight="bold">CURRENT BUSINESS</Text>
          <strong>{business.name}</strong>
          <span>{business.slug}</span>
        </div>
        <nav className="admin-nav" aria-label="Business settings">
          {ADMIN_SECTIONS.map((section) => {
            const href = `/admin/business/${business.id}/${section}`;
            return <Link key={section} href={href} data-active={pathname === href}>{LABELS[section]}</Link>;
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <Badge color={business.status === "published" ? "green" : "amber"}>{business.status}</Badge>
          <Text size="1" color="gray">Changes save to the dev repository.</Text>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div><strong>{business.name}</strong><span>Configuration console</span></div>
          <Link href={`/business/${business.slug}`} target="_blank">View published site</Link>
        </header>
        {children}
      </div>
    </div>
  );
}
