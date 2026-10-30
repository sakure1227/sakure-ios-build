#!/usr/bin/env node
/**
 * GitHub 一条龙：建仓 → 推送 → 触发 Actions → 等构建 → 下载 IPA。
 *
 * 全部走 REST API（api.github.com 不受网页端的 DataDome 拦截影响），
 * 所以只需要一个 Personal Access Token。
 *
 * 用法：
 *   GH_TOKEN=ghp_xxx node scripts/ios/github-automation.mjs
 *
 * 环境变量：
 *   GH_TOKEN   必需。Personal Access Token（classic 或 fine-grained 都行）
 *   GH_OWNER   仓库归属，默认 sakure1227i
 *   GH_REPO    仓库名，默认 sakure-ios-build
 *   GH_SRC     源码目录，默认 /tmp/sakure-ios-git/sakure-ios-source
 *   GH_VISIBILITY  public（默认，免费用 macOS runner）或 private
 *   GH_WAIT    是否等待构建完成并下载，默认 true
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TOKEN = process.env.GH_TOKEN?.trim();
const OWNER = process.env.GH_OWNER || 'sakure1227i';
const REPO = process.env.GH_REPO || 'sakure-ios-build';
const SRC = process.env.GH_SRC || '/tmp/sakure-ios-git/sakure-ios-source';
const VISIBILITY = process.env.GH_VISIBILITY || 'public';
const SHOULD_WAIT = process.env.GH_WAIT !== 'false';
const OUT_DIR = process.env.GH_OUT_DIR || 'D:/workbuddy/2026-10-28-17-25-03/outputs';

if (!TOKEN) {
    console.error('❌ 缺少 GH_TOKEN');
    console.error('   用法：GH_TOKEN=ghp_xxx node scripts/ios/github-automation.mjs');
    process.exit(1);
}
if (!existsSync(SRC)) {
    console.error(`❌ 源码目录不存在: ${SRC}`);
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

/** 调 API，返回 { status, body }。不抛异常 —— 由调用方判断。 */
async function api(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: { ...H, ...(options.headers || {}) },
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: res.status, body };
}

const run = (cmd, args, opts = {}) => {
    const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
    return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
};

