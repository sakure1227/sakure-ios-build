// dev/probes/syncSourceHost.mjs
// 从 `mobile/src/sourceHost.ts` 生成给探针用的 `mobile/src/sourceHost.mjs`。
//
// 为什么要有这个副本：探针是 Node 直接跑的 `.mjs`（跑不了 `.ts`），它要用**真的**
// 源宿主文档（而不是自己抄一份）—— 抄一份就等于有两份真相，改了一处忘了另一处，
// 探针测的其实是旧代码。
//
// 手机版的构建**不**用它：`mobile/build-mobile.mjs` 把 `.ts` 排在 `.mjs` 前面
// （Vite 默认的顺序是 `.mjs` 在前，会解析到这份副本）。所以那份副本只给探针用，
// 由这个脚本生成，跑探针前执行一次：
//
//   node dev/probes/syncSourceHost.mjs && node dev/probes/sourceHostProbe.mjs
//
// 生成的方式是去掉类型标注（`.ts` 里那几处），其余一字不改。

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tsPath = resolve(here, '../../mobile/src/sourceHost.ts');
const mjsPath = resolve(here, '../../mobile/src/sourceHost.mjs');

const ts = readFileSync(tsPath, 'utf8');

// `.ts` 里那几处类型标注，去掉之后就是合法的 `.mjs`。
const substitutions = [
    ['const SUPPORT_QUALITYS: Record<string, string[]> = {', 'const SUPPORT_QUALITYS = {'],
    ['const SUPPORT_ACTIONS: Record<string, string[]> = {', 'const SUPPORT_ACTIONS = {'],
    [
        'export const buildSourceHostHtml = (script: string, meta: Record<string, unknown>): string => {',
        'export const buildSourceHostHtml = (script, meta) => {',
    ],
];

let out = ts;
for (const [from, to] of substitutions) {
    if (!out.includes(from)) {
        console.error(`[syncSourceHost] the source changed and this line is gone: ${from.slice(0, 60)}`);
        console.error('[syncSourceHost] update the substitutions here, then run it again.');
        process.exit(1);
    }
    out = out.replace(from, to);
}

writeFileSync(mjsPath, out, 'utf8');
console.log(`[syncSourceHost] wrote ${mjsPath}`);
