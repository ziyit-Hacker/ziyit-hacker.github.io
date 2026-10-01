var POW_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

var POW_IV = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

function rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
}

var POW_W = new Uint32Array(64);

 
function compress(block, h) {
    var W = POW_W;
    for (var i = 0; i < 16; i++) {
        var j = i << 2;
        W[i] = ((block[j] << 24) | (block[j + 1] << 16) | (block[j + 2] << 8) | block[j + 3]) >>> 0;
    }
    for (i = 16; i < 64; i++) {
        var a = W[i - 15], b = W[i - 2];
        var s0 = (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) >>> 0;
        var s1 = (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)) >>> 0;
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    var A = h[0], B = h[1], C = h[2], D = h[3];
    var E = h[4], F = h[5], G = h[6], H = h[7];
    for (i = 0; i < 64; i++) {
        var S1 = (rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25)) >>> 0;
        var ch = ((E & F) ^ (~E & G)) >>> 0;
        var t1 = (H + S1 + ch + POW_K[i] + W[i]) >>> 0;
        var S0 = (rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) >>> 0;
        var maj = ((A & B) ^ (A & C) ^ (B & C)) >>> 0;
        var t2 = (S0 + maj) >>> 0;
        H = G; G = F; F = E;
        E = (D + t1) >>> 0;
        D = C; C = B; B = A;
        A = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + A) >>> 0;
    h[1] = (h[1] + B) >>> 0;
    h[2] = (h[2] + C) >>> 0;
    h[3] = (h[3] + D) >>> 0;
    h[4] = (h[4] + E) >>> 0;
    h[5] = (h[5] + F) >>> 0;
    h[6] = (h[6] + G) >>> 0;
    h[7] = (h[7] + H) >>> 0;
}

 
 
function sha256Words(bytes) {
    var len = bytes.length;
    var total = (((len + 9 + 63) >> 6) << 6);
    var buf = new Uint8Array(total);
    buf.set(bytes);
    buf[len] = 0x80;
    var view = new DataView(buf.buffer);
    view.setUint32(total - 8, Math.floor(len / 536870912), false);
    view.setUint32(total - 4, (len << 3) >>> 0, false);
    var h = POW_IV.slice();
    for (var off = 0; off < total; off += 64) {
        compress(buf.subarray(off, off + 64), h);
    }
    return h;
}

 
function leadingZeroBits(h) {
    for (var i = 0; i < 8; i++) {
        if (h[i] !== 0) {
            return (i << 5) + Math.clz32(h[i]);
        }
    }
    return 256;
}

 
 
 
var POW_BLOCK = new Uint8Array(64);
var POW_BLOCK_VIEW = new DataView(POW_BLOCK.buffer);

 
 
 
var POW_PROGRESS_MS = 100;

 
 
function solve(nonce, difficulty, onProgress) {
    var prefix = String(nonce) + ":";
    var base = prefix.length;
     
    var maxDigits = 55 - base;
    POW_BLOCK.fill(0);
    for (var k = 0; k < base; k++) {
        POW_BLOCK[k] = prefix.charCodeAt(k) & 0xff;
    }
    var t0 = Date.now();
    var lastReport = t0;
    var hashes = 0;
    var s, i, j, n, end, h;

    for (i = 0; ; i++) {
        s = String(i);
        n = s.length;
        if (n <= maxDigits) {
            for (j = 0; j < n; j++) {
                POW_BLOCK[base + j] = s.charCodeAt(j);
            }
            end = base + n;
            POW_BLOCK[end] = 0x80;
             
            POW_BLOCK_VIEW.setUint32(56, 0, false);
            POW_BLOCK_VIEW.setUint32(60, end * 8, false);
            h = POW_IV.slice();
            compress(POW_BLOCK, h);
            hashes++;
            if (leadingZeroBits(h) >= difficulty) {
                return { solution: s, hashes: hashes, solveMs: Date.now() - t0 };
            }
        }
        else {
             
             
            h = sha256Words(new TextEncoder().encode(prefix + s));
            hashes++;
            if (leadingZeroBits(h) >= difficulty) {
                return { solution: s, hashes: hashes, solveMs: Date.now() - t0 };
            }
        }
         
         
         
         
         
        if (onProgress) {
            var now = Date.now();
            if (now - lastReport >= POW_PROGRESS_MS) {
                lastReport = now;
                onProgress(hashes, now - t0);
            }
        }
    }
}

 
if (typeof self !== "undefined" && typeof self.postMessage === "function" && typeof self.importScripts === "function") {
    self.onmessage = function (ev) {
        var msg = ev && ev.data;
        if (!msg || msg.type !== "solve") {
            return;
        }
        try {
            var out = solve(msg.nonce, Number(msg.difficulty) || 0, function (hashes, ms) {
                self.postMessage({ type: "progress", hashes: hashes, solveMs: ms });
            });
            self.postMessage({ type: "solved", solution: out.solution, hashes: out.hashes, solveMs: out.solveMs });
        }
        catch (e) {
            self.postMessage({ type: "error", message: String((e && e.message) || e) });
        }
    };
}
