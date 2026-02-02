import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triumph Synergy",
  description: "Pi Network App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
