import env from '@/constants/env';

const PROBE_TIMEOUT_MS = 3_000;
const PROBE_RETRY_INTERVAL_MS = 1_500;
const MAX_WAIT_MS = 25_000;

/**
 * Probes the Supabase REST endpoint to confirm the network is reachable.
 * Retries every 1.5s for up to 25s. Returns true when reachable, false on timeout.
 *
 * Uses plain fetch (not the Supabase client) so the probe doesn't interact
 * with the client's auth state or connection pool.
 */
export async function waitForNetwork(): Promise<boolean> {
  const probeUrl = `${env.SUPABASE_URL}/rest/v1/`;
  const deadline = Date.now() + MAX_WAIT_MS;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      const res = await fetch(probeUrl, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timer);
      console.log(`[network-probe] attempt ${attempt}: reachable (HTTP ${res.status})`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[network-probe] attempt ${attempt}: unreachable (${msg})`);
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    await new Promise((r) => setTimeout(r, Math.min(PROBE_RETRY_INTERVAL_MS, remainingMs)));
  }

  console.log(`[network-probe] gave up after ${MAX_WAIT_MS}ms`);
  return false;
}
