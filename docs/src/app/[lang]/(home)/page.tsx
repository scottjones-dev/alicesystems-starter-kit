import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Braces,
  Database,
  Gauge,
  Globe,
  Languages,
  Layers,
  Mail,
  Palette,
  ShieldCheck,
  Smartphone,
  Terminal,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyCommand } from "@/components/home/copy-command";
import { i18n } from "@/lib/i18n";
import { githubRepoUrl } from "@/lib/shared";

interface Card {
  body: string;
  href: string;
  icon: LucideIcon;
  title: string;
}

const apps: readonly Card[] = [
  {
    body: "Next.js marketing site.",
    href: "/docs/apps/website",
    icon: Globe,
    title: "Website",
  },
  {
    body: "Next.js signed-in product.",
    href: "/docs/apps/platform",
    icon: Layers,
    title: "Platform",
  },
  {
    body: "Expo with NativeWind.",
    href: "/docs/apps/native",
    icon: Smartphone,
    title: "Native",
  },
  {
    body: "Hono. The only door to data.",
    href: "/docs/apps/api",
    icon: Terminal,
    title: "API",
  },
];

const packages: readonly Card[] = [
  {
    body: "Define each variable once. Validated at startup, never leaked into a browser bundle.",
    href: "/docs/packages/env",
    icon: ShieldCheck,
    title: "Typed environment",
  },
  {
    body: "Drizzle on PostgreSQL with real transactions, migrations and database-level checks.",
    href: "/docs/packages/db",
    icon: Database,
    title: "Database",
  },
  {
    body: "One error shape for every API response, with privacy rules for Sentry.",
    href: "/docs/packages/errors",
    icon: Braces,
    title: "Errors",
  },
  {
    body: "Shared shadcn components and design tokens, browsed in Storybook.",
    href: "/docs/packages/ui",
    icon: Palette,
    title: "UI kit",
  },
  {
    body: "Transactional email templates with a local Mailpit inbox.",
    href: "/docs/packages/emails",
    icon: Mail,
    title: "Emails",
  },
  {
    body: "Notifications through Novu, with a tunnel for local workflows.",
    href: "/docs/packages/notifications",
    icon: Bell,
    title: "Notifications",
  },
  {
    body: "Translations shared between the website and the native app.",
    href: "/docs/packages/internationalization",
    icon: Languages,
    title: "Internationalization",
  },
  {
    body: "Errors, traces and logs wired into every app.",
    href: "/docs/packages/observability",
    icon: Gauge,
    title: "Observability",
  },
];

const roadmap = [
  {
    body: "Pick apps, packages and infra, then generate a ready-to-run monorepo with a .env that needs no accounts.",
    command: "init",
    title: "Scaffold",
  },
  {
    body: "Generate tables from a schema, with the migration and typed client already wired.",
    command: "add db",
    title: "Database",
  },
  {
    body: "Generate API routers and the pages that call them, following the project conventions.",
    command: "add router",
    title: "Routers and pages",
  },
] as const;

const cardClass = "rounded-lg border p-4 transition-colors hover:bg-fd-accent";

// The text is English in every language, so every language's home page names the English one
// as the original. Otherwise search engines would see six copies competing.
export const metadata: Metadata = {
  alternates: { canonical: `/${i18n.defaultLanguage}` },
};

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  // Docs links are written without a language; this adds the visitor's.
  const withLang = (href: string) => `/${lang}${href}`;

  return (
    <main className="flex flex-1 flex-col">
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--color-fd-primary)_14%,transparent),transparent)]"
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
          <span className="rounded-full border bg-fd-card px-3 py-1 text-fd-muted-foreground text-xs">
            Next.js · Expo · Hono · Postgres
          </span>
          <h1 className="text-balance font-bold text-4xl tracking-tight sm:text-6xl">
            Start the product,
            <br />
            <span className="text-fd-primary">not the plumbing.</span>
          </h1>
          <p className="max-w-2xl text-balance text-fd-muted-foreground sm:text-lg">
            StarterKit is a monorepo with a website, a mobile app and an API
            already wired to accounts, a database, emails, analytics and error
            reporting. These docs explain how it is built and why.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              className="rounded-md bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground text-sm transition-opacity hover:opacity-90"
              href={withLang("/docs/setup/quickstart")}
            >
              Quickstart
            </Link>
            <Link
              className="rounded-md border px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fd-accent"
              href={withLang("/docs")}
            >
              Read the docs
            </Link>
            <a
              className="rounded-md border px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fd-accent"
              href={githubRepoUrl}
              rel="noopener"
              target="_blank"
            >
              GitHub
            </a>
          </div>
          <CopyCommand command="pnpm setup:local && pnpm dev:local" />
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <div className="overflow-hidden rounded-xl border bg-fd-card shadow-sm">
          <div className="flex items-center gap-1.5 border-b px-4 py-3">
            <span className="size-3 rounded-full bg-red-400/70" />
            <span className="size-3 rounded-full bg-yellow-400/70" />
            <span className="size-3 rounded-full bg-green-400/70" />
            <span className="ml-3 text-fd-muted-foreground text-xs">
              local setup, no accounts needed
            </span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-sm leading-7">
            <code>
              <span className="text-fd-muted-foreground">$ </span>pnpm
              setup:local{"\n"}
              <span className="text-fd-muted-foreground">$ </span>pnpm infra:up
              {"\n"}
              <span className="text-fd-muted-foreground">$ </span>pnpm
              db:migrate:local{"\n"}
              <span className="text-fd-muted-foreground">$ </span>pnpm dev:local
            </code>
          </pre>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <h2 className="mb-2 text-center font-semibold text-2xl">
          Four apps, one API
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-center text-fd-muted-foreground">
          Web and native talk to the API. The API is the only thing that touches
          the database and storage.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {apps.map(({ body, href, icon: Icon, title }) => (
            <Link className={cardClass} href={withLang(href)} key={href}>
              <Icon className="mb-3 text-fd-primary" size={20} />
              <h3 className="font-medium">{title}</h3>
              <p className="text-fd-muted-foreground text-sm">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y bg-fd-card/40">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <h2 className="mb-2 text-center font-semibold text-2xl">
            Batteries included
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-center text-fd-muted-foreground">
            Every package explains what it is, why it exists and the trade-offs
            behind it.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map(({ body, href, icon: Icon, title }) => (
              <Link
                className={`${cardClass} bg-fd-background`}
                href={withLang(href)}
                key={href}
              >
                <Icon className="mb-3 text-fd-primary" size={20} />
                <h3 className="mb-1 font-medium">{title}</h3>
                <p className="text-fd-muted-foreground text-sm">{body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="mb-8 text-center">
          <span className="rounded-full border px-3 py-1 text-fd-muted-foreground text-xs">
            On the roadmap
          </span>
          <h2 className="mt-4 mb-2 font-semibold text-2xl">
            A CLI to build it for you
          </h2>
          <p className="mx-auto max-w-xl text-fd-muted-foreground">
            The goal is to turn this template into a generator: init a project,
            then keep adding to it. Not built yet.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {roadmap.map(({ body, command, title }) => (
            <div className="rounded-lg border p-4" key={command}>
              <code className="mb-3 inline-block rounded bg-fd-secondary px-2 py-1 font-mono text-xs">
                starterkit {command}
              </code>
              <h3 className="mb-1 font-medium">{title}</h3>
              <p className="text-fd-muted-foreground text-sm">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
