// GitHub 注册：先用真实浏览器打开注册页，把表单结构摸清楚。
//
// 为什么不用 curl：GitHub 挂了 DataDome 反爬（captcha-delivery.com），
// 无 JS 的请求直接 403。真实浏览器带完整指纹才能过。
//
// 这一步只**观察**不提交 —— 把输入框的选择器、验证码类型、有没有
// 「邮箱验证」环节全记下来，下一步再真正填。
const { chromium } = require('playwright');
const fs = require('fs');

const PROFILE = process.env.GH_PROFILE || 'D:/sakure/.gh-profile';
const OUT = process.env.GH_OUT || 'D:/sakure/.gh-out';
fs.mkdirSync(OUT, { recursive: true });

const main = async () => {
    const browser = await chromium.launchPersistentContext(PROFILE, {
        headless: false,
        viewport: { width: 1280, height: 900 },
        args: ['--disable-blink-features=AutomationControlled'],
    });
    const page = browser.pages()[0] || (await browser.newPage());

    console.log('打开注册页…');
    await page.goto('https://github.com/signup', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    console.log('当前 URL:', page.url());
    console.log('页面标题:', await page.title());

    // 有没有 DataDome 的挑战？
    const ddFrames = page.frames().filter(f => /captcha-delivery|arkoselabs/i.test(f.url()));
    console.log('验证码 iframe 数量:', ddFrames.length);
    ddFrames.forEach(f => console.log('  ->', f.url().slice(0, 100)));

    // 表单结构
    const fields = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('input, button, select').forEach(el => {
            out.push({
                tag: el.tagName.toLowerCase(),
                type: el.getAttribute('type') || '',
                name: el.getAttribute('name') || '',
                id: el.id || '',
                placeholder: el.getAttribute('placeholder') || '',
                ariaLabel: el.getAttribute('aria-label') || '',
                text: (el.textContent || '').trim().slice(0, 40),
                visible: !!(el.offsetParent || el.getClientRects().length),
            });
        });
        return out;
    });
    console.log('\n=== 表单元素 ===');
    fields.forEach(f => {
        if (!f.visible) return;
        console.log(`[${f.tag}${f.type ? ':' + f.type : ''}] name="${f.name}" id="${f.id}" ph="${f.placeholder}" aria="${f.ariaLabel}" text="${f.text}"`);
    });

    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    console.log('\n=== 页面文本 ===\n', bodyText);

    await page.screenshot({ path: `${OUT}/signup.png`, fullPage: false });
    console.log('\n截图已存:', `${OUT}/signup.png`);

    // 保持浏览器开着，方便下一步接着操作
    console.log('\n浏览器保持开启（60 秒），期间可人工介入。');
    await page.waitForTimeout(60000);
    await browser.close();
};

main().catch(e => {
    console.error('失败:', e.message);
    process.exit(1);
});
