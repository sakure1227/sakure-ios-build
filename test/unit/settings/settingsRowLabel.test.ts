import { describe, expect, it } from 'vitest';

// test/unit/settings/settingsRowLabel.test.ts
// 一行设置项的标签是从三处之一来的，而它们不能同时占住这个位置：
//   - labelText：这一行代表的东西的名字（自定义源的名字、模组的名字）；
//   - option.labelKey：页面自己的固定文案；
//   - label：不是页面选项的一行的普通标签。
//
// 出过的事：自定义源那一行同时传了 option 和 label，而 option 赢了——
// 界面上显示的是 i18n 键名「customSource.list」，而不是源的名字。
// 用户看到的是一串键名，不是他装的那个源。

import { rowLabelText } from '../../../src/components/modal/settings/kit/Row';

describe('the label a settings row shows', () => {
    it('shows the name the row stands for when there is one', () => {
        expect(rowLabelText('星海音乐源', '已导入的源', undefined)).toBe('星海音乐源');
    });

    it('shows the name even when the row also has an option of its own', () => {
        // 这一行既要是个能落脚的选项（搜索能跳到它），又要显示自己的名字。
        expect(rowLabelText('星海音乐源', '已导入的源', '另一个标签')).toBe('星海音乐源');
    });

    it('shows the page wording when the row has no name of its own', () => {
        expect(rowLabelText(undefined, '已导入的源', undefined)).toBe('已导入的源');
    });

    it('shows the plain label for a row that is not an option', () => {
        expect(rowLabelText(undefined, undefined, '普通标签')).toBe('普通标签');
    });

    it('has nothing to show when it was given nothing', () => {
        expect(rowLabelText(undefined, undefined, undefined)).toBeUndefined();
    });

    it('does not fall back to the page wording when the name is empty', () => {
        // 空名字就是没有名字：这时候说页面的文案，比显示一个空标签好。
        expect(rowLabelText('', '已导入的源', undefined)).toBe('');
    });
});
