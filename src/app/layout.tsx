import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deepest Dive",
  description: "2D Zelda-like online RPG",
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
