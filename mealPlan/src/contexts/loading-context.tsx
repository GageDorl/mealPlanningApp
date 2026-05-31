import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { LoadingModal } from '@/components/ui/loading-modal';

interface LoadingContextValue {
  showLoading: (message?: string) => void;
  updateMessage: (message: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextValue>({
  showLoading: () => {},
  updateMessage: () => {},
  hideLoading: () => {},
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  // Track nested calls so nested showLoading/hideLoading pairs don't kill each other
  const depth = useRef(0);

  const showLoading = useCallback((msg?: string) => {
    depth.current += 1;
    setMessage(msg);
    setVisible(true);
  }, []);

  const updateMessage = useCallback((msg: string) => {
    setMessage(msg);
  }, []);

  const hideLoading = useCallback(() => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) {
      setVisible(false);
      setMessage(undefined);
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ showLoading, updateMessage, hideLoading }}>
      {children}
      <LoadingModal visible={visible} message={message} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
