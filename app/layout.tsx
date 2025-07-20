import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auromix Inventory",
  description: "Inventory & Order Management System",
  generator: "Auromix",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
