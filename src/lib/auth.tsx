import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, clearToken, getToken, setToken } from "./api";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: "consumer" | "restaurant_owner" | "admin";
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      try {
        const me = await api<{ user: AuthUser }>("/api/mobile/me");
        setUser(me.user);
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    try {
      const res = await api<LoginResponse>("/api/mobile/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await setToken(res.token);
      setUser(res.user);
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw err;
    }
  }

  async function signup(name: string, email: string, password: string) {
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw err;
    }
    await login(email, password);
  }

  async function loginWithGoogle(idToken: string) {
    try {
      const res = await api<LoginResponse>("/api/mobile/google-login", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      });
      await setToken(res.token);
      setUser(res.user);
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw err;
    }
  }

  async function logout() {
    await clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
