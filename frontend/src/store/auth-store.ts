import { create } from "zustand";

export interface DemoPersona {
  email: string;
  username: string;
  mobile_no: string;
  name: string;
  role: string;
  title: string;
  avatarColor: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    email: "admin@archscale.io",
    username: "admin",
    mobile_no: "+1 (555) 234-5678",
    name: "Alexander Wright",
    role: "admin",
    title: "Managing Principal / Admin",
    avatarColor: "from-purple-500 to-indigo-600",
  },
  {
    email: "analyst@archscale.io",
    username: "analyst",
    mobile_no: "+1 (555) 345-6789",
    name: "Aria Chen",
    role: "analyst",
    title: "Radar Intelligence Analyst",
    avatarColor: "from-cyan-500 to-blue-600",
  },
  {
    email: "operator@archscale.io",
    username: "operator",
    mobile_no: "+1 (555) 456-7890",
    name: "Marcus Vance",
    role: "operator",
    title: "Radar Operations Specialist",
    avatarColor: "from-teal-500 to-emerald-600",
  },
  {
    email: "viewer@archscale.io",
    username: "viewer",
    mobile_no: "+1 (555) 567-8901",
    name: "Elena Rostova",
    role: "viewer",
    title: "Executive Viewer / Observer",
    avatarColor: "from-slate-500 to-zinc-600",
  },
  {
    email: "arjun@archscale.io",
    username: "arjun",
    mobile_no: "+91-98765-43218",
    name: "Arjun Reddy",
    role: "project_manager",
    title: "Senior Project Director",
    avatarColor: "from-blue-500 to-cyan-600",
  },
  {
    email: "ananya@archscale.io",
    username: "ananya",
    mobile_no: "+91-98765-43211",
    name: "Ananya Sharma",
    role: "architect",
    title: "Lead Principal Architect",
    avatarColor: "from-orange-500 to-amber-600",
  },
  {
    email: "priya@elecdesign.com",
    username: "priya",
    mobile_no: "+91-98765-43214",
    name: "Priya Nair",
    role: "engineer",
    title: "Lead Electrical & MEP Engineer",
    avatarColor: "from-emerald-500 to-teal-600",
  },
  {
    email: "deepak@buildpro.com",
    username: "deepak",
    mobile_no: "+91-98765-43215",
    name: "Deepak Singh",
    role: "contractor",
    title: "General Contractor (BuildPro)",
    avatarColor: "from-yellow-500 to-orange-600",
  },
  {
    email: "rajiv@client.com",
    username: "rajiv",
    mobile_no: "+91-98765-43210",
    name: "Rajiv Mehra",
    role: "client",
    title: "Principal Property Owner",
    avatarColor: "from-pink-500 to-rose-600",
  },
  {
    email: "amit@furnishcraft.com",
    username: "amit",
    mobile_no: "+91-98765-43216",
    name: "Amit Gupta",
    role: "vendor",
    title: "FurnishCraft Millwork Vendor",
    avatarColor: "from-violet-500 to-purple-600",
  },
  {
    email: "mohan@buildpro.com",
    username: "mohan",
    mobile_no: "+91-98765-43219",
    name: "Mohan Das",
    role: "site_supervisor",
    title: "Senior Field Site Supervisor",
    avatarColor: "from-stone-500 to-slate-600",
  },
];

export interface UserProfile {
  id: number;
  email: string;
  username?: string;
  mobile_no?: string;
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
        email: "admin@archscale.io",
        username: "admin",
        mobile_no: "+1 (555) 234-5678",
        full_name: "Alexander Wright",
        role: "admin",
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
