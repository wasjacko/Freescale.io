import "server-only";
import _sodium from "libsodium-wrappers";

/**
 * Symmetric encryption for sensitive data we store at rest (OAuth tokens, etc.)
 * Uses libsodium's secretbox (XSalsa20-Poly1305). Output format is base64 of
 * `nonce ‖ ciphertext`, which gives us authenticated encryption with a single
 * compact field that round-trips through Postgres `text`.
 *
 * ENCRYPTION_KEY env var must be a 32-byte base64-encoded key. Generate one
 * with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
 */
let readyPromise: Promise<typeof _sodium> | null = null;
async function getSodium() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await _sodium.ready;
      return _sodium;
    })();
  }
  return readyPromise;
}

function getKey(sodium: typeof _sodium): Uint8Array {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set. Generate one and add it to env.");
  }
  const key = sodium.from_base64(raw, sodium.base64_variants.ORIGINAL);
  if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${sodium.crypto_secretbox_KEYBYTES} bytes (got ${key.length}).`
    );
  }
  return key;
}

export async function encryptJSON(payload: unknown): Promise<string> {
  const sodium = await getSodium();
  const key = getKey(sodium);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const plain = sodium.from_string(JSON.stringify(payload));
  const cipher = sodium.crypto_secretbox_easy(plain, nonce, key);
  const combined = new Uint8Array(nonce.length + cipher.length);
  combined.set(nonce, 0);
  combined.set(cipher, nonce.length);
  return sodium.to_base64(combined, sodium.base64_variants.ORIGINAL);
}

export async function decryptJSON<T = unknown>(value: string): Promise<T> {
  const sodium = await getSodium();
  const key = getKey(sodium);
  const combined = sodium.from_base64(value, sodium.base64_variants.ORIGINAL);
  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const cipher = combined.slice(sodium.crypto_secretbox_NONCEBYTES);
  const plain = sodium.crypto_secretbox_open_easy(cipher, nonce, key);
  return JSON.parse(sodium.to_string(plain)) as T;
}
