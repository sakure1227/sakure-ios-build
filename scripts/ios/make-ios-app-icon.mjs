// scripts/ios/make-ios-app-icon.mjs
//
// 生成 iOS 的应用图标（`AppIcon.appiconset` 里那张 1024×1024）。
//
// ## 为什么原来的是错的
//
// `npx cap add ios` 生成的那张是 **Capacitor 的默认占位图**（蓝底网格 + 一个 X）。
// 它能编译、能装上，但装到手机上图标就是那个占位图 —— 用户看到的是"别人的应用"。
//
// Android 那边用的是项目自己的图（`build/icon.png`，那张灰发人物），
// 所以两个平台的图标本来应该一致。
//
// ## iOS 对图标的两条硬要求
//
// 1. **不能有 alpha 通道**。有的话系统按"有透明"处理，实心部分之外会变**黑底**
//    （不是透明）。App Store 也会直接拒收。所以这里输出的是纯 RGB。
// 2. **不能自己画圆角**。iOS 会用系统自己的圆角（squircle）去裁。
//    自己再画一圈圆角 = 裁两次，边缘会出现一圈白边。
//
// 所以做法是：把人物**合成到实色背景上**，铺满整张 1024×1024，不留边、不画圆角。
//
// ## 源图
//
// `build/icon.png` —— 桌面版（Electron）用的那张，512×512、全不透明、人物铺满。
// 它本来就是"实底 + 人物铺满"，正好符合 iOS 的要求，
// 只要放大到 1024 并保证输出是 RGB（不带 alpha）就行。
//
// ## 用法
//
// ```bash
// node scripts/ios/make-ios-app-icon.mjs
// ```
//
// 产物：`ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`
// （并同步更新 `Contents.json`）
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

