import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const dmSans = localFont({
  src: "./fonts/dm-sans.woff2",
  weight: "400 700",
  variable: "--font-dm-sans",
  display: "swap",
});

const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces.woff2", weight: "600", style: "normal" },
    { path: "./fonts/fraunces-italic.woff2", weight: "600", style: "italic" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clube do Ovo",
  description: "Crie seu clube do livro, entre com um convite e acompanhe suas leituras em grupo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
