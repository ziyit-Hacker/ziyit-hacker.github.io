const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('h:/Code/html/ziyit/backrooms/create-document.html', 'utf8');

function grabFn(name) {
    const key = 'function ' + name + '(';
    const i = src.indexOf(key);
    if (i < 0) throw new Error('not found: ' + name);
    let depth = 0, started = false;
    for (let j = i; j < src.length; j++) {
        const c = src[j];
        if (c === '{') { depth++; started = true; }
        else if (c === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
    }
    throw new Error('unbalanced: ' + name);
}
function grabVar(name) {
    const i = src.indexOf('var ' + name + ' =');
    if (i < 0) throw new Error('not found var: ' + name);
    let depth = 0, q = null;
    for (let j = i; j < src.length; j++) {
        const c = src[j];
        if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
        if (c === '"' || c === "'") { q = c; continue; }
        if (c === '{' || c === '[') depth++;
        else if (c === '}' || c === ']') depth--;
        else if (c === ';' && depth === 0) return src.slice(i, j + 1);
    }
    throw new Error('unbalanced var: ' + name);
}

const testCode = [
    "log('habitatKey', ['Level-5', 'Level 5', 'level-5', 'Level 7.7', 'Level-!+-1'].map(habitatKey).join(' | '));",
    "doc.titlePrefix = 'Entity 111'; log('编号 Entity 111 ->', entityNumber());",
    "doc.titlePrefix = 'Entity [NO DATA]'; log('编号 Entity [NO DATA] ->', entityNumber());",
    "doc.titlePrefix = 'Entity-13'; log('编号 Entity-13 ->', entityNumber());",
    "doc.titlePrefix = 'Object 3'; log('编号 Object 3 ->', entityNumber());",
    "var re = /^levels\\/level-[\\d.\\-]+\\.html$/i;",
    "log('静态链接过滤', ['levels/level-5.html', 'levels/level-11latest.html', 'levels/level-7.7.html', '../x.html'].map(function (h) { return h + '=' + re.test(h); }).join(', '));",
    "log('名称提取', ((('Level 5 - “恐怖旅馆”<span class=\"rew\">').match(/[“\"]([^”\"]+)[”\"]/) || [])[1] || '(空)'));",
    "addHabitat({ key: '10', num: 'Level 10', name: '丰裕' });",
    "addHabitat({ key: '5', num: 'Level 5', name: '恐怖旅馆' });",
    "addHabitat({ key: '5', num: 'Level 5', name: '重复项应被忽略' });",
    "addHabitat({ key: '100', num: 'Level 100', name: '后端层级' });",
    "sortHabitats();",
    "log('候选顺序', HABITAT_OPTIONS.map(function (o) { return o.num; }).join(', '));",
    "log('去重后 Level 5 名称', HABITAT_MAP['5'].name);",
    "doc.habitats = [HABITAT_MAP['5'], HABITAT_MAP['10']];",
    "log('预览渲染', habitatHtml(true));",
    "log('导出渲染', habitatHtml(false));",
    "doc.habitats = [];",
    "log('未选-预览', habitatHtml(true));",
    "log('未选-导出', habitatHtml(false));"
].join('\n');

const code = [
    grabVar('SITE_BASE'),
    grabVar('NODATA'),
    grabVar('HABITAT_OPTIONS'),
    grabVar('HABITAT_MAP'),
    grabVar('HABITAT_LOADED'),
    grabVar('HABITAT_SHOW_LIMIT'),
    grabFn('escHtml'),
    grabFn('toAbsUrl'),
    grabFn('habitatKey'),
    grabFn('entityNumber'),
    grabFn('addHabitat'),
    grabFn('sortHabitats'),
    grabFn('habitatHtml'),
    testCode
].join('\n');

const sandbox = { log: (k, v) => console.log(k + ': ' + v), console, doc: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
