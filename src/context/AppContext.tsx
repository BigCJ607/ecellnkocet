import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserTicket } from '../mocks/types';
import { authService } from '../services/authService';
import { eventService } from '../services/eventService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AppContextType {
  user: User | null;
  tickets: UserTicket[];
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshTickets: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        const userTickets = await eventService.getUserTickets(currentUser.id);
        setTickets(userTickets);
      }
    } catch (err) {
      console.error('Error fetching user state', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            if (currentUser) {
              const userTickets = await eventService.getUserTickets(currentUser.id);
              setTickets(userTickets);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setTickets([]);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [fetchInitialData]);

  const login = (newUser: User) => {
    setUser(newUser);
    eventService.getUserTickets(newUser.id).then(setTickets);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setTickets([]);
  };

  const refreshTickets = async () => {
    if (user) {
      const userTickets = await eventService.getUserTickets(user.id);
      setTickets(userTickets);
    }
  };

  return (
    <AppContext.Provider value={{ user, tickets, loading, login, logout, refreshTickets }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
