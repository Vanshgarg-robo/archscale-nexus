import { create } from "zustand";

export interface DemoPersona {
  email: string;
  name: string;
  role: string;
  title: string;
  avatarColor: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    email: "admin@archscale.io",
    name: "Alexander Wright",
    role: "admin",
    title: "Managing Principal / Admin",
    avatarColor: "from-purple-500 to-indigo-600",
  },
  {
    email: "arjun@archscale.io",
    name: "Arjun Reddy",
    role: "project_manager",
    title: "Senior Project Director",
    avatarColor: "from-blue-500 to-cyan-600",
  },
  {
    email: "ananya@archscale.io",
    name: "Ananya Sharma",
    role: "architect",
    title: "Lead Principal Architect",
    avatarColor: "from-orange-500 to-amber-600",
  },
  {
    email: "priya@elecdesign.com",
    name: "Priya Nair",
    role: "engineer",
    title: "Lead Electrical & MEP Engineer",
    avatarColor: "from-emerald-500 to-teal-600",
  },
  {
    email: "deepak@buildpro.com",
    name: "Deepak Singh",
    role: "contractor",
    title: "General Contractor (BuildPro)",
    avatarColor: "from-yellow-500 to-orange-600",
  },
  {
    email: "rajiv@client.com",
    name: "Rajiv Mehra",
    role: "client",
    title: "Principal Property Owner",
    avatarColor: "from-pink-500 to-rose-600",
  },
  {
    email: "amit@furnishcraft.com",
    name: "Amit Gupta",
    role: "vendor",
    title: "FurnishCraft Millwork Vendor",
    avatarColor: "from-violet-500 to-purple-600",
  },
  {
    email: "mohan@buildpro.com",
    name: "Mohan Das",
    role: "site_supervisor",
    title: "Senior Field Site Supervisor",
    avatarColor: "from-stone-500 to-slate-600",
  },
];

interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: string;
  organization_id: number;
  organization_name?: string;
  avatar_url?: string;
  is_active: boolean;
  stakeholder_id?: number;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("archscale_token") : null,
  user: typeof window !== "undefined" && localStorage.getItem("archscale_user")
    ? JSON.parse(localStorage.getItem("archscale_user")!)
    : {
        id: 1,
        email: "ananya@archscale.io",
        full_name: "Ananya Sharma",
        role: "architect",
        organization_id: 1,
        organization_name: "ArchScale Design Studio",
        is_active: true,
      },
  isAuthenticated: true,

  setAuth: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("archscale_token", token);
      localStorage.setItem("archscale_user", JSON.stringify(user));
    }
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("archscale_token");
      localStorage.removeItem("archscale_user");
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  initFromStorage: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("archscale_token");
      const userStr = localStorage.getItem("archscale_user");
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ token, user, isAuthenticated: true });
        } catch {
          // fallback to default
        }
      }
    }
  },
}));
