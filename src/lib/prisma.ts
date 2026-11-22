import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Defina DATABASE_URL para conectar ao PostgreSQL do Supabase.");
  }

  const ca = process.env.DATABASE_CA_CERT;
  if (!ca) return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const url = new URL(connectionString);
  // The pg URL parser otherwise replaces the explicit TLS settings.
  for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    url.searchParams.delete(parameter);
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.href, ssl: { ca, rejectUnauthorized: true } }),
  });
}

export function getPrisma() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
