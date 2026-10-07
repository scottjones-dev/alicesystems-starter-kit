import { app } from "@repo/config/app";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="font-semibold text-4xl tracking-tight">
        {app.name} platform
      </h1>
      <p className="text-lg text-zinc-600">
        The signed-in app. Sign-in arrives with the auth package.
      </p>
    </main>
  );
}
