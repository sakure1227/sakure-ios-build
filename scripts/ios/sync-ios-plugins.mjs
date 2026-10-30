// scripts/ios/sync-ios-plugins.mjs
//
// 把 `ios-plugins/*.swift` 同步进 iOS 工程。
//
// ## 做三件事
//
// 1. **拷贝**插件源码到 `ios/App/App/Plugins/`。
// 2. **加进 Xcode 工程**（`project.pbxproj`）：文件引用 + 编译条目 + 组 + 编译源列表。
// 3. **注册类名**到 `ios/App/App/capacitor.config.json` 的 `packageClassList`。
//
// ## 第 ③ 步是关键（不看它会以为插件没生效）
//
// Capacitor iOS 8 靠 `capacitor.config.json` 里的 `packageClassList` 找插件：
// 那个清单是**类名**（不是 JS 名），运行时用 `NSClassFromString` 逐个实例化
// （见 `node_modules/@capacitor/ios/Capacitor/Capacitor/CapacitorBridge.swift`
// 的 `registerPlugins()`）。
//
// 清单是 `npx cap sync ios` **自动生成**的 —— 它只认 `@capacitor/*` 那套 npm 包，
// 不认我们放在仓库里的这三个。所以每次 sync 之后都要重新追加。
//
// ## 为什么要放在 `ios-plugins/` 而不是 `ios/App/App/Plugins/`
//
// `npx cap add ios` 会**整个重建** `ios/` 目录 —— 放在里面的插件文件会被删掉。
// 源码放在 `ios-plugins/`（仓库外层），由这个脚本拷进去，就不会再丢。
//
// 用法：node scripts/ios/sync-ios-plugins.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

