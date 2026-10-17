// @noble/curves/nist.js 的多镜像 shim
import { loadNoble } from './loader.js';
import { mirrorsFor } from './mirrors.js';

const mod = await loadNoble(
    '@noble/curves/nist.js',
    mirrorsFor('@noble/curves', '2.2.0', 'nist.js'),
    { validate: (m) => !!(m.p256 && typeof m.p256.getPublicKey === 'function') }
);

export const p256 = mod.p256;
export const p256_hasher = mod.p256_hasher;
export const p256_oprf = mod.p256_oprf;
export const p256_FROST = mod.p256_FROST;
export const p384 = mod.p384;
export const p384_hasher = mod.p384_hasher;
export const p384_oprf = mod.p384_oprf;
export const p521 = mod.p521;
export const p521_hasher = mod.p521_hasher;
export const p521_oprf = mod.p521_oprf;
