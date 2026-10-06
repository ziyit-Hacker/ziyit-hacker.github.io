 
 
 
 
 
 
 
 
 
 
 
 
 
 


export function makeCluster(count, half) {
    const out = new Array(count);
    for (let i = 0; i < count; i++) {
        out[i] = {
             
            rx: Math.random() * 2 * half - half,
            ry: Math.random() * 2 * half - half,
             
            v: (Math.random() * 256) | 0,
        };
    }
    return out;
}


export function paintFullNoise(buf) {
    const { data } = buf;
    for (let i = 0; i < data.length; i += 4) {
        // v0.3.58：本地底噪与后端视频同构 —— 纯二值 0/255（不再取 0~255 中间灰）。
        // 每帧逐像素随机，与后端二值噪点颗粒度/分布一致，切换时不会有观感跳变，
        // 也保证"每个像素只在最低/最高亮度上，不出现灰色"。
        const v = Math.random() < 0.5 ? 0 : 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
    }
}


export function stampCluster(buf, particles, center, gain, dropRate, brightnessScale = 1) {
    const { w, h, data } = buf;
    const cx = center[0];
    const cy = center[1];
    for (let i = 0; i < particles.length; i++) {
         
        if (Math.random() < dropRate)
            continue;
        const px = (cx + particles[i].rx) | 0;
        const py = (cy + particles[i].ry) | 0;
        if (px < 0 || px >= w || py < 0 || py >= h)
            continue;
         
        const boosted = particles[i].v + gain * (255 - particles[i].v);
        const v = Math.min(255, (boosted * brightnessScale) | 0);
        const idx = (py * w + px) * 4;
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = 255;
    }
}
