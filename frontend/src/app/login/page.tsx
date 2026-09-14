"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore, DEMO_PERSONAS, type DemoPersona } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, user: currentUser, isAuthenticated } = useAuthStore();

  // Mode: "login" or "register"
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login Form State
  const [identifier, setIdentifier] = useState("admin"); // Can be username, email, or mobile_no
  const [loginPassword, setLoginPassword] = useState("password123");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration Form State
  const [registerForm, setRegisterForm] = useState({
    full_name: "",
    username: "",
    email: "",
    mobile_no: "",
    role: "viewer",
    organization_name: "ArchScale Nexus Studio",
    password: "",
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  // Filter for demo personas in switcher
  const [personaFilter, setPersonaFilter] = useState("");

  const handleLogin = async (customIdentifier?: string, customPassword?: string) => {
    const idVal = (customIdentifier ?? identifier).trim();
    const pwVal = customPassword ?? loginPassword;
    if (!idVal || !pwVal) {
      setLoginError("Please enter your Username, Email, or Mobile No. along with your password.");
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const tokenRes = await api.auth.login({
        username_or_email: idVal,
        password: pwVal,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("archscale_token", tokenRes.access_token);
      }

      const meRes = await api.auth.me();
      setAuth(tokenRes.access_token, meRes);
      router.push("/user");
    } catch (err: any) {
      setLoginError(err?.message || "Failed to sign in. Verify your username/email/mobile and password.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError(null);
    setRegisterSuccess(null);

    if (!registerForm.full_name.trim()) {
      setRegisterError("Full name is required.");
      setRegisterLoading(false);
      return;
    }
    if (!registerForm.username.trim()) {
      setRegisterError("Username is required.");
      setRegisterLoading(false);
      return;
    }
    if (!registerForm.email.trim()) {
      setRegisterError("Email address is required.");
      setRegisterLoading(false);
      return;
    }
    if (!registerForm.mobile_no.trim()) {
      setRegisterError("Mobile number is required.");
      setRegisterLoading(false);
      return;
    }
    if (registerForm.password.length < 6) {
      setRegisterError("Password must be at least 6 characters.");
      setRegisterLoading(false);
      return;
    }

    try {
      const tokenRes = await api.auth.register({
        full_name: registerForm.full_name.trim(),
        username: registerForm.username.trim().toLowerCase(),
        email: registerForm.email.trim().toLowerCase(),
        mobile_no: registerForm.mobile_no.trim(),
        role: registerForm.role,
        organization_name: registerForm.organization_name.trim() || "ArchScale Nexus Studio",
        password: registerForm.password,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("archscale_token", tokenRes.access_token);
      }

      const meRes = await api.auth.me();
      setAuth(tokenRes.access_token, meRes);
      setRegisterSuccess("User account registered successfully! Navigating to your user profile...");
      setTimeout(() => {
        router.push("/user");
      }, 1000);
    } catch (err: any) {
      setRegisterError(err?.message || "Failed to register account. Username or email may already be in use.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleQuickPersona = (persona: DemoPersona) => {
    setIdentifier(persona.username || persona.email);
    setLoginPassword("password123");
    handleLogin(persona.username || persona.email, "password123");
  };

  const filteredPersonas = DEMO_PERSONAS.filter((p) => {
    const q = personaFilter.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.mobile_no.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic ambient backdrop glows */}
      <div className="absolute top-[-10%] left-1/4 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-[-10%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center z-10 mb-6">
        <Link href="/" className="inline-flex items-center gap-3 group mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-xl shadow-orange-500/25 flex items-center justify-center text-white font-black text-xl tracking-tighter group-hover:scale-105 transition-transform">
            AN
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">
              ArchScale <span className="text-orange-400">Nexus</span>
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mt-1">
              Identity & Access Management Portal
            </p>
          </div>
        </Link>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Centralized authentication system supporting unified user credentials: Username, Full Name, Email, and Mobile Contact.
        </p>

        {/* Current session quick banner */}
        {isAuthenticated && currentUser && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active session: <strong>{currentUser.full_name}</strong> (@{currentUser.username || "user"})</span>
            <Link href="/user" className="text-orange-400 hover:text-orange-300 font-semibold underline ml-1">
              Open /user Profile →
            </Link>
          </div>
        )}
      </div>

      {/* Main Container Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl z-10">
        <div className="bg-[#0B1120]/90 backdrop-blur-2xl border border-slate-800/90 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          {/* Top Mode Selector Tabs */}
          <div className="flex rounded-xl bg-slate-900/90 p-1.5 border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setLoginError(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "login"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>🔑</span>
              <span>Sign In (Existing User)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setRegisterError(null);
                setRegisterSuccess(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "register"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>👤</span>
              <span>Create Account (New User)</span>
            </button>
          </div>

          {/* TAB 1: SIGN IN */}
          {activeTab === "login" && (
            <div className="space-y-6">
              {loginError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2.5">
                  <span className="text-base">⚠</span>
                  <span className="flex-1">{loginError}</span>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>User Identifier</span>
                      <span className="text-orange-400 font-normal lowercase">(username, email, or mobile no.)</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                      placeholder="admin, ananya@archscale.io, or +91-98765-43211"
                    />
                    <span className="absolute left-3.5 top-3.5 text-slate-400 text-sm">👤</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter your unique username (e.g. <code>admin</code>), email, or registered phone number.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Demo default: password123</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                      placeholder="••••••••••••"
                    />
                    <span className="absolute left-3.5 top-3.5 text-slate-400 text-sm">🔒</span>
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 px-2 py-1 rounded text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showLoginPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="remember-me"
                      defaultChecked
                      className="rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-orange-500/20"
                    />
                    <label htmlFor="remember-me" className="text-xs text-slate-400 select-none">
                      Remember login on this device
                    </label>
                  </div>
                  <Link href="/user" className="text-xs text-orange-400 hover:text-orange-300 font-medium">
                    Profile Portal (/user) →
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-xl shadow-orange-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying User Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Authenticate & Enter Workspace</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>

              {/* 1-Click Fast Persona Switcher with Phone, Username, Email */}
              <div className="pt-6 border-t border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚡</span> 1-Click Role Personas
                    </span>
                    <p className="text-[11px] text-slate-500">
                      All accounts populated with username, name, email & phone
                    </p>
                  </div>
                  <input
                    type="text"
                    value={personaFilter}
                    onChange={(e) => setPersonaFilter(e.target.value)}
                    placeholder="Filter roles or phone..."
                    className="bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-full sm:w-44"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredPersonas.map((p) => {
                    const isSelected = identifier === p.username || identifier === p.email;
                    return (
                      <button
                        key={p.email}
                        type="button"
                        onClick={() => handleQuickPersona(p)}
                        disabled={loginLoading}
                        className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 group cursor-pointer ${
                          isSelected
                            ? "bg-orange-500/15 border-orange-500/50 shadow-md"
                            : "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-orange-500/30"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md`}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors truncate">
                              {p.name}
                            </p>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                              {p.role}
                            </span>
                          </div>
                          <p className="text-[10px] text-orange-400/90 font-mono mt-0.5 truncate">
                            @{p.username}
                          </p>
                          <div className="flex flex-col text-[10px] text-slate-400 font-mono mt-0.5 space-y-0.5">
                            <span className="truncate">{p.email}</span>
                            <span className="text-slate-500 flex items-center gap-1">
                              <span>📞</span>
                              <span>{p.mobile_no}</span>
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE ACCOUNT (REGISTER) */}
          {activeTab === "register" && (
            <div className="space-y-6">
              {registerError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2.5">
                  <span className="text-base">⚠</span>
                  <span className="flex-1">{registerError}</span>
                </div>
              )}

              {registerSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2.5">
                  <span className="text-base">✓</span>
                  <span className="flex-1">{registerSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={registerForm.full_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })}
                      required
                      placeholder="e.g. Vikramaditya Rao"
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Username *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={registerForm.username}
                        onChange={(e) =>
                          setRegisterForm({
                            ...registerForm,
                            username: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                          })
                        }
                        required
                        placeholder="vikram_rao"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono transition-all"
                      />
                      <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-sm">@</span>
                    </div>
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                      placeholder="vikram@archscale.io"
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all"
                    />
                  </div>

                  {/* Mobile No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Mobile Number *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={registerForm.mobile_no}
                        onChange={(e) => setRegisterForm({ ...registerForm, mobile_no: e.target.value })}
                        required
                        placeholder="+91-98765-43210"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono transition-all"
                      />
                      <span className="absolute left-3 top-2.5 text-slate-500 text-sm">📞</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Role */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      System Role *
                    </label>
                    <select
                      value={registerForm.role}
                      onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
                    >
                      <option value="admin">System Administrator (admin)</option>
                      <option value="analyst">Radar Intelligence Analyst (analyst)</option>
                      <option value="operator">Radar Operations Specialist (operator)</option>
                      <option value="viewer">Executive Observer / Viewer (viewer)</option>
                      <option value="project_manager">Senior Project Manager (project_manager)</option>
                      <option value="architect">Lead Principal Architect (architect)</option>
                      <option value="engineer">Lead Systems Engineer (engineer)</option>
                      <option value="contractor">General Contractor (contractor)</option>
                      <option value="client">Principal Client Owner (client)</option>
                      <option value="vendor">Material / Millwork Vendor (vendor)</option>
                      <option value="site_supervisor">Field Site Supervisor (site_supervisor)</option>
                    </select>
                  </div>

                  {/* Organization Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={registerForm.organization_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, organization_name: e.target.value })}
                      placeholder="ArchScale Nexus Studio"
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Account Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                      placeholder="Minimum 6 characters"
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-12 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all font-mono"
                    />
                    <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔒</span>
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-2 px-2 py-1 rounded text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showRegisterPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Password will be hashed with cryptographic SHA-256 and salt before storage.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-xl shadow-orange-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  {registerLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Registering New User Coordinates...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration & Launch Profile (/user)</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>ArchScale Nexus • Multi-Role RBAC Operating System</span>
            <div className="flex items-center gap-4">
              <Link href="/user" className="text-orange-400 hover:text-orange-300 font-mono">
                /user Profile
              </Link>
              <span>•</span>
              <Link href="/admin" className="text-slate-400 hover:text-white font-mono">
                /admin Panel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
