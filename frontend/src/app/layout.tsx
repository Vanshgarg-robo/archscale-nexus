import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArchScale Nexus",
  description: "Coordination intelligence for architecture and construction teams",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
