import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

import AuthProvider from "@/components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Mensajería Masiva | OWO",
  description: "Sistema de envío masivo de mensajes por WhatsApp y Email - Powered by OWO",
  keywords: ["mensajería", "masivo", "whatsapp", "email", "owo"],

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex min-h-screen bg-[#FAFBFC]">
            <Sidebar />
            <main className="flex-1 relative overflow-hidden">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
