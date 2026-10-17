// @noble/hashes/utils.js 的多镜像 shim
import { loadNoble } from './loader.js';
import { mirrorsFor } from './mirrors.js';

const mod = await loadNoble(
    '@noble/hashes/utils.js',
    mirrorsFor('@noble/hashes', '2.2.0', 'utils.js'),
    { validate: (m) => typeof m.bytesToHex === 'function' }
);

export const randomBytes = mod.randomBytes;
export const bytesToHex = mod.bytesToHex;
export const hexToBytes = mod.hexToBytes;
export const utf8ToBytes = mod.utf8ToBytes;
export const concatBytes = mod.concatBytes;
export const isBytes = mod.isBytes;
export const anumber = mod.anumber;
export const abytes = mod.abytes;
export const clean = mod.clean;
export const createView = mod.createView;
export const u8 = mod.u8;
export const u32 = mod.u32;
export const checkOpts = mod.checkOpts;
