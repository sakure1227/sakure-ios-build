#!/usr/bin/env bash
# dev/probes/verifyFinal.sh
# 装机 + 一次跑完最后的验证（歌词聚合、列表缩放、封面重试）。
#
# 用法：设备连上之后
#   bash dev/probes/verifyFinal.sh
#
# 它做四件事：装 APK、启动应用、转发 CDP 端口、跑三个探针。
# adb forward 会因为 daemon 重启而断，所以每一步都在同一条命令里做完。

set -u
cd "$(dirname "$0")/../.." || exit 1

DEVICE="${DEVICE:-A4PLUT4B12016644}"
export ANDROID_HOME="${ANDROID_HOME:-D:/toolchain/android-sdk}"
ADB="$ANDROID_HOME/platform-tools/adb.exe"

echo "=== 1. 装 APK ==="
"$ADB" -s "$DEVICE" install -r android/app/build/outputs/apk/debug/app-debug.apk 2>&1 | tail -2

echo "=== 2. 启动 ==="
"$ADB" -s "$DEVICE" shell am force-stop top.izuna.sakure
"$ADB" -s "$DEVICE" shell am start -n top.izuna.sakure/.MainActivity >/dev/null 2>&1
sleep 12

SOCK=$("$ADB" -s "$DEVICE" shell "cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*' | head -1" | tr -d '\r')
echo "socket=$SOCK"
[ -z "$SOCK" ] && { echo "没有拿到 CDP socket（应用没起来？）"; exit 1; }
"$ADB" -s "$DEVICE" forward tcp:9225 "localabstract:$SOCK" >/dev/null || exit 1

echo
echo "=== 3. 歌词聚合（跨平台）==="
node dev/probes/probeLyrics.mjs 2>&1 | head -45

echo
echo "=== 4. 四平台搜索 + 封面加载 ==="
node dev/probes/probeAllPlatforms.mjs 2>&1 | head -70

echo
echo "=== 5. 列表缩放的挂载点 ==="
node dev/probes/probeFlicker.mjs 2>&1 | grep -A 12 "沉浸式与安全区"
