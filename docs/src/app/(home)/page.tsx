import Link from "next/link";

const highlights = [
  {
    body: "Define each environment variable once. It is validated at startup and never leaks to a browser bundle.",
    href: "/docs/packages/env",
    title: "Environment",
  },
  {
    body: "One error shape for every API response, with privacy rules for Sentry.",
    href: "/docs/packages/errors",
    title: "Errors",
  },
  {
    body: "Drizzle on PostgreSQL with real transactions and database-level checks.",
    href: "/docs/packages/db",
    title: "Database",
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <section className="text-center">
        <h1 className="mb-4 font-bold text-4xl">StarterKit developer docs</h1>
        <p className="mx-auto mb-6 max-w-2xl text-fd-muted-foreground">
          A monorepo starter with a Next.js site, an Expo app and a Hono API
          already wired together. These docs explain how it is built and why.
        </p>
        <Link
          className="inline-block rounded-md bg-fd-primary px-5 py-2 font-medium text-fd-primary-foreground"
          href="/docs"
        >
          Read the docs
        </Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {highlights.map((item) => (
          <Link
            className="rounded-lg border p-4 transition-colors hover:bg-fd-accent"
            href={item.href}
            key={item.href}
          >
            <h2 className="mb-2 font-semibold">{item.title}</h2>
            <p className="text-fd-muted-foreground text-sm">{item.body}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
