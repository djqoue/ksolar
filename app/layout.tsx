import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KSolar Quote MVP",
  description: "Thailand rooftop solar rapid quoting dashboard with transparent BOM and ROI logic.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

