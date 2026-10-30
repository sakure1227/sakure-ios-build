// scripts/ios/make-ios-source-bundle.mjs
//
// 打包一份**只含 iOS 构建所需内容**的源码，用于传到云端出包。
//
// ## 为什么不直接传整个仓库
//
// 整个仓库 4.7G，但 iOS 构建**用不到**其中绝大部分：
//
// - `node_modules/`（2.0G）—— 云端 `npm ci` 自己装；
// - `build/`（1.1G）—— 里面是 MNN 源码缓存与 `.git`（89M 的 pack 文件），桌面端用；
// - `release/`（812M）—— 桌面版的构建产物（.exe、win-unpacked）；
// - `models/`（127M）—— 桌面版的模型文件（.wgsl.bin）；
// - `dist/`、`dist-mobile/`（57M）—— 构建产物，云端自己编；
// - `android/`（147M）—— Android 工程与它的 gradle 缓存。
//
// 去掉这些之后只剩 **~110MB**，上传快得多，也不会撞上 GitHub 的仓库体积限制
// （单文件 100MB / 仓库建议 1GB 以内）。
//
// ## 打包了什么
//
// - `src/`、`mobile/`、`ios-plugins/`、`scripts/ios/`、`dev/`、`api-ts/`、`electron/`
//   —— 渲染层与构建脚本；
// - `ios/` —— iOS 工程（**含我们同步好的三个插件与类名清单**）；
// - `package.json`、`package-lock.json`、`capacitor.config.ts`、`vite.config.ts`、
//   `tsconfig.json`、`index.html`；
// - `.github/workflows/ios-ipa.yml` —— 云端构建工作流；
// - `build/seed/userSources.json` —— 预置的音乐源（**要**：手机版启动时要读）。
//
// ## 用法
//
// ```bash
// node scripts/ios/make-ios-source-bundle.mjs
// ```
//
// 产物：`dist-ios-bundle/sakure-ios-source.tar.gz`
import { createWriteStream } from 'node:fs';
import { readdirSync, statSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync, cpSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const outDir = resolve(root, 'dist-ios-bundle');
const bundleDir = resolve(outDir, 'sakure-ios-source');
const tarPath = resolve(outDir, 'sakure-ios-source.tar.gz');

/** 要整个拷过去的目录。 */
const DIRS = [
    'src',
    'mobile',
    'ios-plugins',
    'scripts',
    'dev',
    'api-ts',
    'electron',
    'ios',
    'public',
    // ↓ 这几个漏了会让云端构建挂在「构建渲染层」那一步
    //
    // `shared/` 与 `assets/` 在**仓库根目录**（跟 src/ 平级），不是 src/ 里面 ——
    // 源码里是 `import ... from '../../shared/ai/providerRegistry.mjs'` 这种路径。
    'shared',
    'assets',
    // `stage-client.html` 的入口脚本在 test/manual/stage-client/ 里
    'test',
];

/** 要整个拷过去的文件。 */
const FILES = [
    'package.json',
    'package-lock.json',
    'capacitor.config.ts',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.node.json',
    '.gitignore',
    // ★ postcss.config.js —— 少了它**云端构建出的界面全是「裸」的**。
    //
    // Tailwind 不在 vite.config.ts 里配插件，而是走 PostCSS（`@tailwindcss/postcss`）。
    // 配置文件不在包�� → 云端没有 Tailwind → `@import "tailwindcss"` 里的
    // utility 类一个都不生成 → `flex` / `absolute` / `inset-0` 这些全失效 →
    // 界面元素按文档流堆在左上角、互相压着。
    //
    // 这个坑很难从云端的日志看出来：构建**成功**了，只是 CSS 里少了东西。
    // 判据是拆开 IPA 看 `assets/src-*.css` 里有几个 `.flex`（正常的应该有）。
    'postcss.config.js',
];

/**
 * Vite 的 HTML 入口 —— **从 vite.config.ts 里读出来**，别手写清单。
 *
 * 为什么不能手写：`vite.config.ts` 的 `build.rollupOptions.input` 里配了几个
 * HTML，就有几个入口，少一个都会构建失败：
 *
 * ```
 * [UNRESOLVED_ENTRY] Cannot resolve entry module stage-client.html.
 * [UNRESOLVED_ENTRY] Cannot resolve entry module mod-export.html.
 * ```
 *
 * 这个坑踩过一次：手工清单里只有 `index.html`，另外两个入口漏了，
 * 云端构建在第 6 步「构建渲染层」直接挂掉。**从配置里读，才不会再漏。**
 */
const viteConfig = readFileSync(resolve(root, 'vite.config.ts'), 'utf8');
const inputBlock = viteConfig.match(/input:\s*\{([^}]*)\}/s);
const htmlEntries = [];
if (inputBlock) {
    for (const m of inputBlock[1].matchAll(/'([^']+\.html)'/g)) {
        htmlEntries.push(m[1]);
    }
}
if (!htmlEntries.length) {
    console.error('❌ 没能从 vite.config.ts 里解析出 HTML 入口 —— 配置格式变了？');
    process.exit(1);
}
console.log(`▶ Vite 入口: ${htmlEntries.join(', ')}`);
FILES.push(...htmlEntries);

