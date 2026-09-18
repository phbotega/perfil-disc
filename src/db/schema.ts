import {
  boolean,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const statusSessao = pgEnum("status_sessao", [
  "iniciada",
  "base",
  "transicao",
  "expectativa",
  "capturada",
  "paga",
  "concluida",
  "abandonada",
]);

export const statusPedido = pgEnum("status_pedido", [
  "pendente",
  "pago",
  "falhou",
  "estornado",
]);

export const contextoEnum = pgEnum("contexto", ["base", "expectativa"]);

export const fatorEnum = pgEnum("fator", ["D", "I", "S", "C"]);

export const empresas = pgTable("empresas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  codigo: text("codigo").notNull().unique(),
  criadaEm: timestamp("criada_em", { withTimezone: true }).defaultNow().notNull(),
});

export const itens = pgTable(
  "itens",
  {
    codigo: text("codigo").primaryKey(),
    contexto: contextoEnum("contexto").notNull(),
    fator: fatorEnum("fator").notNull(),
    afirmacao: text("afirmacao").notNull(),
    reverso: boolean("reverso").notNull(),
    versaoBanco: integer("versao_banco").notNull(),
  },
  (t) => [index("itens_ctx_fator_idx").on(t.contexto, t.fator)],
);

export const sessoes = pgTable("sessoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id").references(() => empresas.id),
  status: statusSessao("status").notNull().default("iniciada"),
  etapaAtual: integer("etapa_atual").notNull().default(0),
  nome: text("nome"),
  identidade: text("identidade"),
  dispositivo: text("dispositivo"),
  origem: text("origem"),
  criadaEm: timestamp("criada_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadaEm: timestamp("atualizada_em", { withTimezone: true }).defaultNow().notNull(),
  concluidaEm: timestamp("concluida_em", { withTimezone: true }),
});

export const respostas = pgTable(
  "respostas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessaoId: uuid("sessao_id")
      .notNull()
      .references(() => sessoes.id, { onDelete: "cascade" }),
    itemCodigo: text("item_codigo")
      .notNull()
      .references(() => itens.codigo),
    contexto: contextoEnum("contexto").notNull(),
    fator: fatorEnum("fator").notNull(),
    simbolo: text("simbolo").notNull(),
    valorBruto: smallint("valor_bruto").notNull(),
    valorComputado: smallint("valor_computado").notNull(),
    reverso: boolean("reverso").notNull(),
    tempoMs: integer("tempo_ms").notNull(),
    respondidaEm: timestamp("respondida_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("respostas_sessao_item_idx").on(t.sessaoId, t.itemCodigo)],
);

export const resultados = pgTable("resultados", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessaoId: uuid("sessao_id")
    .notNull()
    .unique()
    .references(() => sessoes.id),
  dominante: fatorEnum("dominante").notNull(),
  secundario: fatorEnum("secundario"),
  perfilCombinado: boolean("perfil_combinado").notNull(),
  padraoCodigo: text("padrao_codigo").notNull(),
  padraoNome: text("padrao_nome").notNull(),
  itp: integer("itp").notNull(),
  itpClassificacao: text("itp_classificacao").notNull(),
  normaProvisoria: boolean("norma_provisoria").notNull(),
  baseJson: jsonb("base_json").notNull(),
  expectativaJson: jsonb("expectativa_json").notNull(),
  deltasJson: jsonb("deltas_json").notNull(),
  qualidadeJson: jsonb("qualidade_json").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessaoId: uuid("sessao_id")
    .notNull()
    .unique()
    .references(() => sessoes.id),
  nome: text("nome"),
  email: text("email").notNull(),
  telefone: text("telefone"),
  consentimentoLgpdEm: timestamp("consentimento_lgpd_em", { withTimezone: true })
    .defaultNow()
    .notNull(),
  consentimentoMarketing: boolean("consentimento_marketing").notNull().default(false),
  relatorioGratuitoEm: timestamp("relatorio_gratuito_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const normas = pgTable(
  "normas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contexto: contextoEnum("contexto").notNull(),
    fator: fatorEnum("fator").notNull(),
    media: numeric("media", { precision: 6, scale: 3 }).notNull(),
    desvio: numeric("desvio", { precision: 6, scale: 3 }).notNull(),
    n: integer("n").notNull(),
    provisoria: boolean("provisoria").notNull(),
    vigente: boolean("vigente").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("normas_ctx_fator_vigente_idx").on(t.contexto, t.fator, t.vigente)],
);

export const pedidos = pgTable("pedidos", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessaoId: uuid("sessao_id")
    .notNull()
    .references(() => sessoes.id),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  moeda: text("moeda").notNull().default("BRL"),
  status: statusPedido("status").notNull().default("pendente"),
  provedor: text("provedor").notNull(),
  referencia: text("referencia"),
  pagoEm: timestamp("pago_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const sentencas = pgTable(
  "sentencas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fator: fatorEnum("fator"),
    faixa: text("faixa"),
    secao: text("secao").notNull(),
    chave: text("chave").notNull(),
    texto: text("texto").notNull(),
    ativa: boolean("ativa").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("sentencas_chave_idx").on(t.chave)],
);