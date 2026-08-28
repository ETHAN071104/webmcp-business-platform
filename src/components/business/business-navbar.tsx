"use client";

import { useRef, useState } from "react";

import type { WebsiteSection } from "@/features/capabilities/website-sections";

type BusinessNavbarProps = {
  businessName: string;
  items: WebsiteSection[];
  contactAvailable: boolean;
};

export function BusinessNavbar({
  businessName,
  items,
  contactAvailable,
}: BusinessNavbarProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const standardLinks = items.filter(
    (item) => item.id !== "contact" && item.id !== "booking",
  );

  function openMenu() {
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function closeMenu() {
    dialogRef.current?.close();
    setOpen(false);
  }

  return (
    <header className="business-nav-wrap">
      <nav className="business-nav page-shell" aria-label="Primary navigation">
        <a className="business-wordmark" href="#top" aria-label={`${businessName} home`}>
          {businessName}
        </a>
        <div className="desktop-nav-links">
          {standardLinks.map((item) => (
            <a key={item.id} href={`#${item.id}`}>
              {item.label}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          {contactAvailable ? (
            <a className="nav-cta" href="#contact">
              Contact
            </a>
          ) : null}
          <button
            className="menu-button"
            type="button"
            aria-expanded={open}
            aria-controls="mobile-business-menu"
            onClick={openMenu}
          >
            Menu
          </button>
        </div>
      </nav>
      <dialog
        className="mobile-menu"
        id="mobile-business-menu"
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className="mobile-menu-panel">
          <div className="mobile-menu-head">
            <span>{businessName}</span>
            <button type="button" onClick={closeMenu}>
              Close
            </button>
          </div>
          <nav aria-label="Mobile navigation">
            {items.map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={closeMenu}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </dialog>
    </header>
  );
}
