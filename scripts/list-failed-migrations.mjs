// Gibt die Namen aller fehlgeschlagenen Prisma-Migrationen aus (eine pro Zeile).
//
// Eine Migration gilt als fehlgeschlagen, wenn sie gestartet, aber weder
// abgeschlossen (finished_at) noch zurueckgerollt (rolled_back_at) wurde.
// Genau dieser Zustand fuehrt beim naechsten `prisma migrate deploy` zu
// Fehlercode P3009. Wir lesen ihn direkt aus der Verwaltungstabelle
// `_prisma_migrations`, weil die Textausgabe von `prisma migrate status`
// je nach Migrationslage nicht zuverlaessig eine "failed"-Sektion enthaelt.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT migration_name
       FROM "_prisma_migrations"
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
      ORDER BY started_at ASC`
  );
  for (const row of rows) {
    process.stdout.write(`${row.migration_name}\n`);
  }
} catch (error) {
  // Existiert die Tabelle noch nicht (allererstes Deploy) oder ist die DB
  // nicht erreichbar, gibt es nichts zu reparieren – leise mit leerer Liste
  // beenden, damit der Aufrufer den eigentlichen Fehler behandeln kann.
  process.stderr.write(`[list-failed-migrations] ${error?.message ?? error}\n`);
} finally {
  await prisma.$disconnect();
}
