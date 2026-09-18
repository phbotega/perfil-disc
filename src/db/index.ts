import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Banco = NodePgDatabase<typeof schema>;

let _pool: Pool | null = null;

export function obterPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/perfil_disc",
    });
  }
  return _pool;
}

export function banco(): Banco {
  return drizzle(obterPool(), { schema });
}

export async function fechar(): Promise<void> {
  await _pool?.end();
  _pool = null;
}