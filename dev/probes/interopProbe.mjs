// 用 rolldown（Vite 用的同一个打包器）打包一段最小复现，看
// 「CJS 包 require('node:crypto')」在 ESM 输出里到底拿到什么形状。
import { rolldown } from 'rolldown';
import { writeFileSync, mkdirSync } from 'node:fs';

const dir = 'D:/Temp/User/interop-test';
mkdirSync(dir, { recursive: true });

// 入口：CJS 风格的调用（解构）
writeFileSync(`${dir}/entry.js`, `
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const cryptoNs = require('node:crypto');
console.log(JSON.stringify({
  destructured: {
    createHash: typeof createHash,
    randomBytes: typeof randomBytes,
    randomUUID: typeof randomUUID,
  },
  namespace: Object.keys(cryptoNs).sort(),
  namespaceTypes: Object.fromEntries(Object.keys(cryptoNs).sort().map(k => [k, typeof cryptoNs[k]])),
}));
`);

// 「shim」：ESM，带 default + 具名导出
writeFileSync(`${dir}/shim.js`, `
const createHash = () => 'hash';
const randomBytes = () => 'bytes';
const randomUUID = () => 'uuid';
const cryptoShim = { createHash, randomBytes, randomUUID };
export default cryptoShim;
export { createHash, randomBytes, randomUUID, cryptoShim };
`);

const bundle = await rolldown({
    input: `${dir}/entry.js`,
    plugins: [{
        name: 'alias-node-crypto',
        resolveId(source) {
            if (source === 'node:crypto') return `${dir}/shim.js`;
            return null;
        },
    }],
    platform: 'browser',
});
const { output } = await bundle.generate({ format: 'esm' });
console.log('=== 打包后的代码 ===');
console.log(output[0].code);
