import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { DocumentScrollbar } from "./_components/DocumentScrollbar.tsx";
import { LOCALE_HEADER } from "./_lib/application.ts";
import { localeFrom } from "./_lib/locale.ts";
import { message } from "./_lib/i18n.ts";
import "./globals.css";

async function requestLocale() {
  return localeFrom((await headers()).get(LOCALE_HEADER));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  return {
    title: message(locale, "grossToNet"),
    description: message(locale, "metadataDescription"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0c0b" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await requestLocale();

  return (
    <html lang={locale}>
      {/* The document owns the one vertical journey from profile to sources. */}
      <body className="min-h-dvh antialiased">
        {children}
        <DocumentScrollbar label={message(locale, "pageScroll")} />
      </body>
    </html>
  );
}
