import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import ENV from '../config';
import type { User, Couple } from '../types';

interface AuthState {
  user: User | null;
  couple: Couple | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  isHydrating: boolean;

  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    user: User;
    couple?: Couple | null;
  }) => Promise<void>;

  setCouple: (couple: Couple) => void;
  clearCouple: () => void;
  updateUser: (patch: Partial<User>) => void;

  loadFromStorage: () => Promise<void>;
  logout: () => Promise<void>;
}

let hydrationPromise: Promise<void> | null = null;

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  couple: null,
  accessToken: null,
  refreshToken: null,
  isHydrated: false,
  isHydrating: false,

  setAuth: async (data) => {
    const { accessToken, refreshToken, user, couple } = data;

    await Promise.all([
      SecureStore.setItemAsync(ENV.SECURE_STORE_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(ENV.SECURE_STORE_REFRESH_KEY, refreshToken),
    ]);

    set({
      accessToken,
      refreshToken,
      user,
      couple: couple ?? get().couple,
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

  loadFromStorage: async () => {
    if (hydrationPromise) return hydrationPromise;

    const state = get();
    if (state.isHydrated) return;

    hydrationPromise = (async () => {
      set({ isHydrating: true });

      try {
        const [accessToken, refreshToken] = await Promise.all([
          SecureStore.getItemAsync(ENV.SECURE_STORE_TOKEN_KEY),
          SecureStore.getItemAsync(ENV.SECURE_STORE_REFRESH_KEY),
        ]);

        if (!accessToken) {
          set({ isHydrated: true, isHydrating: false });
          return;
        }

        set({ accessToken, refreshToken });

        try {
          const { default: api } = await import('../api/client');
          const me = await api.get<{
            user: User;
            couple: Couple | null;
          }>('/auth/me');

          set({
            user: me.user,
            couple: me.couple,
            isHydrated: true,
            isHydrating: false,
          });
        } catch {
          // Token may be expired — refreshToken interceptor will handle retry.
          // If that also fails, the 401 interceptor triggers logout.
          // For now, keep the token so the interceptor gets a chance.
          set({ isHydrated: true, isHydrating: false });
        }
      } catch {
        set({
          accessToken: null,
          refreshToken: null,
          isHydrated: true,
          isHydrating: false,
        });
      } finally {
        hydrationPromise = null;
      }
    })();

    return hydrationPromise;
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ENV.SECURE_STORE_TOKEN_KEY),
      SecureStore.deleteItemAsync(ENV.SECURE_STORE_REFRESH_KEY),
    ]).catch(() => {});

    set({
      user: null,
      couple: null,
      accessToken: null,
      refreshToken: null,
    });
  },
}));

// --- Derived selectors (no hooks inside — use with useAuthStore(selector)) ---

export const selectIsAuthenticated = (state: AuthState) =>
  state.isHydrated && state.accessToken !== null && state.user !== null;

export const selectNeedsOnboarding = (state: AuthState) =>
  state.user !== null && !state.user.isOnboarded;

export const selectHasCouple = (state: AuthState) =>
  state.user?.coupleId != null;

export const selectCoupleId = (state: AuthState) =>
  state.couple?.id ?? state.user?.coupleId ?? null;

export default useAuthStore;