const SOURCE = resolve(root, 'build', 'icon.png');
const ICON_DIR = resolve(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const OUT_NAME = 'AppIcon-1024.png';
const OUT = resolve(ICON_DIR, OUT_NAME);
const SIZE = 1024;

/**
 * 双三次（Catmull-Rom）缩放。
 *
 * 为什么不用 ffmpeg：仓库里那个 ffmpeg 是给音频转码用的精简构建
 * （`--disable-filters --disable-swscale`），**没有 scale 滤镜**，缩不了图。
 *
 * 为什么不用「最近邻」：512→1024 是 2 倍放大，最近邻会让线条出现明显的锯齿。
 * 双三次插值出来的边缘是平滑的，人物这种线稿看着差别很大。
 */
const resizeCatmullRom = (src, targetSize) => {
    const scale = targetSize / src.width;
    const out = new PNG({ width: targetSize, height: targetSize });

    // Catmull-Rom 的四个系数（按 x 的小数部分 t 依次对应偏移 -1, 0, 1, 2）。
    //
    // ★ 权重和必须恒等于 1 ★
    // 否则插值出来的亮度会随位置起伏 —— 在大片纯白背景上就会看成一层网格纹。
    // （踩过一次：把 w2 写成 `0.5t(t-1)` 而不是 `0.5t³-0.5t²`，权重和变成 0.875，
    //  整张图浮起一层横竖条纹。）
    const weights = (t) => [
        -0.5 * t * t * t + t * t - 0.5 * t,
        1.5 * t * t * t - 2.5 * t * t + 1,
        -1.5 * t * t * t + 2 * t * t + 0.5 * t,
        0.5 * t * t * t - 0.5 * t * t,
    ];

    /** 取一行（或一列）上的 4 个采样点的加权平均。 */
    const sample = (getter, center, limit) => {
        const base = Math.floor(center) - 1;
        const w = weights(center - Math.floor(center));
        let r = 0;
        let g = 0;
        let b = 0;
        for (let k = 0; k < 4; k += 1) {
            // 越界时钳到边界 —— 边缘不要出现黑边。
            const index = Math.min(limit - 1, Math.max(0, base + k));
            const px = getter(index);
            r += px[0] * w[k];
            g += px[1] * w[k];
            b += px[2] * w[k];
        }
        return [r, g, b];
    };

    // 先横向缩放（得到 SIZE × 源高），再纵向缩放到 SIZE × SIZE。
    // 分两步做而不是一次做二维卷积：快一个数量级，效果几乎一样。
    const horizontal = new PNG({ width: targetSize, height: src.height });
    for (let y = 0; y < src.height; y += 1) {
        for (let x = 0; x < targetSize; x += 1) {
            const srcX = x / scale;
            const [r, g, b] = sample(
                (index) => {
                    const i = (y * src.width + index) * 4;
                    return [src.data[i], src.data[i + 1], src.data[i + 2]];
                },
                srcX,
                src.width,
            );
            const o = (y * targetSize + x) * 4;
            horizontal.data[o] = Math.round(r);
            horizontal.data[o + 1] = Math.round(g);
            horizontal.data[o + 2] = Math.round(b);
            horizontal.data[o + 3] = 255;
        }
    }

    for (let y = 0; y < targetSize; y += 1) {
        const srcY = y / scale;
        for (let x = 0; x < targetSize; x += 1) {
            const [r, g, b] = sample(
                (index) => {
                    const i = (index * targetSize + x) * 4;
                    return [horizontal.data[i], horizontal.data[i + 1], horizontal.data[i + 2]];
                },
                srcY,
                src.height,
            );
            const o = (y * targetSize + x) * 4;
            out.data[o] = Math.round(Math.min(255, Math.max(0, r)));
            out.data[o + 1] = Math.round(Math.min(255, Math.max(0, g)));
            out.data[o + 2] = Math.round(Math.min(255, Math.max(0, b)));
            // ★ alpha 恒为 255 ★
            // iOS 要求图标**不能有透明通道** —— 有的话系统会把透明处按黑底渲染
            // （而不是透明）。这里写死 255，从源头上保证输出的是纯 RGB 图。
            out.data[o + 3] = 255;
        }
    }

    return out;
};

if (!existsSync(SOURCE)) {
    console.error(`❌ 找不到源图: ${SOURCE}`);
    process.exit(1);
}

const source = PNG.sync.read(readFileSync(SOURCE));
console.log(`▶ 源图: build/icon.png（${source.width}×${source.height}）`);

const resized = resizeCatmullRom(source, SIZE);

if (!existsSync(ICON_DIR)) {
    mkdirSync(ICON_DIR, { recursive: true });
    console.log(`  建了目录: ${ICON_DIR}`);
}

// PNG.sync.write 会写成 RGBA（colorType 6）。iOS 要的是**没有 alpha 通道**的
// PNG（colorType 2 = RGB）。用 pngjs 的 `colorType: 2` 明确指定。
writeFileSync(OUT, PNG.sync.write(resized, { colorType: 2, inputColorType: 6 }));
console.log(`✅ 已生成: ${OUT}`);

// Contents.json —— Xcode 靠它知道哪张图对应哪个尺寸。
//
// 这里用**单张 1024×1024 的 universal 图**（Xcode 14+ 的做法）：
// 系统会自动派生出 @2x / @3x 与各尺寸（iPhone / iPad / 通知中心…）。
// 不用手工列 20 多张尺寸 —— 那些由 actool 生成。
const contents = {
    images: [
        {
            filename: OUT_NAME,
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
        },
    ],
    info: {
        author: 'xcode',
        version: 1,
    },
};
writeFileSync(resolve(ICON_DIR, 'Contents.json'), `${JSON.stringify(contents, null, '\t')}\n`, 'utf8');
console.log('✅ 已更新 Contents.json（universal 1024×1024）');

// 校验：alpha 必须是 255（不能有透明通道）。
const written = PNG.sync.read(readFileSync(OUT));
let minAlpha = 255;
for (let i = 3; i < written.data.length; i += 4) {
    if (written.data[i] < minAlpha) minAlpha = written.data[i];
}
console.log(`▶ 输出: ${written.width}×${written.height}，最小 alpha = ${minAlpha}`);
if (minAlpha !== 255) {
    console.error('❌ 图标里有透明像素 —— iOS 会把它当黑底渲染。');
    process.exit(1);
}
console.log('✅ 没有透明通道，iOS 不会渲成黑底');
