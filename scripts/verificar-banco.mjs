import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const { rows } = await pool.query(`
  select
    (select count(*) from itens) as itens,
    (select count(*) from normas) as normas,
    (select count(*) from sessoes) as sessoes,
    (select count(*) from respostas) as respostas
`);
console.log("contagens:", rows[0]);
const tab = await pool.query(`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name
`);
console.log("tabelas:", tab.rows.map((r) => r.table_name).join(", "));
await pool.end();