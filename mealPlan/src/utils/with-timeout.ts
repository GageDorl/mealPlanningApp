/**
 * Races a promise against a timeout. If the promise doesn't settle within
 * `ms` milliseconds, rejects with a descriptive error so loading states
 * always resolve instead of hanging indefinitely.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`[timeout] ${label} did not resolve within ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
