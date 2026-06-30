import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api, Config, User } from './api';

interface Toast { id: number; msg: string; kind: 'info' | 'success' | 'error'; }

interface AppState {
  user: User | null;
  config: Config | null;
  login: (name: string, asAuthority?: boolean) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  toast: (msg: string, kind?: Toast['kind']) => void;
  toasts: Toast[];
}

const Ctx = createContext<AppState>(null as any);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  useEffect(() => {
    api.config().then(setConfig).catch(() => {});
    const saved = localStorage.getItem('ch_user');
    if (saved) {
      try {
        const u = JSON.parse(saved) as User;
        api.user(u.id).then(setUser).catch(() => setUser(u));
      } catch {}
    }
  }, []);

  const login = useCallback(async (name: string, asAuthority = false) => {
    const u = await api.auth(name, asAuthority);
    setUser(u);
    localStorage.setItem('ch_user', JSON.stringify(u));
    return u;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('ch_user');
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try { const u = await api.user(user.id); setUser(u); localStorage.setItem('ch_user', JSON.stringify(u)); } catch {}
  }, [user]);

  return (
    <Ctx.Provider value={{ user, config, login, logout, refreshUser, toast, toasts }}>
      {children}
    </Ctx.Provider>
  );
}