const main = async () => {
    console.log('▶ 账号:', OWNER, '/ 仓库:', REPO, '/ 可见性:', VISIBILITY);

    // ── ① 验证 token ───────────────────────────────────────────────
    const me = await api('/user');
    if (me.status !== 200) {
        console.error('❌ token 无效：', JSON.stringify(me.body).slice(0, 300));
        process.exit(1);
    }
    console.log(`✅ token 有效，账号: ${me.body.login}`);

    // ── ② 确认仓库存不存在 ─────────────────────────────────────────
    let exists = true;
    const check = await api(`/repos/${OWNER}/${REPO}`);
    if (check.status === 404) {
        exists = false;
    } else if (check.status !== 200) {
        console.error('❌ 查询仓库失败：', JSON.stringify(check.body).slice(0, 300));
        process.exit(1);
    }

    if (!exists) {
        console.log('▶ 仓库不存在，创建中…');
        const created = await api('/user/repos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: REPO,
                description: 'Sakure iOS build source (Capacitor 8 + three native plugins)',
                private: VISIBILITY === 'private',
                auto_init: false,
                has_issues: false,
                has_projects: false,
                has_wiki: false,
            }),
        });
        if (created.status !== 201) {
            console.error('❌ 创建仓库失败：', JSON.stringify(created.body).slice(0, 400));
            process.exit(1);
        }
        console.log(`✅ 仓库已创建: ${created.body.html_url}`);
    } else {
        console.log(`✅ 仓库已存在: ${check.body.html_url}`);
    }

    // ── ③ 推送代码 ────────────────────────────────────────────────
    //
    // **默认跳过** —— `git push` 走 git 协议，在这个网络环境下极不稳定
    // （反复出现 `CONNECT tunnel failed, response 502` /
    //  `TLS connect error: unexpected eof`），而 `api.github.com` 一直正常。
    //
    // 文件用 `scripts/ios/push-via-api.mjs`（REST API）传，更稳。
    // 需要时设 `GH_PUSH=1` 打开。
    if (process.env.GH_PUSH === '1') {
        console.log('▶ 推送代码…');
        const authUrl = `https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO}.git`;
        const push = run('git', ['-C', SRC, 'push', '--force', authUrl, 'main:main'], {
            env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        });
        if (push.code !== 0) {
            console.error('❌ 推送失败：');
            console.error(push.err || push.out);
            console.error('   → 改用 node scripts/ios/push-via-api.mjs（REST API，更稳）');
            process.exit(1);
        }
        console.log('✅ 推送完成');
    } else {
        console.log('▶ 跳过推送（GH_PUSH=1 可开启；默认用 REST API 传文件）');
    }

    // ── ④ 触发 Actions ────────────────────────────────────────────
    // workflow 配了 `workflow_dispatch`，直接派发即可。
    //
    // ⚠️ 注意：workflow 里有 `concurrency: cancel-in-progress: true`，
    // 所以**重复派发会把上一个正在跑的构建取消掉**。这里先看有没有在跑的，
    // 有就别再派了 —— 干等就行，别自己把自己 cancel 了。
    console.log('▶ 检查有没有正在跑的构建…');
    const existing = await api(
        `/repos/${OWNER}/${REPO}/actions/workflows/ios-ipa.yml/runs?per_page=5&status=in_progress`
    );
    const queued = await api(
        `/repos/${OWNER}/${REPO}/actions/workflows/ios-ipa.yml/runs?per_page=5&status=queued`
    );
    const pending = [
        ...(existing.body?.workflow_runs || []),
        ...(queued.body?.workflow_runs || []),
    ];
    if (pending.length) {
        console.log(`   已经有 ${pending.length} 个构建在排队/运行中，就用它，不重复派发。`);
        console.log(`   run #${pending[0].id}`);
        if (!SHOULD_WAIT) return;
        var dispatch = { status: 200, body: { reused: pending[0].id } };
    } else {
        console.log('▶ 触发 GitHub Actions…');
        const d = await api(
            `/repos/${OWNER}/${REPO}/actions/workflows/ios-ipa.yml/dispatches`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ref: 'main' }),
            }
        );
        if (d.status !== 204 && d.status !== 200) {
            console.error('❌ 触发失败：', JSON.stringify(d.body).slice(0, 400));
            console.error('   → 确认 workflow 文件已推上去（.github/workflows/ios-ipa.yml），');
            console.error('     且 token 有 `workflow` 权限。');
            process.exit(1);
        }
        console.log('✅ 已派发构建');
        var dispatch = d;
    }

    if (!SHOULD_WAIT) {
        console.log('');
        console.log('构建在跑，去这里看进度：');
        console.log(`   https://github.com/${OWNER}/${REPO}/actions`);
        return;
    }

    // ── ⑤ 等构建跑完 ──────────────────────────────────────────────
    console.log('▶ 等待构建（最多等 60 分钟）…');
    let runId = null;
    const deadline = Date.now() + 60 * 60 * 1000;

    // 派发之后 run 要过几秒才出现，先等它出现。
    while (!runId && Date.now() < deadline) {
        await sleep(8000);
        const runs = await api(
            `/repos/${OWNER}/${REPO}/actions/workflows/ios-ipa.yml/runs?per_page=5`
        );
        if (runs.status === 200 && Array.isArray(runs.body?.workflow_runs)) {
            const latest = runs.body.workflow_runs.find(r => r.event === 'workflow_dispatch');
            if (latest) {
                runId = latest.id;
                console.log(`   找到 run #${runId}，状态: ${latest.status}`);
            }
        }
    }
    if (!runId) {
        console.error('❌ 没找到构建 run');
        process.exit(1);
    }

    // 轮询状态
    let final = null;
    while (Date.now() < deadline) {
        await sleep(15000);
        const r = await api(`/repos/${OWNER}/${REPO}/actions/runs/${runId}`);
        if (r.status !== 200) continue;
        const s = r.body.status;
        const label = s === 'completed' ? r.body.conclusion : s;
        console.log(`   [${new Date().toLocaleTimeString('zh-CN')}] 状态: ${label}`);
        if (s === 'completed') { final = r.body; break; }
    }

    if (!final) {
        console.error('❌ 构建超时了。去这里看日志：');
        console.error(`   https://github.com/${OWNER}/${REPO}/actions/runs/${runId}`);
        process.exit(1);
    }
    if (final.conclusion !== 'success') {
        console.error(`❌ 构建失败（${final.conclusion}）。日志：`);
        console.error(`   https://github.com/${OWNER}/${REPO}/actions/runs/${runId}`);
        process.exit(1);
    }
    console.log('✅ 构建成功');

    // ── ⑥ 下载 artifact ───────────────────────────────────────────
    console.log('▶ 下载 IPA…');
    const arts = await api(`/repos/${OWNER}/${REPO}/actions/runs/${runId}/artifacts`);
    const list = Array.isArray(arts.body?.artifacts) ? arts.body.artifacts : [];
    if (!list.length) {
        console.error('❌ 没有 artifact。');
        process.exit(1);
    }
    const art = list.find(a => /ipa/i.test(a.name)) || list[0];
    console.log(`   artifact: ${art.name} (${(art.size_in_bytes / 1048576).toFixed(1)} MB)`);

    const zipRes = await fetch(
        `${API}/repos/${OWNER}/${REPO}/actions/artifacts/${art.id}/zip`,
        { headers: H }
    );
    if (!zipRes.ok) {
        console.error('❌ 下载失败：', zipRes.status, await zipRes.text());
        process.exit(1);
    }
    const zipBuf = Buffer.from(await zipRes.arrayBuffer());

    mkdirSync(OUT_DIR, { recursive: true });
    const zipPath = join(OUT_DIR, 'Sakure-unsigned-ipa.zip');
    writeFileSync(zipPath, zipBuf);
    console.log(`✅ 已保存: ${zipPath}`);

    // 解压出 IPA
    const unzip = run('tar', ['-xf', zipPath, '-C', OUT_DIR]);
    if (unzip.code !== 0) console.error('   （解压失败，但 zip 本身可用）');
    else console.log('✅ 已解压到:', OUT_DIR);

    console.log('');
    console.log('🎉 完成。未签名的 IPA 在：', OUT_DIR);
    console.log('   拿爱思助手签一下就能装到 iPhone。');
};

main().catch(e => {
    console.error('失败:', e.message);
    process.exit(1);
});