const sourceDir = resolve(root, 'ios-plugins');
const targetDir = resolve(root, 'ios', 'App', 'App', 'Plugins');
const pbxprojPath = resolve(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const configPath = resolve(root, 'ios', 'App', 'App', 'capacitor.config.json');

if (!existsSync(sourceDir)) {
    console.error(`插件源码目录不存在: ${sourceDir}`);
    process.exit(1);
}
if (!existsSync(pbxprojPath)) {
    console.error(`Xcode 工程不存在: ${pbxprojPath}（先跑 npx cap add ios）`);
    process.exit(1);
}

const pluginFiles = readdirSync(sourceDir).filter(name => name.endsWith('.swift')).sort();
if (pluginFiles.length === 0) {
    console.error('ios-plugins/ 里没有 .swift 文件');
    process.exit(1);
}

// ① 拷贝到工程里。
mkdirSync(targetDir, { recursive: true });
for (const name of pluginFiles) {
    copyFileSync(resolve(sourceDir, name), resolve(targetDir, name));
}
console.log(`① 已拷贝 ${pluginFiles.length} 个插件到 ios/App/App/Plugins/`);

// ② 加进 Xcode 工程。
let pbxproj = readFileSync(pbxprojPath, 'utf8');

const usedIds = new Set();
for (const match of pbxproj.matchAll(/\b([0-9A-F]{24})\b/g)) {
    usedIds.add(match[1]);
}
let idCounter = 0;
const nextId = () => {
    idCounter += 1;
    // **必须是 24 位**（Xcode 的 object ID 就是 24 位十六进制）。
    // 少一位 Xcode 就不认这个对象，打开工程时直接报「对象缺失」。
    //
    // 用字符串拼而不是十六进制数字算 —— 24 位十六进制超出了 JS 的安全整数范围
    // （2^53），拿数字算会失真，拼出来的 ID 会被截短。
    const prefix = 'AB12000000000000';
    for (let attempt = 0; attempt < 100000; attempt += 1) {
        const suffix = (idCounter * 1000 + attempt).toString(16).toUpperCase().padStart(8, '0');
        const candidate = `${prefix}${suffix}`;
        if (candidate.length !== 24) {
            throw new Error(`生成的 object ID 长度不对: ${candidate.length}（要 24）`);
        }
        if (!usedIds.has(candidate)) {
            usedIds.add(candidate);
            return candidate;
        }
    }
    throw new Error('找不到没被占用的 object ID');
};

// 自愈：清掉上一轮插进来的东西（半成品会让 Xcode 打不开工程）。
const OUR_ID_PREFIX = 'AB1200000000';
const removeGroupBlock = (text) => {
    const lines = text.split('\n');
    const out = [];
    let inside = false;
    for (const line of lines) {
        if (!inside && /\/\* Plugins \*\/ = \{$/.test(line.trim())) {
            inside = true;
            continue;
        }
        if (inside) {
            if (/^\t+\};$/.test(line)) inside = false;
            continue;
        }
        out.push(line);
    }
    return out.join('\n');
};
pbxproj = removeGroupBlock(pbxproj);
pbxproj = pbxproj
    .split('\n')
    .filter(line => !line.includes(OUR_ID_PREFIX) && !/\/\* Plugins \*\/,$/.test(line.trim()))
    .join('\n');

const fileIds = new Map();
const buildIds = new Map();
for (const name of pluginFiles) {
    fileIds.set(name, nextId());
    buildIds.set(name, nextId());
}

// PBXBuildFile 段
const buildLines = pluginFiles
    .map(name => `\t\t${buildIds.get(name)} /* ${name} in Sources */ = {isa = PBXBuildFile; fileRef = ${fileIds.get(name)} /* ${name} */; };`)
    .join('\n');
pbxproj = pbxproj.replace(
    '/* Begin PBXBuildFile section */',
    `/* Begin PBXBuildFile section */\n${buildLines}`
);

// PBXFileReference 段
const fileLines = pluginFiles
    .map(name => `\t\t${fileIds.get(name)} /* ${name} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${name}; sourceTree = "<group>"; };`)
    .join('\n');
pbxproj = pbxproj.replace(
    '/* Begin PBXFileReference section */',
    `/* Begin PBXFileReference section */\n${fileLines}`
);

// PBXGroup 段：组定义 + 挂进 App 组
const groupId = nextId();
const groupChildren = pluginFiles.map(name => `\t\t\t\t${fileIds.get(name)} /* ${name} */,`).join('\n');
const groupBlock = [
    `\t\t${groupId} /* Plugins */ = {`,
    '\t\t\tisa = PBXGroup;',
    '\t\t\tchildren = (',
    groupChildren,
    '\t\t\t);',
    '\t\t\tpath = Plugins;',
    '\t\t\tsourceTree = "<group>";',
    '\t\t};',
].join('\n');
pbxproj = pbxproj.replace(
    '/* Begin PBXGroup section */',
    `/* Begin PBXGroup section */\n${groupBlock}`
);

const appGroupMatch = pbxproj.match(/([0-9A-F]{24}) \/\* App \*\/ = \{\n\t+isa = PBXGroup;\n\t+children = \(\n([\s\S]*?)\n\t+\);/);
if (!appGroupMatch) {
    console.error('在 project.pbxproj 里找不到 App 组 —— 工程结构可能变了，得手工加。');
    process.exit(1);
}
pbxproj = pbxproj.replace(
    appGroupMatch[0],
    appGroupMatch[0].replace(
        /children = \(\n([\s\S]*?)\n(\t+)\);/,
        `children = (\n$1\n\t\t\t\t${groupId} /* Plugins */,\n$2);`
    )
);

// PBXSourcesBuildPhase 段
const sourceLines = pluginFiles
    .map(name => `\t\t\t\t${buildIds.get(name)} /* ${name} in Sources */,`)
    .join('\n');
pbxproj = pbxproj.replace(
    /(\/\* Begin PBXSourcesBuildPhase section \*\/[\s\S]*?files = \(\n)/,
    `$1${sourceLines}\n`
);

writeFileSync(pbxprojPath, pbxproj, 'utf8');
console.log('② 已把插件加进 Xcode 工程');

// ③ 注册类名到 packageClassList。
//
// 清单里是**类名**（`NSClassFromString` 用的），不是 JS 名。
// 从插件源码里扫 `@objc(类名)` 注解拿 —— 那是 Objective-C 运行时看到的名字。
const classNames = [];
for (const name of pluginFiles) {
    const source = readFileSync(resolve(sourceDir, name), 'utf8');
    const match = source.match(/@objc\((\w+)\)/);
    if (!match) {
        console.error(`${name} 里没有 @objc(...) 注解 —— Capacitor 找不到它`);
        process.exit(1);
    }
    classNames.push(match[1]);
}

if (!existsSync(configPath)) {
    console.error(`capacitor.config.json 不存在: ${configPath}`);
    process.exit(1);
}
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const existing = new Set(config.packageClassList || []);
const before = existing.size;
for (const className of classNames) {
    existing.add(className);
}
config.packageClassList = [...existing].sort();
writeFileSync(configPath, `${JSON.stringify(config, null, '\t')}\n`, 'utf8');
console.log(`③ 已注册类名: ${classNames.join(', ')}（清单从 ${before} 个变成 ${config.packageClassList.length} 个）`);

// ④ ★ 把官方插件的 Capacitor 版本范围锁成 exact ★
//
// ## 为什么必须做这一步
//
// 每个官方插件在 SPM 里是**独立的 package**（Capacitor CLI 会给它们各生成一个
// Xcode project）。它们自己的 Package.swift 里写的是：
//
//     .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
//
// `from: "8.0.0"` 是**开放范围** —— 各自独立解析时会拿到「当下最新的 8.x」。
// 而 `CapApp-SPM` 里写的是 `exact: "8.0.2"`。
//
// 结果：**同名 Swift 模块 `Capacitor` 在同一个构建里混进了两个版本**。
// 编译插件时链接到的是新版本（8.6.x）的二进制，于是：
//
//     value of type 'any CAPBridgeProtocol' has no member 'webView'
//     value of type 'CAPPluginCall' has no member 'reject'
//
// —— **类型可见（两个版本都有这个类型），成员不可见（8.6 改了 API）**。
// 实测 30 个错误，全部落在 8 个官方插件里，我们自己的代码零错误。
//
// 把所有插件的约束统一成 `exact`，整个构建里就只有一个 Capacitor。
const coreVersion = (() => {
    // CapApp-SPM 里的 exact 版本就是权威值 —— 它跟着 @capacitor/core 走。
    // 如果之前被换成过本地 path 依赖，就从 @capacitor/core 的版本号推出来。
    const capAppSpm = resolve(root, 'ios', 'App', 'CapApp-SPM', 'Package.swift');
    if (!existsSync(capAppSpm)) return null;
    const text = readFileSync(capAppSpm, 'utf8');
    const exact = text.match(/capacitor-swift-pm\.git",\s*exact:\s*"([^"]+)"/);
    if (exact) return exact[1];
    // 回退：本地 path 依赖时，从 @capacitor/core 的版本号取。
    // （core 在 devDependencies 还是 dependencies 里都不一定，两处都找。）
    try {
        const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
        const raw =
            pkg.dependencies?.['@capacitor/core'] ??
            pkg.devDependencies?.['@capacitor/core'];
        if (!raw) return null;
        // 去掉 ^ / ~ 前缀 —— SPM 的 exact 要的是裸版本号。
        return raw.replace(/^[\^~]/, '');
    } catch {
        return null;
    }
})();

if (!coreVersion) {
    console.warn('⚠ 没能确定 Capacitor 版本 —— 跳过版本锁定');
} else {
    const pluginsDir = resolve(root, 'node_modules', '@capacitor');
    let locked = 0;

    // ① CapApp-SPM 自己的依赖也重置（它可能被上一轮改成本地 path 依赖）。
    const capAppSpm = resolve(root, 'ios', 'App', 'CapApp-SPM', 'Package.swift');
    if (existsSync(capAppSpm)) {
        const before = readFileSync(capAppSpm, 'utf8');
        const after = before.replace(
            /\.package\(\s*(?:url:\s*"https:\/\/github\.com\/ionic-team\/capacitor-swift-pm\.git",\s*(?:from:\s*"[^"]+"|exact:\s*"[^"]+"|\.upToNextMajor\([^)]*\)|"[^"]+")|name:\s*"capacitor-swift-pm",\s*path:\s*"[^"]+")\s*\)/g,
            `.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "${coreVersion}")`
        );
        if (after !== before) {
            writeFileSync(capAppSpm, after, 'utf8');
            locked += 1;
        }
    }

    // ② 每个官方插件。
    if (existsSync(pluginsDir)) {
        for (const plugin of readdirSync(pluginsDir)) {
            const manifest = resolve(pluginsDir, plugin, 'Package.swift');
            if (!existsSync(manifest)) continue;
            const before = readFileSync(manifest, 'utf8');
            // 无论是「远端 + 版本范围」还是「本地 path 依赖」，一律重置成
            // 远端 + exact —— 这样反复跑 sync 的结果是一致的。
            const after = before.replace(
                /\.package\(\s*(?:url:\s*"https:\/\/github\.com\/ionic-team\/capacitor-swift-pm\.git",\s*(?:from:\s*"[^"]+"|exact:\s*"[^"]+"|\.upToNextMajor\([^)]*\)|"[^"]+")|name:\s*"capacitor-swift-pm",\s*path:\s*"[^"]+")\s*\)/g,
                `.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "${coreVersion}")`
            );
            if (after !== before) {
                writeFileSync(manifest, after, 'utf8');
                locked += 1;
            }
        }
    }
    console.log(`④ 已把 ${locked} 个官方插件的 Capacitor 依赖重置成 exact: "${coreVersion}"`);
}

// ⑤ （源码 target 方案暂时停用）
//
// 想把 core 换成 `@capacitor/ios` 的**源码**来编译，彻底绕开 binaryTarget。
// 但 SPM 的一个 product 无法同时包含 ObjC target 和 Swift target，而
// Capacitor 的 36 个 Swift 文件全都写着 `import Capacitor` ——
// 拆成两个 target 就得改这些 import，不可行。所以这条路先留着，不启用。
//
// 真正解决问题的是 workflow 里的「Strip the binary Swift module」那一步。
if (process.env.SAKURE_SOURCE_CAPACITOR === '1') {
    const script = resolve(root, 'scripts', 'ios', 'use-source-capacitor.mjs');
    if (existsSync(script)) {
        const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
        const output = `${result.stdout || ''}${result.stderr || ''}`;
        output.split('\n').filter(line => /^[①②]/.test(line.trim())).forEach(line => console.log(line.trim()));
        if (result.status !== 0) {
            console.warn('⚠ 换成本地源码失败：');
            console.warn(output.split('\n').slice(-6).join('\n'));
        }
    }
}

console.log('\n完成。');

