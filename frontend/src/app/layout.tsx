import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import FloatingAIAssistant from "@/components/ai-assistant/FloatingAIAssistant";

export const metadata: Metadata = {
  title: "ArchScale Nexus — Coordination Intelligence Platform",
  description: "AI-powered coordination intelligence for architecture, construction, and project management teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-50 antialiased overflow-x-hidden">
        <Sidebar />
        <div className="md:ml-64 ml-0 min-h-screen flex flex-col pb-16 md:pb-0 transition-all duration-300">
          <Header />
          <main className="flex-1 p-3 sm:p-6 animate-fade-in max-w-full overflow-x-hidden">{children}</main>
        </div>
        <FloatingAIAssistant />
      </body>
    </html>
  );
}
