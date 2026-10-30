#!/usr/bin/env node
/**
 * 把 iOS 工程从「预编译的 capacitor-swift-pm.xcframework」改成「本地源码 target」。
 *
 * ## 为什么这么做
 *
 * `capacitor-swift-pm` 提供的 Capacitor core 是一个 **binaryTarget**：
 *
 *     .binaryTarget(
 *         name: "Capacitor",
 *         url: ".../releases/download/8.0.2/Capacitor.xcframework.zip",
 *         checksum: "..."
 *     )
 *
 * 编译时看到的是那份预编译二进制里的 API —— Swift 编译器优先读 `.swiftmodule`
 * （二进制快照），而不是 `.swiftinterface`。于是会出现很难查的现象：
 *
 *     value of type 'any CAPBridgeProtocol' has no member 'webView'
 *     value of type 'CAPPluginCall' has no member 'reject'
 *
 * **类型可见、成员不可见** —— 类型在两个版本里都有，成员是新版改过的。
 * 官方插件全部编译失败（实测 30 个错误），而我们自己的代码零错误。
 *
 * 把 core 换成**源码 target** 之后，编译器直接编译 `@capacitor/ios` 里的
 * Swift 源码，所有 API 一定可见 —— 不再依赖任何预编译产物。
 *
 * ## 做了什么
 *
 * 1. 在 `node_modules/@capacitor/ios/` 写一个 `Package.swift`，
 *    把 `Capacitor/Capacitor/` 与 `CapacitorCordova/CapacitorCordova/`
 *    声明成 Swift / ObjC target。
 * 2. 把 `CapApp-SPM/Package.swift` 里的 `capacitor-swift-pm` 依赖
 *    换成本地 path 依赖。
 * 3. 把每个官方插件 `Package.swift` 里的 `capacitor-swift-pm` 依赖
 *    也换成本地 path 依赖（否则它们会各自拉一份远端包，版本又乱了）。
 *
 * @capacitor/ios 包里本来就有完整的 Swift 源码（46 个 .swift 文件）、
 * Cordova 的 ObjC 源码、以及 `Capacitor.modulemap` —— 不用额外下载什么。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');

const iosPkgDir = resolve(root, 'node_modules', '@capacitor', 'ios');
const capSrcDir = resolve(iosPkgDir, 'Capacitor', 'Capacitor');
const cordovaSrcDir = resolve(iosPkgDir, 'CapacitorCordova', 'CapacitorCordova');

if (!existsSync(capSrcDir)) {
    console.error(`❌ 找不到 Capacitor 源码: ${capSrcDir}`);
    console.error('   先跑 npm install。');
    process.exit(1);
}

// ── ① 写 @capacitor/ios 的 Package.swift ──────────────────────────────
const pkgPath = resolve(iosPkgDir, 'Package.swift');
writeFileSync(
    pkgPath,
    `// 由 scripts/ios/use-source-capacitor.mjs 生成 —— 请勿手工编辑。
//
// 用**源码**替代预编译的 capacitor-swift-pm.xcframework。
// 原因：binaryTarget 里那份预编译二进制的 API 快照与插件期望的版本对不上，
// 编译官方插件时报「类型可见但成员不可见」。源码编译没有这个问题。

// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Capacitor",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "Capacitor", targets: ["Capacitor"]),
        .library(name: "Cordova", targets: ["Cordova"])
    ],
    targets: [
        .target(
            name: "Capacitor",
            dependencies: ["Cordova"],
            path: "Capacitor/Capacitor",
            resources: [.copy("assets/native-bridge.js")],
            cSettings: [
                .headerSearchPath("Capacitor")
            ],
            linkerSettings: [
                .unsafeFlags(["-ObjC"])
            ]
        ),
        .target(
            name: "Cordova",
            path: "CapacitorCordova/CapacitorCordova",
            publicHeadersPath: ".",
            cSettings: [
                .headerSearchPath("Classes/Public")
            ]
        )
    ]
)
`,
    'utf8'
);
console.log('① 已生成 @capacitor/ios/Package.swift（源码 target）');

// ── ② 把远端依赖换成本地 path ──────────────────────────────────────
const LOCAL_DEP = '.package(name: "capacitor-swift-pm", path: "../../../node_modules/@capacitor/ios")';

const replaceRemoteDep = (text, label) => {
    // 形如： .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    const pattern = /\.package\(\s*url:\s*"https:\/\/github\.com\/ionic-team\/capacitor-swift-pm\.git"\s*,\s*(?:from:\s*"[^"]+"|exact:\s*"[^"]+"|\.upToNextMajor\([^)]*\)|"[^"]+")\s*\)/g;
    if (!pattern.test(text)) return null;
    const after = text.replace(pattern, LOCAL_DEP);
    return after;
};

// ②a. CapApp-SPM
const capAppSpm = resolve(root, 'ios', 'App', 'CapApp-SPM', 'Package.swift');
if (existsSync(capAppSpm)) {
    const before = readFileSync(capAppSpm, 'utf8');
    const after = replaceRemoteDep(before, 'CapApp-SPM');
    if (after) {
        writeFileSync(capAppSpm, after, 'utf8');
        console.log('② CapApp-SPM 已改用本地源码依赖');
    }
}

// ②b. 每个官方插件
const pluginsDir = resolve(root, 'node_modules', '@capacitor');
let count = 0;
if (existsSync(pluginsDir)) {
    for (const plugin of readdirSync(pluginsDir)) {
        const manifest = resolve(pluginsDir, plugin, 'Package.swift');
        if (!existsSync(manifest)) continue;
        const before = readFileSync(manifest, 'utf8');
        const after = replaceRemoteDep(before, plugin);
        if (after) {
            writeFileSync(manifest, after, 'utf8');
            count += 1;
        }
    }
}
console.log(`② ${count} 个官方插件已改用本地源码依赖`);

console.log('\n完成。core 现在从源码编译，官方插件与它一定匹配。');
