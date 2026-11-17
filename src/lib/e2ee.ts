// End-to-end encryption for backup and sync. Everything is encrypted on the phone with one random 256-bit key per
// account (the "data key"); the server only ever stores ciphertext. The data key is kept in the phone's secure
// storage, never derived from the login password, so resetting a forgotten password loses nothing.
//
// The data key reaches a new phone one of two ways:
//  - the recovery phrase: 24 words (BIP-39) encoding a separate 256-bit secret; a copy of the data key encrypted
//    with it is stored in the account ("wrapped"), so the phrase alone restores everything;
//  - approval from a phone that already has it: the new phone publishes a one-time X25519 public key, the old
//    phone encrypts the data key to it, and both show a short code derived from that public key so the person can
//    check that nothing in between swapped it.
//
// XChaCha20-Poly1305 (random 24-byte nonces, so no counter to keep), HKDF-SHA256 for keys, all from the audited
// @noble / @scure libraries. Pure: randomness is passed in, so this file also runs under Node for tests.
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

export type Random = (n: number) => Uint8Array;
/** A sealed value: nonce and ciphertext (with its 16-byte tag), both base64. */
export type Sealed = { n: string; c: string };

// ---- base64 (no Buffer in React Native; atob/btoa are not guaranteed everywhere) ----
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function toB64(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return out;
}
export function fromB64(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2] ?? 'A') & 63) << 6) | (B64.indexOf(clean[i + 3] ?? 'A') & 63);
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}
// UTF-8 by hand: Hermes doesn't always have TextDecoder, and these strings are small.
export function utf8ToBytes(str: string): Uint8Array {
  const out: number[] = [];
  for (const ch of str) {
    let c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else { c = Math.min(c, 0x10ffff); out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
  }
  return Uint8Array.from(out);
}
export function bytesToUtf8(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length;) {
    const x = b[i];
    const n = x < 0x80 ? 1 : x < 0xe0 ? 2 : x < 0xf0 ? 3 : 4;
    let c = n === 1 ? x : x & (0xff >> (n + 1));
    for (let k = 1; k < n; k++) c = (c << 6) | (b[i + k] & 63);
    out += String.fromCodePoint(c);
    i += n;
  }
  return out;
}

// ---- sealing ----
/** Encrypts bytes. `aad` binds the ciphertext to where it is stored (e.g. the record id), so it can't be moved. */
export function seal(key: Uint8Array, data: Uint8Array, random: Random, aad?: string): Sealed {
  const nonce = random(24);
  const c = xchacha20poly1305(key, nonce, aad ? utf8ToBytes(aad) : undefined).encrypt(data);
  return { n: toB64(nonce), c: toB64(c) };
}
/** Decrypts; throws if the key is wrong or the data was changed. */
export function open(key: Uint8Array, s: Sealed, aad?: string): Uint8Array {
  return xchacha20poly1305(key, fromB64(s.n), aad ? utf8ToBytes(aad) : undefined).decrypt(fromB64(s.c));
}
export const sealJSON = (key: Uint8Array, v: unknown, random: Random, aad?: string) => seal(key, utf8ToBytes(JSON.stringify(v)), random, aad);
export const openJSON = <T>(key: Uint8Array, s: Sealed, aad?: string): T => JSON.parse(bytesToUtf8(open(key, s, aad))) as T;

// ---- the data key and the recovery phrase ----
export const newDataKey = (random: Random) => random(32);
const derive = (secret: Uint8Array, info: string) => hkdf(sha256, secret, undefined, utf8ToBytes(info), 32);

/** A fresh recovery phrase (24 words) and the key it unlocks. */
export function newRecovery(random: Random): { phrase: string; key: Uint8Array } {
  const entropy = random(32);
  return { phrase: entropyToMnemonic(entropy, wordlist), key: derive(entropy, 'deadline/recovery/v1') };
}
/** Tidies a typed or pasted phrase: lower case, single spaces, no numbering or punctuation. */
export const normalPhrase = (s: string) => s.toLowerCase().replace(/\d+[.)]/g, ' ').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).join(' ');
export const validPhrase = (s: string) => validateMnemonic(normalPhrase(s), wordlist);
/** The key a recovery phrase unlocks, or null if it isn't a valid phrase (wrong word or typo). */
export function recoveryKey(phrase: string): Uint8Array | null {
  const p = normalPhrase(phrase);
  if (!validateMnemonic(p, wordlist)) return null;
  return derive(mnemonicToEntropy(p, wordlist), 'deadline/recovery/v1');
}
/** The data key, encrypted with the recovery key, as stored in the account. */
export const wrapKey = (dataKey: Uint8Array, wrapping: Uint8Array, random: Random) => seal(wrapping, dataKey, random, 'data-key');
export const unwrapKey = (wrapped: Sealed, wrapping: Uint8Array) => open(wrapping, wrapped, 'data-key');
/** A short fingerprint of the data key, stored next to it, so a wrong key is spotted before anything is decrypted. */
export const keyCheck = (dataKey: Uint8Array) => toB64(derive(dataKey, 'deadline/key-check/v1').slice(0, 9));

// ---- approving a new phone from one that already has the key ----
/** The new phone's one-time key pair. Only the public half is published. */
export function newDeviceKeys(random: Random) {
  const secret = random(32);
  return { secret, publicKey: x25519.getPublicKey(secret) };
}
/** Six digits both phones show, derived from the new phone's public key: if they match, nobody swapped it. */
export function pairingCode(publicKey: Uint8Array): string {
  const h = sha256(publicKey);
  const n = ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, '0').replace(/^(\d{3})(\d{3})$/, '$1 $2');
}
const pairKey = (shared: Uint8Array, newPub: Uint8Array, oldPub: Uint8Array) => {
  const salt = new Uint8Array(64); salt.set(newPub, 0); salt.set(oldPub, 32);
  return hkdf(sha256, shared, salt, utf8ToBytes('deadline/pairing/v1'), 32);
};
/** On the old phone: encrypts the data key to the new phone's public key. */
export function sendKeyToDevice(dataKey: Uint8Array, newPub: Uint8Array, random: Random): { from: string; key: Sealed } {
  const mine = newDeviceKeys(random);
  const k = pairKey(x25519.getSharedSecret(mine.secret, newPub), newPub, mine.publicKey);
  return { from: toB64(mine.publicKey), key: seal(k, dataKey, random, 'pairing') };
}
/** On the new phone: recovers the data key sent by the old phone. Throws if anything was tampered with. */
export function receiveKey(secret: Uint8Array, reply: { from: string; key: Sealed }): Uint8Array {
  const oldPub = fromB64(reply.from), newPub = x25519.getPublicKey(secret);
  return open(pairKey(x25519.getSharedSecret(secret, oldPub), newPub, oldPub), reply.key, 'pairing');
}
