import Link from "next/link";
import { Badge, Button, Card, Heading, Text } from "@radix-ui/themes";

import { createSupabaseAdminRepository } from "@/features/admin/supabase-repository";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const businesses = await createSupabaseAdminRepository().listBusinesses();
  return (
    <main className="admin-home">
      <header className="admin-home-header">
        <div>
          <Text as="p" size="2" color="gray" weight="medium">Merchant workspace</Text>
          <Heading as="h1" size="8">Choose a business</Heading>
          <Text as="p" size="3" color="gray">Configure the website and agent capabilities from one source of truth.</Text>
        </div>
        <Badge color="indigo" variant="soft">Demo environment</Badge>
      </header>
      <div className="admin-business-grid">
        {businesses.map((business) => (
          <Card key={business.id} className="admin-business-card">
            <div className="admin-business-card-top">
              <div>
                <Text as="p" size="1" color="gray" weight="bold">{business.businessType.toUpperCase()}</Text>
                <Heading as="h2" size="5">{business.name}</Heading>
              </div>
              <Badge color={business.status === "published" ? "green" : "amber"}>{business.status}</Badge>
            </div>
            <Text as="p" color="gray" size="2">{business.description ?? "Business profile ready for configuration."}</Text>
            <Button asChild highContrast>
              <Link href={`/admin/business/${business.id}/template`}>Open console</Link>
            </Button>
          </Card>
        ))}
      </div>
    </main>
  );
}
