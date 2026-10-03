import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Header } from "@/components/header";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["400", "600", "800"] });

export const metadata: Metadata = {
  title: "Listora — Meesho listings from one photo",
  description: "Upload one product photo. Get ready-to-upload images and every Meesho listing field.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} antialiased`}>
      <body className="min-h-screen">
        <ToastProvider>
          <Header />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
