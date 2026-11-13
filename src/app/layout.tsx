import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Que capa serve no meu sofá? | Plurata",
  description: "Indique as medidas do seu sofá e receba as capas Plurata aconselhadas, no tamanho certo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
