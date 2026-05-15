export default function HomePage() {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight">🦎 Freescale</h1>
        <p className="mt-3 text-zinc-500">
          The new app is being scaffolded here. UI migration from <code>index.html</code> in progress.
        </p>
        <p className="mt-6 text-xs text-zinc-400">
          See <a href="/inbox" className="text-indigo-600 underline">/inbox</a> when ready.
        </p>
      </div>
    </main>
  );
}
