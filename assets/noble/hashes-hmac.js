// @noble/hashes/hmac.js 的多镜像 shim
import { loadNoble } from './loader.js';
import { mirrorsFor } from './mirrors.js';

const mod = await loadNoble(
    '@noble/hashes/hmac.js',
    mirrorsFor('@noble/hashes', '2.2.0', 'hmac.js'),
    { validate: (m) => typeof m.hmac === 'function' }
);

export const hmac = mod.hmac;
