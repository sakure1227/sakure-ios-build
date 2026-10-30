const fs = require('node:fs');
const path = require('node:path');

// electron/seedSources.cjs
// 新装的 Sakure 自带一个源（星海音乐源），别人不用自己找。
//
// 为什么在这里做，而不是把源写进安装器（NSIS）：
// 用户数据在 %APPDATA%\Sakure\config.json，是应用自己的地盘；安装器写它，
// 就得处理「用户已经有了配置」（不能覆盖）、「装在哪个用户下」（per-user /
// per-machine）、以及时序（安装器写完，用户第一次启动又改了）。
// 让应用在启动时自己看一遍，反而简单：它知道自己的 userData 在哪，也知道
// 用户现在装的是什么。
//
// 规则：
// - 用户还没有任何源 → 装上预置的那个。
// - 用户已经有源了 → **不动**。他装过别的源（或者删过这个源），那是他的意思。
// - 预置的源已经在了 → 不动（升级也不重复装）。

/**
 * 预置源的种子文件在哪儿。
 *
 * 打包后种子文件在 **resources** 里（extraResources），而代码在 resources/app.asar 里
 * —— 所以要从 asar 那一层往外走一级：app.asar 的同级就是 resources。
 * 开发时（没打包）种子文件在 build/seed/ 下，而 app 目录是仓库根。
 */
const seedPath = (appPath) => {
    // app.asar.unpacked / app.asar → 它们的上一级是 resources
    if (/app\.asar/.test(appPath)) {
        return path.join(path.dirname(appPath), 'seed', 'userSources.json');
    }
    // 开发时：仓库根/build/seed
    return path.join(appPath, 'build', 'seed', 'userSources.json');
};

/**
 * 把预置的源装进存储（用户还没有源时）。
 *
 * @param {import('electron-store').ElectronStore} store
 * @param {string} appPath 应用所在目录
 * @returns {{ installed: boolean, reason?: string, name?: string }}
 */
const seedDefaultSources = (store, appPath) => {
    const existing = store.get('userSources');
    if (Array.isArray(existing) && existing.length > 0) {
        return { installed: false, reason: 'the user already has sources' };
    }

    let seed;
    try {
        const file = seedPath(appPath);
        if (!fs.existsSync(file)) return { installed: false, reason: 'no seed file' };
        seed = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        console.warn('[Seed] could not read the seed file:', error?.message || error);
        return { installed: false, reason: 'the seed file is unreadable' };
    }

    const sources = Array.isArray(seed?.sources) ? seed.sources : [];
    if (sources.length === 0) return { installed: false, reason: 'the seed file has no sources' };

    try {
        store.set('userSources', sources);
    } catch (error) {
        console.warn('[Seed] could not write the sources:', error?.message || error);
        return { installed: false, reason: 'the sources could not be written' };
    }

    const name = sources[0]?.name || 'a source';
    console.log(`[Seed] installed ${name}`);
    return { installed: true, name };
};

module.exports = { seedDefaultSources, seedPath };
