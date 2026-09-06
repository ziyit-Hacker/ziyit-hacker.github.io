 
 
 
 
 
 
 
 
import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { gcm } from "@noble/ciphers/aes.js";
import { randomBytes } from "@noble/hashes/utils.js";
const HKDF_INFO = new TextEncoder().encode("phantom-v1");
 
const NATIVE = typeof crypto !== "undefined" && !!crypto.subtle;
 
export function b64uEncode(bytes) {
    const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = "";
    for (let i = 0; i < buf.length; i++)
        s += String.fromCharCode(buf[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function b64uDecode(s) {
    const pad = "=".repeat((4 - (s.length % 4)) % 4);
    const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        out[i] = bin.charCodeAt(i);
    return out;
}
 
function buf(u) {
    return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);
}
 
export async function generateClientKeyPair() {
    if (NATIVE) {
        const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
         
         
        const subtleAny = crypto.subtle;
        const publicJwk = (await subtleAny.exportKey("jwk", pair.publicKey));
        return { privateKey: pair.privateKey, publicJwk };
    }
     
    const priv = randomBytes(32);
    const pub = p256.getPublicKey(priv, false);  
    return {
        privateKey: priv,
        publicJwk: {
            kty: "EC",
            crv: "P-256",
            x: b64uEncode(pub.subarray(1, 33)),
            y: b64uEncode(pub.subarray(33, 65)),
        },
    };
}
 
export async function importServerPublic(jwk) {
    if (NATIVE) {
         
         
        const subtleAny = crypto.subtle;
        return (await subtleAny.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, [], []));
    }
     
    const x = b64uDecode(jwk.x);
    const y = b64uDecode(jwk.y);
    const uncompressed = new Uint8Array(65);
    uncompressed[0] = 0x04;
    uncompressed.set(x, 1);
    uncompressed.set(y, 33);
    return uncompressed;
}
 
export async function deriveSessionKey(clientPrivate, serverPublic, saltB64u) {
    if (NATIVE) {
        const sharedBits = await crypto.subtle.deriveBits({ name: "ECDH", public: serverPublic }, clientPrivate, 256);
        const baseKey = await crypto.subtle.importKey("raw", sharedBits, { name: "HKDF" }, false, ["deriveKey"]);
        return crypto.subtle.deriveKey({
            name: "HKDF",
            hash: "SHA-256",
            salt: buf(b64uDecode(saltB64u)),
            info: HKDF_INFO,
        }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    }
     
     
     
    const shared = p256.getSharedSecret(clientPrivate, serverPublic);
    const sharedX = shared.subarray(1, 33);
     
    return hkdf(sha256, sharedX, b64uDecode(saltB64u), HKDF_INFO, 32);
}
 
export async function encrypt(key, plaintext) {
    if (NATIVE) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: HKDF_INFO }, key, buf(plaintext));
        return { iv: b64uEncode(iv), ciphertext: b64uEncode(ct) };
    }
     
    const iv = randomBytes(12);
    const cipher = gcm(key, iv, HKDF_INFO);  
    const ct = cipher.encrypt(plaintext);  
    return { iv: b64uEncode(iv), ciphertext: b64uEncode(ct) };
}
 
export async function decrypt(key, ivB64u, ctB64u) {
    if (NATIVE) {
        const pt = await crypto.subtle.decrypt({
            name: "AES-GCM",
            iv: buf(b64uDecode(ivB64u)),
            additionalData: HKDF_INFO,
        }, key, buf(b64uDecode(ctB64u)));
        return new Uint8Array(pt);
    }
     
    const iv = b64uDecode(ivB64u);
    const ct = b64uDecode(ctB64u);
    const cipher = gcm(key, iv, HKDF_INFO);
    return cipher.decrypt(ct);
}