/** 单个要拷的文件（目录里的特定文件）。 */
const SPECIAL = [
    'build/seed/userSources.json',
    '.github/workflows/ios-ipa.yml',
];

/**
 * `build/` 目录里被源码 import 的资源 —— **扫出来**，别手写。
 *
 * 整个 `build/` 目录不进包（里面有桌面端的 MNN 源码缓存、ffmpeg 之类的大东西），
 * 但源码里确实 import 了几个图（`import icon from '../../../build/icon.png'`）。
 * 少了它们 Vite 构建会报 `Could not resolve '../../../build/icon.png'`。
 *
 * 所以扫一遍 src/ 与 mobile/，把引用到的 `build/xxx` 找出来，只拷这些。
 */
const BUILD_RESOURCES = [];
{
    const importPattern = /(?:from|import)\s*\(?\s*["']([^"']*\/build\/[^"']+)["']/g;
    const findIn = (dir) => {
        if (!existsSync(dir)) return;
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                findIn(full);
            } else if (entry.isFile() && /\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
                const content = readFileSync(full, 'utf8');
                for (const m of content.matchAll(importPattern)) {
                    // 规范化成相对仓库根的路径
                    const rel = relative(root, resolve(dirname(full), m[1]));
                    if (!rel.startsWith('..') && existsSync(resolve(root, rel))) {
                        BUILD_RESOURCES.push(rel.replace(/\\/g, '/'));
                    }
                }
            }
        }
    };
    findIn(resolve(root, 'src'));
    findIn(resolve(root, 'mobile'));
}
const uniqueBuildResources = [...new Set(BUILD_RESOURCES)];
if (uniqueBuildResources.length) {
    console.log(`▶ build/ 里被引用的资源: ${uniqueBuildResources.join(', ')}`);
}

/**
 * 不拷的东西 —— 构建用不到，或者体积大得没道理。
 *
 * 命名规则：拷贝时凡是命中这里的都跳过。
 */
const SKIP_DIRS = new Set([
    'node_modules',
    '.git',
    'dist',
    'dist-mobile',
    'release',
    'models',
    'android',
    '.workbuddy',
    '.vite',
    '.turbo',
    'coverage',
    'build/.mnn-src',
]);

/** 大文件上限：超过这个的单独列出来，人工看一眼（多半是桌面端的资源）。 */
const BIG_FILE = 8 * 1024 * 1024;

const copyRecursive = (from, to) => {
    const entries = readdirSync(from, { withFileTypes: true });
    for (const entry of entries) {
        const src = join(from, entry.name);
        const dst = join(to, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            mkdirSync(dst, { recursive: true });
            copyRecursive(src, dst);
        } else if (entry.isFile()) {
            mkdirSync(dirname(dst), { recursive: true });
            writeFileSync(dst, readFileSync(src));
        }
    }
};

console.log('▶ 打包 iOS 构建所需的源码…');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(bundleDir, { recursive: true });

let copied = 0;
let skipped = 0;

for (const dir of DIRS) {
    const from = resolve(root, dir);
    if (!existsSync(from)) {
        console.log(`  跳过（不存在）: ${dir}`);
        continue;
    }
    const to = resolve(bundleDir, dir);
    mkdirSync(to, { recursive: true });
    copyRecursive(from, to);
    copied += 1;
}

for (const file of FILES) {
    const from = resolve(root, file);
    if (!existsSync(from)) continue;
    const to = resolve(bundleDir, file);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, readFileSync(from));
    copied += 1;
}

// 被源码 import 的 build/ 资源（整个 build/ 目录不进包，只带这些）。
for (const file of uniqueBuildResources) {
    const from = resolve(root, file);
    if (!existsSync(from)) continue;
    const to = resolve(bundleDir, file);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, readFileSync(from));
    copied += 1;
}

