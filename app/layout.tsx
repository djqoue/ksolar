import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { LOCALE_COOKIE_NAME, resolveAppLocale, type AppLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ksolar.top"),
  applicationName: "KSolar",
  title: {
    default: "KSolar",
    template: "%s | KSolar",
  },
  description: "Thailand rooftop solar rapid quoting dashboard with transparent BOM and ROI logic.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KSolar",
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  icons: {
    icon: [
      { url: "/icons/ksolar-icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/ksolar-icon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

const HTML_LANGUAGE: Record<AppLocale, string> = {
  en: "en",
  zh: "zh-CN",
  th: "th",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return (
    <html lang={HTML_LANGUAGE[locale]}>
      <body>{children}</body>
    </html>
  );
}
