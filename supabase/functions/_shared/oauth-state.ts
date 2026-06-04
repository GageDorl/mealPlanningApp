const encoder = new TextEncoder()

interface StatePayload {
  userId: string
  exp: number
  nonce: string
}

export async function createState(userId: string, secret: string): Promise<string> {
  const payload: StatePayload = {
    userId,
    exp: Date.now() + 10 * 60 * 1000, // 10 minutes
    nonce: crypto.randomUUID(),
  }
  const data = btoa(JSON.stringify(payload))
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return `${data}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`
}

export async function verifyState(
  state: string,
  secret: string
): Promise<StatePayload | null> {
  const parts = state.split('.')
  if (parts.length !== 2) return null
  const [data, sig] = parts

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  )
  const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0))
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data))
  if (!valid) return null

  const payload: StatePayload = JSON.parse(atob(data))
  if (payload.exp < Date.now()) return null

  return payload
}