// ★ `@capacitor/ios/Package.swift` —— 源码 target 的定义 ★
//
// 它是 `scripts/ios/use-source-capacitor.mjs` **生成**的（node_modules 整个不进包，
// 所以这个文件不会跟着走）。但没有它，CapApp-SPM 指向的本地 path 依赖就找不到 ——
// 云端会报「failed to load package」。
//
// 所以这里把它拷进包里的对应位置。
{
    const generated = resolve(root, 'node_modules', '@capacitor', 'ios', 'Package.swift');
    if (existsSync(generated)) {
        const to = resolve(bundleDir, 'node_modules', '@capacitor', 'ios', 'Package.swift');
        mkdirSync(dirname(to), { recursive: true });
        writeFileSync(to, readFileSync(generated));
        copied += 1;
        console.log('  ✓ 带上 @capacitor/ios/Package.swift（源码 target 定义）');
    } else {
        console.warn('  ⚠ 没找到 node_modules/@capacitor/ios/Package.swift ——');
        console.warn('    跑一次 node scripts/ios/sync-ios-plugins.mjs 生成它。');
    }
}

for (const file of SPECIAL) {
    const from = resolve(root, file);
    if (!existsSync(from)) {
        console.warn(`  ⚠ 少了 ${file} —— 少了它构建可能不完整`);
        continue;
    }
    const to = resolve(bundleDir, file);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, readFileSync(from));
    copied += 1;
}

// `ios/App/public` 是 `cap sync` 的产物（渲染层）。它已经在 `ios/` 里了 ——
// 但那是**上一次** sync 的版本。云端会重新 sync，所以留着也无妨。
// 这里把 `dist-mobile` 也放一份，让云端万一跳过 sync 也有得用。
const distMobile = resolve(root, 'dist-mobile');
if (existsSync(distMobile)) {
    cpSync(distMobile, resolve(bundleDir, 'dist-mobile'), { recursive: true });
    copied += 1;
}

// 报一下大文件（多半是桌面端的资源，iOS 用不到）。
const bigFiles = [];
const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full);
        } else if (entry.isFile() && statSync(full).size > BIG_FILE) {
            bigFiles.push(`${(statSync(full).size / 1024 / 1024).toFixed(1)}M  ${relative(bundleDir, full)}`);
        }
    }
};
walk(bundleDir);
if (bigFiles.length) {
    console.log('\n  包里有几个大文件（云端上传会慢一点，但不影响构建）：');
    bigFiles.forEach(line => console.log(`    ${line}`));
}

// 打个说明文件：告诉云端上的人这是什么东西、怎么构建。
writeFileSync(
    resolve(bundleDir, 'BUILD-README.md'),
    `# Sakure iOS 构建源码包

这是**只含 iOS 构建所需内容**的源码（从完整仓库里精简出来的）。

## 怎么构建

\`\`\`bash
npm ci
node mobile/build-mobile.mjs      # 构建渲染层
npx cap sync ios                   # 同步进 iOS 工程
node scripts/ios/sync-ios-plugins.mjs   # 同步三个原生插件（关键，别漏）
node scripts/ios/check-xcode-project.mjs  # 校验工程结构
xcodebuild -project ios/App/App.xcodeproj -scheme App \\
  -configuration Release -sdk iphoneos \\
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY= build
\`\`\`

产出的 .app 收成未签名 IPA：

\`\`\`bash
mkdir -p Payload && cp -R <产物>/App.app Payload/
zip -qry Sakure.ipa Payload
\`\`\`

## 少了什么

整仓库里的 \`node_modules\`、\`build/\`、\`release/\`、\`models/\`、\`dist*\`、
\`android/\` 都没打包 —— 它们跟 iOS 构建无关（构建产物、桌面端资源、
Android 工程）。云端会自己 \`npm ci\`。
`,
    'utf8'
);

// ── 自检：包里缺文件，云端就会挂在「构建渲染层」那一步 ────────────
//
// 缺文件的报错长这样：
//
//   [UNRESOLVED_ENTRY] Cannot resolve entry module stage-client.html.
//   [UNRESOLVED_IMPORT] Could not resolve '../../shared/ai/providerRegistry.mjs'
//
// 这种错在云端要等 3 分钟排队 + 跑一遍才发现，代价太高。
// 所以在这里**静态校验**：把 vite 入口 HTML 里引用的脚本、
// 以及源码里所有相对路径 import 都查一遍，看文件在不在包里。
console.log('\n▶ 自检：检查包里有没有缺文件…');
const missing = [];
const bundleHas = (rel) => existsSync(resolve(bundleDir, rel));

