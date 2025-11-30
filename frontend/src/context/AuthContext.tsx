import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/router";
import {
  ApiError,
  fetchCurrentUser as fetchCurrentUserApi,
  loginUser,
  logoutAllSessions,
  logoutUser,
  registerUser,
  type User,
} from "@/lib/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const redirectToLogin = useCallback(() => {
    if (router.pathname.startsWith("/auth")) {
      return;
    }
    void router.push("/auth/login");
  }, [router]);

  const fetchCurrentUser = useCallback(async () => {
    const current = await fetchCurrentUserApi();
    setUser(current);
    return current;
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        await fetchCurrentUser();
      } catch (error) {
        if (!active) return;
        setUser(null);
        if (error instanceof ApiError && error.status === 401) {
          redirectToLogin();
        } else {
          console.error("[Auth] Failed to fetch current user", error);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [fetchCurrentUser, redirectToLogin]);

  const login = useCallback(
    async (email: string, password: string) => {
      await loginUser(email, password);
      return fetchCurrentUser();
    },
    [fetchCurrentUser],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      await registerUser(email, password);
      await loginUser(email, password);
      return fetchCurrentUser();
    },
    [fetchCurrentUser],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    if (!router.pathname.startsWith("/auth")) {
      void router.push("/auth/login");
    }
  }, [router]);

  const logoutAll = useCallback(async () => {
    await logoutAllSessions();
    setUser(null);
    if (!router.pathname.startsWith("/auth")) {
      void router.push("/auth/login");
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      return await fetchCurrentUser();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
      }
      return null;
    }
  }, [fetchCurrentUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      logoutAll,
      refreshUser,
    }),
    [user, loading, login, register, logout, logoutAll, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
