// 生成 Windows 用的多尺寸 .ico（从 build/icon.png）。
//
// 为什么需要这个脚本：
// electron-builder 默认会把 build/icon.png 交给它内置的 icons-bundle 工具转成 .ico，
// 但那个工具是 CommonJS（用 require / __dirname），而本项目 package.json 是 "type": "module"，
// 于是 Node 把它整条树里的 .js 都当 ESM，require/__dirname 全部失效 —— 打包必炸。
// 预生成 .ico 后，electron-builder 直接用 .ico，根本不碰那个工具。
//
// 用法：node scripts/build/generate-app-icon.mjs
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const SRC = path.resolve('build/icon.png');
const OUT = path.resolve('build/icon.ico');
const SIZES = [256, 48, 32, 16];

/** 简单 box 降采样：从大图按比例平均到 size×size。icon 是纯色背景 + 清晰人物，足够用。 */
const resizeBox = (png, size) => {
    const out = new PNG({ width: size, height: size });
    const ratio = png.width / size;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const sx0 = Math.floor(x * ratio);
            const sx1 = Math.max(sx0 + 1, Math.floor((x + 1) * ratio));
            const sy0 = Math.floor(y * ratio);
            const sy1 = Math.max(sy0 + 1, Math.floor((y + 1) * ratio));
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let sy = sy0; sy < sy1; sy++) {
                for (let sx = sx0; sx < sx1; sx++) {
                    const i = (sy * png.width + sx) * 4;
                    r += png.data[i];
                    g += png.data[i + 1];
                    b += png.data[i + 2];
                    a += png.data[i + 3];
                    n++;
                }
            }
            const o = (y * size + x) * 4;
            out.data[o] = r / n;
            out.data[o + 1] = g / n;
            out.data[o + 2] = b / n;
            out.data[o + 3] = a / n;
        }
    }
    return out;
};

const main = () => {
    const src = PNG.sync.read(fs.readFileSync(SRC));
    if (src.width !== src.height) {
        throw new Error(`icon.png 不是正方形 (${src.width}x${src.height})`);
    }

    const images = SIZES.map((size) => ({
        size,
        data: PNG.sync.write(resizeBox(src, size), { colorType: 6 }),
    }));

    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // image type: icon
    header.writeUInt16LE(images.length, 4);

    let offset = 6 + 16 * images.length;
    const entries = [];
    for (const img of images) {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // width (0 => 256)
        entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // height
        entry.writeUInt8(0, 2); // color count (0 = >256)
        entry.writeUInt8(0, 3); // reserved
        entry.writeUInt16LE(1, 4); // color planes
        entry.writeUInt16LE(32, 6); // bits per pixel
        entry.writeUInt32LE(img.data.length, 8); // image data size
        entry.writeUInt32LE(offset, 12); // offset to image data
        entries.push(entry);
        offset += img.data.length;
    }

    fs.writeFileSync(OUT, Buffer.concat([header, ...entries, ...images.map((i) => i.data)]));
    console.log(`✅ 已生成 ${OUT} (${SIZES.join('/')} px, ${images.length} 帧)`);
};

main();
