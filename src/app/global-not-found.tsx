import type { Metadata } from "next";
import { inter } from "./fonts";
import "./globals.css";

export const metadata: Metadata = { title: "404" };

/** 404 for unmatched URLs and for everything the proxy hides (internal paths, staff admin). */
export default function GlobalNotFound() {
  return (
    <html lang="de" className={inter.variable}>
      <body className="flex min-h-dvh items-center justify-center bg-surface-2 px-4">
        <main className="flex max-w-md flex-col items-center gap-3 text-center">
          <p className="text-h1 text-coral">404</p>
          <h1 className="text-xl font-bold">Seite nicht gefunden · Page not found</h1>
          <a href="/" className="font-semibold text-accent-text hover:underline">
            Startseite · Home
          </a>
        </main>
      </body>
    </html>
  );
}
