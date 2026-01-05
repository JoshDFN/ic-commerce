import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initAuth, login as iiLogin, logout as iiLogout, isAuthenticated, getBackend, clearAuthCache } from '../lib/backend';

type UserRole = 'Admin' | 'Customer' | 'Guest';

interface AuthState {
  isLoading: boolean;
  isLoggedIn: boolean;
  role: UserRole;
  principal: string | null;
}

interface AuthContextType extends AuthState {
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isLoggedIn: false,
    role: 'Guest',
    principal: null,
  });

  const refreshAuth = useCallback(async () => {
    try {
      const authenticated = await isAuthenticated();

      if (authenticated) {
        const backend = await getBackend();
        const result = await backend.initialize_auth();

        if ('Ok' in result) {
          const auth = result.Ok;
          setState({
            isLoading: false,
            isLoggedIn: true,
            role: 'Admin' in auth.role ? 'Admin' : 'Customer' in auth.role ? 'Customer' : 'Guest',
            principal: auth.principal,
          });
        } else {
          // Backend rejected auth - might be stale identity from previous deployment
          // Clear cached auth and reset state
          await clearAuthCache();
          setState({
            isLoading: false,
            isLoggedIn: false,
            role: 'Guest',
            principal: null,
          });
        }
      } else {
        setState({
          isLoading: false,
          isLoggedIn: false,
          role: 'Guest',
          principal: null,
        });
      }
    } catch {
      // Network error or stale auth - clear cache to allow fresh login
      await clearAuthCache();
      setState({
        isLoading: false,
        isLoggedIn: false,
        role: 'Guest',
        principal: null,
      });
    }
  }, []);

  useEffect(() => {
    initAuth().then(() => refreshAuth());
  }, [refreshAuth]);

  const login = async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));
    const success = await iiLogin();
    if (success) {
      await refreshAuth();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
    return success;
  };

  const logout = async (): Promise<void> => {
    await iiLogout();
    setState({
      isLoading: false,
      isLoggedIn: false,
      role: 'Guest',
      principal: null,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
