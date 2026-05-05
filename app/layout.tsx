import RootLayoutClient from "./RootLayoutClient";
import { metadata, viewport } from "./layout-metadata";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export { metadata, viewport };

/** Avoids React 19 + App Router metadata streaming mismatches in dev (whitespace in the head slot). */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
