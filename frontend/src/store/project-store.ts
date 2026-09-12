import { create } from "zustand";

interface ProjectStore {
  currentProjectId: number;
  setCurrentProjectId: (id: number) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProjectId: 1,
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
}));
