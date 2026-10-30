// scripts/ios/build-ios.mjs
//
// 出 iOS 的 IPA（**必须在 macOS 上跑** —— Xcode 只在 macOS 上有）。
//
// ## 为什么是这个脚本而不是手敲一串命令
//
// 出包要按**顺序**走好几步，漏一步就出不来能用的包：
//
// 1. 装依赖；
// 2. 构建渲染层（`dist-mobile/`）；
// 3. `cap sync ios`（把渲染层拷进 iOS 工程、更新 SPM 依赖）；
// 4. **同步我们自己的三个插件**（`ios-plugins/` → Xcode 工程 + 类名清单）——
//    这一步 `cap sync` 不会做，必须自己来（见 `sync-ios-plugins.mjs`）；
// 5. `xcodebuild` 出包。
//
// 第 ④ 步是最容易漏的：漏了它，编译**照样成功**，但运行时三个原生插件全都
// 「not implemented」—— 音乐搜索发不出请求、登录存不住凭据、锁屏面板没有内容。
// 而且这种错在**装到手机上才暴露**，编译日志里一点痕迹都没有。
//
// ## 用法
//
// ```bash
// node scripts/ios/build-ios.mjs            # 出 Release 的 IPA
// node scripts/ios/build-ios.mjs --debug    # 出 Debug 的（带 Safari Web Inspector）
// ```
//
// 产物：`ios/build/ios/Sakure.ipa`（未签名）—— 拿爱思助手签一下就能装。
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

const isDebug = process.argv.includes('--debug');
const configuration = isDebug ? 'Debug' : 'Release';

// 签名：出的是**未签名**的包（爱思助手自己签）。
//
// `-allowProvisioningUpdates` 不能给 —— 那一项会去找开发者账号要描述文件，
// 自签的包不需要（也不该）碰那一套。
const CODE_SIGN_ARGS = [
    'CODE_SIGN_IDENTITY=""',
    'CODE_SIGNING_REQUIRED=NO',
    'CODE_SIGNING_ALLOWED=NO',
    'CODE_SIGN_ENTITLEMENTS=""',
].join(' ');

const run = (command, args, label) => {
    console.log(`\n▶ ${label}\n  $ ${command} ${args.join(' ')}\n`);
    execSync(command, args, {
        cwd: root,
        stdio: 'inherit',
        // Windows 上是 cmd，Unix 上是 sh —— 用 npm 的 node 跑最稳（跨平台一致）。
        shell: process.platform === 'win32',
    });
};

const node = process.execPath;

// ① 检查环境：这一步在 Windows 上就会直接拦下来（省得白折腾）。
if (process.platform !== 'darwin') {
    console.error(
        '这个脚本要在 macOS 上跑 —— iOS 的 IPA 只能用 Xcode 编（Xcode 只在 macOS 上有）。\n'
        + '\n'
        + '没有 Mac 的话有两条路：\n'
        + '  ① GitHub Actions 云端构建：.github/workflows/ios-ipa.yml（推到仓库后自动出包）\n'
        + '  ② 租一台云 Mac / 用 Codemagic 之类的服务\n'
    );
    process.exit(1);
}

// ② 装依赖。
if (!existsSync(resolve(root, 'node_modules', '@capacitor', 'ios'))) {
    run('npm', ['install'], '装依赖');
}

// ③ 构建渲染层。
run(node, ['mobile/build-mobile.mjs'], '构建手机版渲染层 → dist-mobile/');

// ④ 同步到 iOS 工程（渲染层 + SPM 依赖）。
run('npx', ['cap', 'sync', 'ios'], '同步到 iOS 工程');

// ⑤ 同步我们自己的三个插件（cap sync 不做这一步）。
run(node, ['scripts/ios/sync-ios-plugins.mjs'], '同步三个原生插件进 Xcode 工程');

const buildDir = resolve(root, 'ios', 'build');
mkdirSync(buildDir, { recursive: true });

// ⑥ 出包。
//
// ★ 用 `-project` 而不是 `-workspace`：Capacitor 8 生成的是 `.xcodeproj`
// （SPM 工程），**没有** `.xcworkspace` —— 那是 CocoaPods 工程才有的。
// 写 `-workspace` 会报「找不到工程」。
run(
    'xcodebuild',
    [
        '-project', 'ios/App/App.xcodeproj',
        '-scheme', 'App',
        '-configuration', configuration,
        '-sdk', 'iphoneos',
        '-destination', 'generic/platform=iOS',
        '-derivedDataPath', 'ios/build/DerivedData',
        `CODE_SIGNING_ALLOWED=NO`,
        `CODE_SIGNING_REQUIRED=NO`,
        `CODE_SIGN_IDENTITY=`,
        'ENABLE_BITCODE=NO',
        'build',
    ],
    `Xcode 编译（${configuration}）`
);

// ⑦ 把 .app 收成 IPA。
//
// `xcodebuild` 出的是 `ios/build/DerivedData/Build/Products/<配置>-iphoneos/App.app`。
// IPA 就是那个 .app 加上 `Payload/` 目录再 zip 一下 —— 未签名的那种。
const appPath = resolve(
    root,
    'ios/build/DerivedData/Build/Products',
    `${configuration}-iphoneos`,
    'App.app'
);
if (!existsSync(appPath)) {
    console.error(`编译产物不在预期位置: ${appPath}`);
    process.exit(1);
}

const payloadDir = resolve(buildDir, 'Payload');
execSync(`rm -rf "${payloadDir}"`, { shell: process.platform === 'win32' });
mkdirSync(payloadDir, { recursive: true });
execSync(`cp -R "${appPath}" "${payloadDir}/"`, { shell: process.platform === 'win32' });

const ipaPath = resolve(buildDir, 'ios', 'Sakure.ipa');
execSync(`rm -f "${ipaPath}"`, { shell: process.platform === 'win32' });
execSync(`cd "${payloadDir}/.." && zip -qry "${ipaPath}" Payload`, { shell: process.platform === 'win32' });

console.log('\n========================================');
console.log(`✅ 出包完成: ${ipaPath}`);
console.log(`   大小: ${(statSync(ipaPath).size / 1024 / 1024).toFixed(1)} MB`);
console.log('========================================');
console.log('\n这是**未签名**的包 —— 拿爱思助手签一下就能装到手机上。');
console.log('（iOS 装非商店的包都需要签名：免费账号 7 天有效，或用付费账号。）');
