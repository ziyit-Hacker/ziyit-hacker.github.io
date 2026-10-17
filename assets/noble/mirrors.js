// ZIYIT 人机验证依赖镜像表
// 每个 @noble 模块都会按下面的顺序逐个尝试，共 8 个地址（1 个主源 + 7 个备用源）。
// 前 5 个是 jsDelivr 的不同边缘线路（不同域名，可规避单一域名被重置的问题），
// 之后依次是 unpkg、esm.sh、esm.run。
// 任意一个可用即返回；全部失败由 loader.js 负责多轮整体重试。

export function mirrorsFor(pkg, version, file) {
    const ver = version || 'latest';
    const at = version ? '@' + version : '';
    return [
        // jsDelivr 主站（Cloudflare）
        'https://cdn.jsdelivr.net/npm/' + pkg + at + '/' + file,
        // jsDelivr Fastly 线路
        'https://fastly.jsdelivr.net/npm/' + pkg + at + '/' + file,
        // jsDelivr Gcore 线路
        'https://gcore.jsdelivr.net/npm/' + pkg + at + '/' + file,
        // jsDelivr Cloudflare 测试线路
        'https://testingcf.jsdelivr.net/npm/' + pkg + at + '/' + file,
        // jsDelivr Quantil 线路
        'https://quantil.jsdelivr.net/npm/' + pkg + at + '/' + file,
        // unpkg
        'https://unpkg.com/' + pkg + at + '/' + file,
        // esm.sh
        'https://esm.sh/' + pkg + at + '/' + file,
        // jsDelivr 的 ESM 入口
        'https://esm.run/' + pkg + at + '/' + file,
    ];
}
