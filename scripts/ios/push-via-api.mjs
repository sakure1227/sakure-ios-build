#!/usr/bin/env node
/**
 * 用 GitHub REST API 上传文件（绕过 git push）。
 *
 * ## 为什么不用 git push
 *
 * 走 git 协议（https://github.com/...）在这个网络环境下**极不稳定**：
 * 反复出现 `CONNECT tunnel failed, response 502` 和
 * `TLS connect error: unexpected eof while reading`。
 * 而同一时刻 `api.github.com` 的 REST 请求是正常的 ——
 * 说明被挡的是 git 协议那一层，不是整个 GitHub。
 *
 * ## 怎么用
 *
 *   GH_TOKEN=ghp_xxx node scripts/ios/push-via-api.mjs [文件...]
 *
 * 不给文件时，默认上传「本地 iOS 源码目录」与「远端 main 分支」的差异 ——
 * 也就是先拉一次远端树，算出新增/修改的文件，再逐个 PUT 上去。
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const TOKEN = process.env.GH_TOKEN?.trim();
const OWNER = process.env.GH_OWNER || 'sakure1227';
const REPO = process.env.GH_REPO || 'sakure-ios-build';
const SRC = process.env.GH_SRC || 'D:/Temp/User/sakure-ios-git/sakure-ios-source';
const BRANCH = process.env.GH_BRANCH || 'main';

if (!TOKEN) {
    console.error('❌ 缺少 GH_TOKEN');
    process.exit(1);
}

const API = 'https://api.github.com';
const H = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sakure-ios-build',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** 带重试的 API 调用（这个网络环境下瞬断很常见）。 */
async function api(path, options = {}, retries = 5) {
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const res = await fetch(`${API}${path}`, {
                ...options,
                headers: { ...H, ...(options.headers || {}) },
            });
            const text = await res.text();
            let body;
            try { body = JSON.parse(text); } catch { body = text; }
            if (res.status >= 500 && attempt < retries) {
                await sleep(attempt * 3000);
                continue;
            }
            return { status: res.status, body };
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await sleep(attempt * 3000);
                continue;
            }
        }
    }
    throw lastError || new Error('请求失败');
}

/** 递归列出本地目录里的所有文件（相对路径）。 */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-mobile', 'DerivedData']);
const listFiles = (dir, base = dir) => {
    const out = [];
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const entry of entries) {
        // **目录名直接跳过** —— 别进去再判断，那会白跑一遍整个 node_modules
        //（上万个文件，遍历本身就要好几分钟）。
        if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...listFiles(full, base));
        } else if (entry.isFile()) {
            out.push(relative(base, full).replace(/\\/g, '/'));
        }
    }
    return out;
};

/**
 * Git blob 的 SHA-1：`sha1("blob <长度>\0" + 内容)`。
 *
 * 用 Node 自己算，别每个文件都调一次 `git hash-object` —— 那个要起一个 git
 * 进程，上千个文件就是上千次进程创建，慢到超时。
 */
import { createHash } from 'node:crypto';

const blobSha = (buf) => {
    const header = Buffer.from(`blob ${buf.length}\0`, 'utf8');
    return createHash('sha1').update(header).update(buf).digest('hex');
};

const main = async () => {
    console.log(`▶ 仓库: ${OWNER}/${REPO}（分支 ${BRANCH}）`);
    console.log(`▶ 本地: ${SRC}`);

    // ① 远端当前的树
    const ref = await api(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    if (ref.status !== 200) {
        console.error('❌ 读不到远端分支：', JSON.stringify(ref.body).slice(0, 200));
        process.exit(1);
    }
    const baseTree = ref.body.object.sha;
    console.log(`   远端 HEAD: ${baseTree.slice(0, 8)}`);

    // ② 本地文件清单（跳过 .git 和 node_modules）
    const localFiles = listFiles(SRC).filter(
        f => !f.startsWith('.git/') && !f.startsWith('node_modules/')
    );
    console.log(`   本地文件: ${localFiles.length} 个`);

    // ③ 远端文件清单
    const tree = await api(
        `/repos/${OWNER}/${REPO}/git/trees/${baseTree}?recursive=1`
    );
    const remoteMap = new Map();
    for (const item of tree.body?.tree || []) {
        if (item.type === 'blob') remoteMap.set(item.path, item.sha);
    }
    console.log(`   远端文件: ${remoteMap.size} 个`);

    // ④ 算出差异（只算 hash，不急着读 base64）
    const localMap = new Map();
    for (const f of localFiles) {
        const buf = readFileSync(join(SRC, f));
        localMap.set(f, { sha: blobSha(buf), buf });
    }

    const toUpdate = [];
    for (const [path, info] of localMap) {
        if (remoteMap.get(path) !== info.sha) toUpdate.push(path);
    }
    const toDelete = [...remoteMap.keys()].filter(p => !localMap.has(p));
    console.log(`   要更新: ${toUpdate.length} 个，要删除: ${toDelete.length} 个`);
    toUpdate.forEach(p => console.log(`     ~ ${p}`));

    if (!toUpdate.length && !toDelete.length) {
        console.log('✅ 远端已经是最新');
        return;
    }

    // ⑤ 逐个 PUT（更新 / 新增）
    let ok = 0;
    for (const path of toUpdate) {
        const info = localMap.get(path);
        const exists = remoteMap.has(path);
        const payload = {
            message: exists ? `Update ${path}` : `Add ${path}`,
            content: info.buf.toString('base64'),
            ...(exists ? { sha: remoteMap.get(path) } : {}),
        };
        const res = await api(
            `/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }
        );
        if (res.status === 200 || res.status === 201) {
            ok += 1;
            if (ok % 20 === 0) console.log(`   …${ok}/${toUpdate.length}`);
        } else {
            console.error(`   ❌ ${path}: ${JSON.stringify(res.body).slice(0, 160)}`);
        }
    }
    console.log(`✅ 更新了 ${ok} 个文件`);

    // ⑥ 删除远端多出来的文件
    for (const path of toDelete) {
        const res = await api(
            `/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
            {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Remove ${path}`, sha: remoteMap.get(path) }),
            }
        );
        if (res.status === 200) {
            console.log(`   🗑 ${path}`);
        }
    }

    // ⑦ 验证
    const verify = await api(
        `/repos/${OWNER}/${REPO}/contents/ios/App/App/SceneDelegate.swift?ref=${BRANCH}`
    );
    if (verify.status === 200) {
        const content = Buffer.from(verify.body.content || '', 'base64').toString('utf8');
        const good = !/SceneDelegateProxy\.shared/.test(content);
        console.log(`✅ 验证 SceneDelegate.swift: ${good ? '新代码已生效' : '还是旧代码！'}`);
    }
    console.log('\n完成。现在可以派发构建了。');
};

main().catch(e => {
    console.error('失败:', e.message);
    process.exit(1);
});
