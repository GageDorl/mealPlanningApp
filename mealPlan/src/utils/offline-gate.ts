export const OFFLINE_MESSAGE =
  'This feature is only available online. Please connect to a network and try again.';

export class OfflineError extends Error {
  constructor() { super(OFFLINE_MESSAGE); this.name = 'OfflineError'; }
}

// Native: no reliable synchronous check without NetInfo — return optimistic true.
// The actual network call will fail naturally if the device is offline.
export function isOnline(): boolean {
  return true;
}

// Throws OfflineError if offline — call at the start of any network-gated action.
export function requireOnline(): void {
  if (!isOnline()) throw new OfflineError();
}
