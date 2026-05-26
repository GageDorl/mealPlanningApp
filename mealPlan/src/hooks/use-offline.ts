import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // On native, rely on error handling in service calls to detect offline state.
      // NetInfo (@react-native-community/netinfo) would provide reactive status
      // but is not included as a dependency in this project.
      return;
    }

    function update() {
      setIsOffline(!navigator.onLine);
    }

    setIsOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return isOffline;
}
