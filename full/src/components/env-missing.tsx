export function EnvMissing() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-lg font-semibold text-foreground">Configure env</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Copy{" "}
        <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
          .env.example
        </code>{" "}
        to{" "}
        <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
          .env.local
        </code>{" "}
        and set the agent id and API base.
      </p>
    </main>
  );
}
