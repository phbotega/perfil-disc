const BASE = process.env.SMOKE_URL || "http://localhost:3123";

let falhas = 0;
function check(nome, cond, extra = "") {
  if (cond) console.log(`  ok   ${nome}`);
  else {
    falhas++;
    console.log(`  FALHA ${nome} ${extra}`);
  }
}

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

(async () => {
  console.log(`Smoke test em ${BASE}`);

  const criada = await req("POST", "/api/sessoes", { origem: "smoke", dispositivo: "desktop" });
  check("POST /api/sessoes cria 201", criada.status === 201, `status=${criada.status}`);
  const id = criada.json?.sessaoId;
  check("retorna sessaoId", typeof id === "string" && id.length > 10);
  if (!id) process.exit(1);

  const inicial = await req("GET", `/api/sessoes/${id}`);
  check("GET sessao 200", inicial.status === 200, `status=${inicial.status}`);
  check("plano.base tem 32 itens", inicial.json?.plano?.base?.length === 32);
  check("plano.expectativa tem 32 itens", inicial.json?.plano?.expectativa?.length === 32);
  check("status inicial = iniciada", inicial.json?.sessao?.status === "iniciada");
  check("sem respostas ainda", inicial.json?.respostas?.length === 0);

  const base = inicial.json.plano.base;
  const exp = inicial.json.plano.expectativa;

  const expCedo = await req("POST", `/api/sessoes/${id}/respostas`, {
    itemCodigo: exp[0],
    simbolo: "++",
    tempoMs: 1200,
  });
  check("expectativa antes da transicao -> 409", expCedo.status === 409, `status=${expCedo.status}`);

  const simboloRuim = await req("POST", `/api/sessoes/${id}/respostas`, {
    itemCodigo: base[0],
    simbolo: "+++",
    tempoMs: 900,
  });
  check("simbolo invalido -> 400", simboloRuim.status === 400, `status=${simboloRuim.status}`);

  const r1 = await req("POST", `/api/sessoes/${id}/respostas`, { itemCodigo: base[0], simbolo: "++", tempoMs: 1400 });
  check("resposta base #1 aceita", r1.status === 200 || r1.status === 201, `status=${r1.status}`);
  check("status avancou para base", r1.json?.status === "base", `status=${r1.json?.status}`);

  const r2 = await req("POST", `/api/sessoes/${id}/respostas`, { itemCodigo: base[1], simbolo: "--", tempoMs: 1100 });
  check("resposta base #2 aceita", r2.status === 200 || r2.status === 201);

  const volta = await req("POST", `/api/sessoes/${id}/respostas`, { itemCodigo: base[0], simbolo: "=", tempoMs: 700 });
  check("re-resposta (voltar) aceita e nao regride", volta.status === 200 || volta.status === 201);

  const trans = await req("POST", `/api/sessoes/${id}/transicao`);
  check("POST /transicao promove status", trans.status === 200, `status=${trans.status}`);
  check("status agora = transicao", trans.json?.status === "transicao", `status=${trans.json?.status}`);

  const e1 = await req("POST", `/api/sessoes/${id}/respostas`, { itemCodigo: exp[0], simbolo: "+", tempoMs: 1000 });
  check("resposta expectativa aceita apos transicao", e1.status === 200 || e1.status === 201, `status=${e1.status}`);
  check("status agora = expectativa", e1.json?.status === "expectativa", `status=${e1.json?.status}`);

  const patch = await req("PATCH", `/api/sessoes/${id}`, { nome: "Smoke", identidade: "Dev" });
  check("PATCH /api/sessoes/[id] atualiza dados", patch.status === 200, `status=${patch.status}`);

  const final = await req("GET", `/api/sessoes/${id}`);
  check("GET final reflete 3 itens distintos (upsert)", final.json?.respostas?.length === 3, `n=${final.json?.respostas?.length}`);
  check("nome salvo", final.json?.sessao?.nome === "Smoke");

  const inexistente = await req("GET", "/api/sessoes/00000000-0000-4000-8000-000000000000");
  check("sessao inexistente -> 404", inexistente.status === 404, `status=${inexistente.status}`);

  console.log(falhas === 0 ? "\nSMOKE OK" : `\nSMOKE COM ${falhas} FALHA(S)`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => {
  console.error("erro no smoke:", e);
  process.exit(1);
});