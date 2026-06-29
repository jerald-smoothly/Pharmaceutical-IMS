import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const staffHash = await bcrypt.hash("staff123", 12);
  const custHash = await bcrypt.hash("customer123", 12);

  await prisma.user.upsert({
    where: { email: "admin@pharmaflow.local" },
    update: {},
    create: {
      email: "admin@pharmaflow.local",
      name: "Admin User",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@pharmaflow.local" },
    update: {},
    create: {
      email: "staff@pharmaflow.local",
      name: "Staff User",
      passwordHash: staffHash,
      role: "STAFF",
    },
  });

  const company = await prisma.company.upsert({
    where: { id: "seed-company-1" },
    update: {},
    create: {
      id: "seed-company-1",
      name: "HealthCare Distributors Inc.",
      industry: "Healthcare",
      city: "New York",
      country: "US",
      email: "orders@healthcaredist.com",
      phone: "+1-555-0100",
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: "buyer@healthcaredist.com" },
    update: {},
    create: {
      email: "buyer@healthcaredist.com",
      name: "Jane Buyer",
      passwordHash: custHash,
      role: "CUSTOMER",
    },
  });

  await prisma.contact.upsert({
    where: { email: "buyer@healthcaredist.com" },
    update: {},
    create: {
      userId: customerUser.id,
      companyId: company.id,
      firstName: "Jane",
      lastName: "Buyer",
      email: "buyer@healthcaredist.com",
      title: "Procurement Manager",
    },
  });

  console.log("✅ Seed complete");
  console.log("   Admin:    admin@pharmaflow.local / admin123");
  console.log("   Staff:    staff@pharmaflow.local / staff123");
  console.log("   Customer: buyer@healthcaredist.com / customer123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
