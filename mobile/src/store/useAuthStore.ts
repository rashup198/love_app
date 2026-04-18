import { create } from 'zustand';
import ENV from '../config';
import type { User, Couple } from '../types';
import api from '../api/client';

interface AppState {
  user: User | null;
  couple: Couple | null;
  isHydrated: boolean;
  isHydrating: boolean;

  setAuthData: (data: { user: User; couple?: Couple | null }) => void;
  setCouple: (couple: Couple) => void;
  clearCouple: () => void;
  updateUser: (patch: Partial<User>) => void;
  clearAuth: () => void;

  fetchUserData: () => Promise<void>;
}

let hydrationPromise: Promise<void> | null = null;

const useAppStore = create<AppState>((set, get) => ({
  user: null,
  couple: null,
  isHydrated: false,
  isHydrating: false,

  setAuthData: (data) => {
    set({
      user: data.user,
      couple: data.couple ?? get().couple,
      isHydrated: true,
      isHydrating: false,
    });
  },

  setCouple: (couple) => {
    set({ couple });
    const user = get().user;
    if (user) {
      set({ user: { ...user, coupleId: couple.id } });
    }
  },

  clearCouple: () => {
    set({ couple: null });
    const user = get().user;
    if (user) {
      set({ user: { ...user, coupleId: null } });
    }
  },

  updateUser: (patch) => {
    const user = get().user;
    if (user) {
      set({ user: { ...user, ...patch } });
    }
  },

  clearAuth: () => {
    set({
      user: null,
      couple: null,
      isHydrated: true,
      isHydrating: false,
    });
  },

  fetchUserData: async () => {
    if (hydrationPromise) return hydrationPromise;
    const state = get();
    if (state.isHydrating) return;

    hydrationPromise = (async () => {
      set({ isHydrating: true });
      try {
        const result = await api.get<{
          user: User;
          couple: Couple | null;
        }>('/users/me');

        // api.get already unwraps the { success, data } envelope via interceptor
        // so `result` IS the data object itself
        const userData = (result as any).user ?? result;
        const coupleData = (result as any).couple ?? null;

        set({
          user: userData,
          couple: coupleData,
          isHydrated: true,
          isHydrating: false,
        });
      } catch (e) {
        console.error("Failed to fetch user data", e);
        set({ isHydrated: true, isHydrating: false });
      } finally {
        hydrationPromise = null;
      }
    })();

    return hydrationPromise;
  },
}));

export const selectNeedsOnboarding = (state: AppState) =>
  state.user !== null && !state.user.isOnboarded;

export const selectHasCouple = (state: AppState) =>
  state.user?.coupleId != null;

export const selectCoupleId = (state: AppState) =>
  state.couple?.id ?? state.user?.coupleId ?? null;

export default useAppStore;
