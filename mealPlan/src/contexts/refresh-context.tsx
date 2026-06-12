import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface RefreshContextValue {
  isRefreshing: boolean;
  registerRefresh: (fn: () => Promise<void>) => void;
  triggerRefresh: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextValue>({
  isRefreshing: false,
  registerRefresh: () => {},
  triggerRefresh: async () => {},
});

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshFnRef = useRef<(() => Promise<void>) | null>(null);
  const isRefreshingRef = useRef(false);

  const registerRefresh = useCallback((fn: () => Promise<void>) => {
    refreshFnRef.current = fn;
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshingRef.current || !refreshFnRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      await refreshFnRef.current();
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  return (
    <RefreshContext.Provider value={{ isRefreshing, registerRefresh, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}
