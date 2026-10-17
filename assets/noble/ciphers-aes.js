// @noble/ciphers/aes.js 的多镜像 shim
import { loadNoble } from './loader.js';
import { mirrorsFor } from './mirrors.js';

const mod = await loadNoble(
    '@noble/ciphers/aes.js',
    mirrorsFor('@noble/ciphers', '2.2.0', 'aes.js'),
    { validate: (m) => typeof m.gcm === 'function' }
);

export const gcm = mod.gcm;
export const ctr = mod.ctr;
export const ecb = mod.ecb;
export const cbc = mod.cbc;
export const cfb = mod.cfb;
export const gcmsiv = mod.gcmsiv;
export const aeskw = mod.aeskw;
export const aeskwp = mod.aeskwp;
export const cmac = mod.cmac;
export const rngAesCtrDrbg128 = mod.rngAesCtrDrbg128;
export const rngAesCtrDrbg256 = mod.rngAesCtrDrbg256;
