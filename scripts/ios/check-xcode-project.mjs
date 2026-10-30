// scripts/ios/check-xcode-project.mjs
//
// 校验 Xcode 工程里插件的引用有没有接齐。
//
// ## 为什么需要它
//
// `project.pbxproj` 是个纯文本的图结构：文件引用、编译条目、组、编译源列表四处
// 要互相对得上。**少一处 Xcode 就打不开工程**（或者打开了但插件没编进去，
// 运行时才报「plugin is not implemented」）。
//
// 手改这种文件最容易漏，所以改完跑一遍这个检查。
//
// 用法：node scripts/ios/check-xcode-project.mjs
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const pbxprojPath = resolve(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

const pbxproj = readFileSync(pbxprojPath, 'utf8');
const names = ['CsHttp.swift', 'CsCrypto.swift', 'CsMediaSession.swift'];

// 所有「已定义」的对象 ID（形如 `ABC123 /* 名字 */ = {`）。
const defined = new Set();
for (const match of pbxproj.matchAll(/([0-9A-F]{24}) \/\* [^*]+ \*\/ = \{/g)) {
    defined.add(match[1]);
}

let allOk = true;

for (const name of names) {
    // 用**字面量**找，不用正则 —— 文件名里有 `.`，正则的转义层级容易出错，
    // 而且这里就是找一段固定文本。
    const fileRefNeedle = `= {isa = PBXFileReference;`;
    const fileRef = [...pbxproj.matchAll(/([0-9A-F]{24}) \/\* ([^*]+) \*\/ = \{isa = PBXFileReference/g)]
        .find(match => match[2] === name)?.[1];
    const build = [...pbxproj.matchAll(/([0-9A-F]{24}) \/\* ([^*]+) in Sources \*\/ = \{isa = PBXBuildFile/g)]
        .find(match => match[1] && match[2] === name)?.[1];
    void fileRefNeedle;

    const inGroup = Boolean(fileRef) && pbxproj.includes(`${fileRef} /* ${name} */`);
    const inSources = Boolean(build) && pbxproj.includes(`${build} /* ${name} in Sources */`);
    const idsValid = Boolean(fileRef && build && defined.has(fileRef) && defined.has(build));

    const line = [
        name,
        `fileRef=${fileRef ? '有' : '缺'}`,
        `buildFile=${build ? '有' : '缺'}`,
        `在组里=${inGroup ? '是' : '否'}`,
        `在编译源里=${inSources ? '是' : '否'}`,
        `ID有效=${idsValid ? '是' : '否'}`,
    ].join('  ');
    console.log(line);

    if (!(fileRef && build && inGroup && inSources && idsValid)) allOk = false;
}

// Plugins 组本身。
const groupMatch = pbxproj.match(/([0-9A-F]{24}) \/\* Plugins \*\/ = \{/);
const groupId = groupMatch?.[1];
const groupDefined = Boolean(groupId) && defined.has(groupId);
const groupReferenced = Boolean(groupId) && pbxproj.includes(`${groupId} /* Plugins */,`);
console.log(`Plugins 组: 定义=${groupId ? '有' : '缺'} 有效=${groupDefined ? '是' : '否'} 被App组引用=${groupReferenced ? '是' : '否'}`);
if (!(groupDefined && groupReferenced)) allOk = false;

// 括号平衡。
const braces = (pbxproj.match(/\{/g) || []).length === (pbxproj.match(/\}/g) || []).length;
const parens = (pbxproj.match(/\(/g) || []).length === (pbxproj.match(/\)/g) || []).length;
console.log(`括号平衡: ${braces && parens ? '通过' : '失败'}`);
if (!(braces && parens)) allOk = false;

console.log(allOk ? '\n✅ 工程结构完整' : '\n❌ 有问题');
process.exit(allOk ? 0 : 1);
