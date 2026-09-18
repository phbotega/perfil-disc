export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">
        Mapeamento comportamental DISC
      </h1>
      <p className="max-w-md text-sm text-neutral-600">
        64 afirmações, dois perfis: quem você é e o que pedem de você.
      </p>
      <a
        href="/questionario"
        className="mt-4 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white active:scale-95"
      >
        Começar o mapeamento
      </a>
      <p className="text-xs text-neutral-400">Etapa 2 — fluxo do questionário.</p>
    </main>
  );
}