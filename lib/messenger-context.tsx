'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface MessengerState {
  open: boolean;
  minimized: boolean;
  conversationId: string | null;
  listingTitle: string;
}

interface MessengerContextValue extends MessengerState {
  openChat: (conversationId: string, listingTitle: string) => void;
  closeChat: () => void;
  toggleMinimize: () => void;
}

const MessengerContext = createContext<MessengerContextValue | null>(null);

export function MessengerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MessengerState>({
    open: false,
    minimized: false,
    conversationId: null,
    listingTitle: '',
  });

  const openChat = useCallback((conversationId: string, listingTitle: string) => {
    setState({ open: true, minimized: false, conversationId, listingTitle });
  }, []);

  const closeChat = useCallback(() => {
    setState(s => ({ ...s, open: false, conversationId: null }));
  }, []);

  const toggleMinimize = useCallback(() => {
    setState(s => ({ ...s, minimized: !s.minimized }));
  }, []);

  return (
    <MessengerContext.Provider value={{ ...state, openChat, closeChat, toggleMinimize }}>
      {children}
    </MessengerContext.Provider>
  );
}

export function useMessenger() {
  const ctx = useContext(MessengerContext);
  if (!ctx) throw new Error('useMessenger must be used within MessengerProvider');
  return ctx;
}
