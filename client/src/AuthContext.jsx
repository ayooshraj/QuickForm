import { createContext, useContext, useEffect, useState } from 'react';
import { clearSession, getToken, getUser, setSession } from './api';
import { connectSocket } from './socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  // The socket lives in state so components re-run their listeners once it exists.
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) return undefined;
    const s = connectSocket(token);
    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
  }, [user]);

  const login = (token, u) => { setSession(token, u); setUser(u); };
  const logout = () => { clearSession(); setUser(null); };

  return <AuthContext.Provider value={{ user, socket, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
