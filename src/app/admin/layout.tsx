import "@radix-ui/themes/styles.css";

import { Theme } from "@radix-ui/themes";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Theme accentColor="indigo" grayColor="slate" radius="medium" scaling="95%">
      <div className="admin-root">{children}</div>
    </Theme>
  );
}
