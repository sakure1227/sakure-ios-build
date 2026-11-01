#!/usr/bin/env node
/**
 * scripts/ios/fetch-builder-tools.mjs
 *
 * 用 **GitHub REST API** 把 electron-builder 的构建工具链下载到本地缓存。
 *
 * ## 为什么需要它
 *
 * electron-builder 要下载两样东西才能出 NSIS 安装包：
 *
 * - `nsis-3.0.4.1`（NSIS 本体）
 * - `nsis-resources-3.0.4.1`（插件，含多语言）
 * - `winCodeSign-2.6.0`（签名工具）
 *
 * 它们的下载地址是 `github.com/electron-userland/electron-builder-binaries/releases/...`
 * —— 而**这台机器连不上 `github.com`**：
 *
 * - 出口 IP 是机房 IP，被 DataDome 判成机器人（网页 403，curl 直接连不上）
 * - 实测 `curl` 返回 `000`（连接失败），electron-builder 报 `502 Bad Gateway`
 *
 * 但 **`api.github.com` 是通的**（仓库元数据 200）——
 * 同一个仓库、同一个 IP，只有 `github.com` 那条路被挡了。
 *
 * ## 这条路怎么走
 *
 * GitHub 的 release 资产可以用 REST API 直接取**内容**：
 *
 *     GET /repos/{owner}/{repo}/releases/assets/{asset_id}
 *     Accept: application/octet-stream
 *
 * 响应体就是文件本身（不是 JSON）。下载下来放进 electron-builder 的归档缓存
 * （`<缓存目录>/<release 名>/<文件名>`），`downloadAndExtract` 会先查那里，
 * 命中就不联网了。
 *
 * ## 用法
 *
 *     node scripts/ios/fetch-builder-tools.mjs
 *
 * 缓存目录默认 `D:/sakure/.cache/electron-builder`（可用 `ELECTRON_BUILDER_CACHE` 改）。
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const API = 'https://api.github.com';
const REPO = 'electron-userland/electron-builder-binaries';

/** 要下载的工具链：release 标签 + 里面的文件名。 */
const TOOLSETS = [
    { release: 'nsis-3.0.4.1', files: ['nsis-3.0.4.1.7z'] },
    // resources 的版本号跟 nsis 本体**不是一套**（本体 3.0.4.1，resources 3.4.1）——
    // 照着本体写会 404。
    { release: 'nsis-resources-3.4.1', files: ['nsis-resources-3.4.1.7z'] },
    { release: 'winCodeSign-2.6.0', files: ['winCodeSign-2.6.0.7z'] },
];

const cacheRoot = resolve(process.env.ELECTRON_BUILDER_CACHE || 'D:/sakure/.cache/electron-builder');

const H = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'sakure-build',
};

const getJson = async (url) => {
    const res = await fetch(url, { headers: H });
    if (!res.ok) {
        throw new Error(`${url} → HTTP ${res.status}`);
    }
    return res.json();
};

/**
 * 下载一个 release 资产的内容。
 *
 * `Accept: application/octet-stream` 让 API 直接返回文件内容（而不是 JSON 里的
 * `browser_download_url` —— 那条路是连不上的 `github.com`）。
 */
const downloadAsset = async (assetId, target) => {
    const res = await fetch(`${API}/repos/${REPO}/releases/assets/${assetId}`, {
        headers: { ...H, Accept: 'application/octet-stream' },
        redirect: 'follow',
    });
    if (!res.ok) {
        throw new Error(`asset ${assetId} → HTTP ${res.status}`);
    }
    await pipeline(Readable.fromWeb(res.body), createWriteStream(target));
};

const main = async () => {
    mkdirSync(cacheRoot, { recursive: true });
    console.log(`▶ 缓存目录: ${cacheRoot}`);

    for (const toolset of TOOLSETS) {
        const releaseDir = join(cacheRoot, toolset.release);
        mkdirSync(releaseDir, { recursive: true });

        const release = await getJson(`${API}/repos/${REPO}/releases/tags/${toolset.release}`);
        const assets = new Map((release.assets || []).map(asset => [asset.name, asset]));

        for (const fileName of toolset.files) {
            const target = join(releaseDir, fileName);
            if (existsSync(target) && statSync(target).size > 0) {
                console.log(`  ✓ 已有 ${fileName}（${(statSync(target).size / 1024 / 1024).toFixed(1)} MB）`);
                continue;
            }
            const asset = assets.get(fileName);
            if (!asset) {
                console.error(`  ✗ ${toolset.release} 里没有 ${fileName}`);
                process.exit(1);
            }
            console.log(`  ↓ 下载 ${fileName}（${(asset.size / 1024 / 1024).toFixed(1)} MB）…`);
            await downloadAsset(asset.id, target);
            console.log(`  ✓ ${fileName}`);
        }
    }

    console.log('\n✅ 工具链齐了');
    console.log('   现在可以跑：ELECTRON_BUILDER_BINARIES_DOWNLOAD_OVERRIDE_URL 不用设，');
    console.log('   electron-builder 会命中这个缓存。');
};

main().catch((error) => {
    console.error('❌', error);
    process.exit(1);
});
