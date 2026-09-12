"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore, DEMO_PERSONAS, type DemoPersona } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("ananya@archscale.io");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const e = loginEmail || email;
    const p = loginPassword || password;
    if (!e || !p) return;

    setLoading(true);
    setError(null);

    try {
      const tokenRes = await api.auth.login({ email: e, password: p });
      if (typeof window !== "undefined") {
        localStorage.setItem("archscale_token", tokenRes.access_token);
      }
      const meRes = await api.auth.me();
      setAuth(tokenRes.access_token, meRes);
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Failed to sign in. Verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPersona = (persona: DemoPersona) => {
    setEmail(persona.email);
    setPassword("password123");
    handleLogin(persona.email, "password123");
  };

  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20 mb-4">
          <span className="text-white font-black text-xl tracking-tighter">AN</span>
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">ArchScale Nexus</h2>
        <p className="mt-1 text-sm text-slate-400 font-medium">
          Coordination Intelligence Operating System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div className="bg-[#0B1120]/90 backdrop-blur-xl border border-slate-800/80 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Work Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                placeholder="name@archscale.io"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Authenticating Session..." : "Sign In to Workspace"}
            </button>
          </form>

          {/* 1-Click Demo Persona Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                ⚡ 1-Click Demo Personas
              </span>
              <span className="text-[11px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded font-mono">
                Pre-configured RBAC
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Click any role to instantaneously authenticate and experience the coordination engine from that perspective:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {DEMO_PERSONAS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => handleQuickPersona(p)}
                  disabled={loading}
                  className="text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-orange-500/40 transition-all flex items-center gap-2.5 group cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow`}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors truncate">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{p.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-600">
          ArchScale Nexus • Multi-Tenant Architecture • Role-Based Access Control • Gemini AI Powered
        </div>
      </div>
    </div>
  );
}
