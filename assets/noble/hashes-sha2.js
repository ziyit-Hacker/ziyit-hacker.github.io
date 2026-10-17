// @noble/hashes/sha2.js 的多镜像 shim
import { loadNoble } from './loader.js';
import { mirrorsFor } from './mirrors.js';

const mod = await loadNoble(
    '@noble/hashes/sha2.js',
    mirrorsFor('@noble/hashes', '2.2.0', 'sha2.js'),
    { validate: (m) => typeof m.sha256 === 'function' }
);

export const sha224 = mod.sha224;
export const sha256 = mod.sha256;
export const sha384 = mod.sha384;
export const sha512 = mod.sha512;
export const sha512_224 = mod.sha512_224;
export const sha512_256 = mod.sha512_256;
