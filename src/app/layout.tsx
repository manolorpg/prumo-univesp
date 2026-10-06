import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRUMO — Gestão que acompanha seu movimento",
  description: "Agenda e frequência da clínica em um só lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
