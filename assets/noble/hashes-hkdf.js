// @noble/hashes/hkdf.js 的多镜像 shim
import { loadNoble } from './loader.js';
import { mirrorsFor } from './mirrors.js';

const mod = await loadNoble(
    '@noble/hashes/hkdf.js',
    mirrorsFor('@noble/hashes', '2.2.0', 'hkdf.js'),
    { validate: (m) => typeof m.hkdf === 'function' }
);

export const hkdf = mod.hkdf;
export const extract = mod.extract;
export const expand = mod.expand;
