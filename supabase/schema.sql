-- ============================================================
-- Perfil DISC — Mapeamento Comportamental
-- Schema para Supabase (PostgreSQL 15+).
-- Gerado pelo Drizzle (migração 0000_inicial). Pode ser colado
-- no SQL Editor do Supabase Dashboard, ou sincronizado via
-- `pnpm db:push` com a DATABASE_URL do pooler (modo transacional).
--
-- Aviso de conformidade: o produto é ferramenta de mapeamento
-- comportamental para autoconhecimento, não avaliação psicológica.
-- O schema não contém dados clínicos.
-- ============================================================

CREATE TYPE "public"."contexto" AS ENUM('base', 'expectativa');--> statement-breakpoint
CREATE TYPE "public"."fator" AS ENUM('D', 'I', 'S', 'C');--> statement-breakpoint
CREATE TYPE "public"."status_pedido" AS ENUM('pendente', 'pago', 'falhou', 'estornado');--> statement-breakpoint
CREATE TYPE "public"."status_sessao" AS ENUM('iniciada', 'base', 'transicao', 'expectativa', 'capturada', 'paga', 'concluida', 'abandonada');--> statement-breakpoint
CREATE TABLE "public"."empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"codigo" text NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresas_codigo_unique" UNIQUE("codigo")
);--> statement-breakpoint
CREATE TABLE "public"."itens" (
	"codigo" text PRIMARY KEY NOT NULL,
	"contexto" "public"."contexto" NOT NULL,
	"fator" "public"."fator" NOT NULL,
	"afirmacao" text NOT NULL,
	"reverso" boolean NOT NULL,
	"versao_banco" integer NOT NULL
);--> statement-breakpoint
CREATE TABLE "public"."leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"nome" text,
	"email" text NOT NULL,
	"telefone" text,
	"consentimento_lgpd_em" timestamp with time zone DEFAULT now() NOT NULL,
	"consentimento_marketing" boolean DEFAULT false NOT NULL,
	"relatorio_gratuito_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_sessao_id_unique" UNIQUE("sessao_id")
);--> statement-breakpoint
CREATE TABLE "public"."normas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contexto" "public"."contexto" NOT NULL,
	"fator" "public"."fator" NOT NULL,
	"media" numeric(6, 3) NOT NULL,
	"desvio" numeric(6, 3) NOT NULL,
	"n" integer NOT NULL,
	"provisoria" boolean NOT NULL,
	"vigente" boolean NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "public"."pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"moeda" text DEFAULT 'BRL' NOT NULL,
	"status" "public"."status_pedido" DEFAULT 'pendente' NOT NULL,
	"provedor" text NOT NULL,
	"referencia" text,
	"pago_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "public"."respostas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"item_codigo" text NOT NULL,
	"contexto" "public"."contexto" NOT NULL,
	"fator" "public"."fator" NOT NULL,
	"simbolo" text NOT NULL,
	"valor_bruto" smallint NOT NULL,
	"valor_computado" smallint NOT NULL,
	"reverso" boolean NOT NULL,
	"tempo_ms" integer NOT NULL,
	"respondida_em" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "public"."resultados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"dominante" "public"."fator" NOT NULL,
	"secundario" "public"."fator",
	"perfil_combinado" boolean NOT NULL,
	"padrao_codigo" text NOT NULL,
	"padrao_nome" text NOT NULL,
	"itp" integer NOT NULL,
	"itp_classificacao" text NOT NULL,
	"norma_provisoria" boolean NOT NULL,
	"base_json" jsonb NOT NULL,
	"expectativa_json" jsonb NOT NULL,
	"deltas_json" jsonb NOT NULL,
	"qualidade_json" jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resultados_sessao_id_unique" UNIQUE("sessao_id")
);--> statement-breakpoint
CREATE TABLE "public"."sentencas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fator" "public"."fator",
	"faixa" text,
	"secao" text NOT NULL,
	"chave" text NOT NULL,
	"texto" text NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "public"."sessoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid,
	"status" "public"."status_sessao" DEFAULT 'iniciada' NOT NULL,
	"etapa_atual" integer DEFAULT 0 NOT NULL,
	"nome" text,
	"identidade" text,
	"dispositivo" text,
	"origem" text,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"concluida_em" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_sessao_id_sessoes_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."pedidos" ADD CONSTRAINT "pedidos_sessao_id_sessoes_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."pedidos" ADD CONSTRAINT "pedidos_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."respostas" ADD CONSTRAINT "respostas_sessao_id_sessoes_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."respostas" ADD CONSTRAINT "respostas_item_codigo_itens_codigo_fk" FOREIGN KEY ("item_codigo") REFERENCES "public"."itens"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."resultados" ADD CONSTRAINT "resultados_sessao_id_sessoes_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."sessoes" ADD CONSTRAINT "sessoes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "itens_ctx_fator_idx" ON "public"."itens" USING btree ("contexto","fator");--> statement-breakpoint
CREATE UNIQUE INDEX "normas_ctx_fator_vigente_idx" ON "public"."normas" USING btree ("contexto","fator","vigente");--> statement-breakpoint
CREATE UNIQUE INDEX "respostas_sessao_item_idx" ON "public"."respostas" USING btree ("sessao_id","item_codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "sentencas_chave_idx" ON "public"."sentencas" USING btree ("chave");--> statement-breakpoint

-- Nota: em futuras migrações de conteúdo (itens e normas), use
-- explicitamente UPDATE + INSERT com controle de versão em vez de
-- ALTER de tipo de enum. No Postgres, adicionar valores a enums não
-- é permissionado em transações com pooler em modo session às vezes;
-- se necessário, recrie o tipo.