export const OFFLINE_MESSAGE =
  'This feature is only available online. Please connect to a network and try again.';

export class OfflineError extends Error {
  constructor() { super(OFFLINE_MESSAGE); this.name = 'OfflineError'; }
}

// Web: navigator.onLine is reliable in modern browsers.
// Falls back to true in SSR/node environments where navigator is unavailable.
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Throws OfflineError if offline — call at the start of any network-gated action.
export function requireOnline(): void {
  if (!isOnline()) throw new OfflineError();
}
