import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Anna by PerkOS — Your business companion",
  description:
    "Anna helps you track sales, prepare invoices, follow up on payments, and understand your business from MiniPay.",
  other: {
    "talentapp:project_verification":
      "0f06f10f203f21292eb4936326d8d5007d9956c5d2ea9cab37e1b81a46d4ee01ea1640af6cf29aaea6a10ca9f964f26cb34827197722a117423f388444ac0827",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e0716",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
