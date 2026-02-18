"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export interface ApiKeys {
  openai?: string;
  google?: string;
  xai?: string;
  groq?: string;
  cerebras?: string;
}

interface ApiKeyContextType {
  apiKeys: ApiKeys;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const storedKeys = localStorage.getItem('user_api_keys');
    if (storedKeys) {
      try {
        setApiKeys(JSON.parse(storedKeys));
      } catch (e) {
        console.error('Failed to parse api keys', e);
      }
    }
  }, []);

  const setApiKey = (provider: keyof ApiKeys, key: string) => {
    setApiKeys((prev) => {
      const newKeys = { ...prev, [provider]: key };
      if (!key) delete newKeys[provider];
      localStorage.setItem('user_api_keys', JSON.stringify(newKeys));
      return newKeys;
    });
  };

  return (
    <ApiKeyContext.Provider value={{ apiKeys, setApiKey, isOpen, setIsOpen }}>
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKeys must be used within an ApiKeyProvider');
  }
  return context;
}
