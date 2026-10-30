#!/usr/bin/env bash
# 把 iOS 构建源码推到 GitHub，并触发 GitHub Actions 出 IPA。
#
# 全程只需要 SSH 密钥（不需要密码、不需要 PAT）——
# 前提是公钥已经加到 GitHub 账号的 SSH keys 里。
#
# 用法：
#   GH_REPO=sakure1227i/sakure-ios-build bash scripts/ios/push-to-github.sh
set -euo pipefail

REPO="${GH_REPO:-sakure1227i/sakure-ios-build}"
SRC="${GH_SRC:-/tmp/sakure-ios-git/sakure-ios-source}"
KEY="${GH_KEY:-$HOME/.ssh/github_ed25519}"

echo "▶ 仓库: $REPO"
echo "▶ 源码: $SRC"
echo "▶ 密钥: $KEY"

# ── ① 先确认 SSH 认证通了 ──────────────────────────────────────────────
# 这一步失败就别往下走了 —— 后面的报错会很难懂。
echo ""
echo "▶ ① 测试 GitHub SSH 认证…"
if ! ssh -T -i "$KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new git@github.com 2>&1 | tee /tmp/gh_ssh.txt | grep -q "successfully authenticated"; then
    echo "❌ SSH 认证失败。上面是 GitHub 的原话："
    cat /tmp/gh_ssh.txt
    echo ""
    echo "   检查清单："
    echo "   1) 公钥有没有加到 https://github.com/settings/keys"
    echo "   2) 加的是下面这把（注意别漏了结尾的注释）："
    echo "      $(cat "$KEY.pub")"
    exit 1
fi
echo "✅ SSH 认证通过"

# ── ② 建仓（GitHub 的 push 不能自动建仓）────────────────────────────────
# 用 HTTPS + 匿名探测：仓库不存在时 push 会明确报错，我们据此建仓。
echo ""
echo "▶ ② 检查仓库是否已存在…"
REPO_NAME="${REPO##*/}"
REPO_OWNER="${REPO%%/*}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://github.com/$REPO" || echo "000")
echo "   https://github.com/$REPO -> $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ]; then
    echo "   仓库不存在，需要新建。"
    echo ""
    echo "   ⚠️ 建仓需要一次 API token（或者你在网页上点一下）。"
    echo "   最省事：打开这个页面建一个空仓库（名字填 $REPO_NAME，勾 Public）："
    echo "      https://github.com/new?name=$REPO_NAME&visibility=public"
    echo ""
    echo "   建完告诉我，我接着往下跑。"
    exit 2
fi
echo "✅ 仓库已存在"

# ── ③ 推送 ────────────────────────────────────────────────────────────
echo ""
echo "▶ ③ 推送代码…"
cd "$SRC"
git remote remove origin 2>/dev/null || true
git remote add origin "git@github.com:$REPO.git"
git push -u origin main
echo "✅ 推送完成"

# ── ④ 触发构建 ────────────────────────────────────────────────────────
# 打一个 tag —— workflow 配的是 `push: tags: ['ios-ipa-*']`，
# 打 tag 就会自动跑，不用去网页上点按钮。
echo ""
echo "▶ ④ 打 tag 触发构建…"
TAG="ios-ipa-$(date +%Y%m%d-%H%M%S)"
git tag -f "$TAG"
git push origin "$TAG"
echo "✅ 已触发构建（tag: $TAG）"
echo ""
echo "接下来去这里看进度："
echo "   https://github.com/$REPO/actions"
echo ""
echo "出好后下载 artifact（Sakure-unsigned-ipa），拿爱思助手签一下就能装。"