// ① vite 的 HTML 入口：HTML 里 <script src="..."> 指向的文件
for (const html of htmlEntries) {
    const htmlPath = resolve(bundleDir, html);
    if (!existsSync(htmlPath)) {
        missing.push(`${html}（入口 HTML 本身不在包里）`);
        continue;
    }
    const content = readFileSync(htmlPath, 'utf8');
    for (const m of content.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
        const src = m[1];
        if (src.startsWith('/') || src.startsWith('http')) continue;
        const rel = src.replace(/^\.\//, '');
        if (!bundleHas(rel)) {
            missing.push(`${html} → ${src}`);
        }
    }
}

// ② 源码里的相对路径 import（../../shared/... 这种）
const importRe = /(?:from|import)\s*\(?\s*["'](\.[^"']+)["']/g;
const scanDir = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(full);
        } else if (entry.isFile() && /\.(ts|tsx|js|mjs|cjs|vue)$/.test(entry.name)) {
            const content = readFileSync(full, 'utf8');
            for (const rawLine of content.split('\n')) {
                // **跳过注释行** —— 注释里写的 import 路径（比如说明文档里
                // 举例的 `./sourceHost`）不是真的依赖，误报会掩盖真问题。
                const line = rawLine.trim();
                if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) {
                    continue;
                }
                for (const m of line.matchAll(importRe)) {
                    const spec = m[1];
                    // 去掉查询串与 hash
                    const clean = spec.split('?')[0].split('#')[0];
                    const target = resolve(dirname(full), clean);
                    // 允许省略扩展名（TS 的写法）
                    const candidates = [
                        target,
                        `${target}.ts`,
                        `${target}.tsx`,
                        `${target}.js`,
                        `${target}.mjs`,
                        `${target}.cjs`,
                        `${target}.json`,
                        `${target}.png`,
                        `${target}.jpg`,
                        `${target}.svg`,
                        resolve(dirname(full), clean, 'index.ts'),
                        resolve(dirname(full), clean, 'index.tsx'),
                        resolve(dirname(full), clean, 'index.js'),
                    ];
                    if (!candidates.some((c) => existsSync(c) && c.startsWith(bundleDir))) {
                        missing.push(`${relative(bundleDir, full)} → ${spec}`);
                    }
                }
            }
        }
    }
};
scanDir(resolve(bundleDir, 'src'));
scanDir(resolve(bundleDir, 'mobile'));
scanDir(resolve(bundleDir, 'shared'));

// ③ ★ 构建链上必需的配置文件。
//
// 这类文件缺了**不会让构建失败**，只会让构建出来的界面是坏的 —— 所以前面
// 那个「缺文件」的自检抓不到它们，得单独列出来查。
//
// 典型：少了 `postcss.config.js` → 没有 Tailwind → 所有 utility 类不生成 →
// 界面元素按文档流堆在左上角、互相压着。构建日志里**完全看不出来**。
const REQUIRED_BUILD_FILES = [
    ['package.json', '依赖清单'],
    ['package-lock.json', '锁定版本'],
    ['vite.config.ts', '构建配置'],
    ['capacitor.config.ts', 'Capacitor 配置'],
    ['postcss.config.js', 'Tailwind 的 PostCSS 插件配置（少了它界面全是裸的）'],
    ['tsconfig.json', 'TS 配置'],
];
for (const [file, why] of REQUIRED_BUILD_FILES) {
    if (!bundleHas(file)) missing.push(`${file}（${why}）`);
}

if (missing.length) {
    console.error(`\n❌ 包里缺 ${missing.length} 个文件（云端构建会失败，或界面会是坏的）：`);
    // 去重，最多列 25 条
    [...new Set(missing)].slice(0, 25).forEach(line => console.error(`   ${line}`));
    console.error('\n把缺的文件补进 DIRS / FILES 清单后重新打包。');
    process.exit(1);
}
console.log('   ✅ 没有缺文件');

// 打成 tar.gz。
console.log('\n▶ 压缩…');
// 用**相对路径** + `cwd` —— tar 把 `D:` 里的冒号当成「远程主机」的分隔符，
// 于是 `tar -czf D:\...` 会被理解成「连到主机 D」而失败。
const tar = spawn('tar', ['-czf', 'sakure-ios-source.tar.gz', 'sakure-ios-source'], {
    cwd: outDir,
    stdio: 'inherit',
});
await new Promise((res, rej) => {
    tar.on('close', code => (code === 0 ? res() : rej(new Error(`tar 退出码 ${code}`))));
    tar.on('error', rej);
});

const size = statSync(tarPath).size;
console.log('\n========================================');
console.log(`✅ 打包完成: ${tarPath}`);
console.log(`   大小: ${(size / 1024 / 1024).toFixed(1)} MB`);
console.log(`   内容: ${copied} 个目录/文件`);
console.log('========================================');
console.log('\n把这个 tar.gz 传到云端 macOS runner 上解包就能构建。');
