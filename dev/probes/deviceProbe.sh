#!/usr/bin/env bash
# 在真机上问几个问题：源起来了吗？搜得到歌吗？拿得到地址吗？
#
# 用 Chrome DevTools 协议连进手机上的 WebView（debug 版才开这个口）。
# 这比截图看得多 —— 能直接问「它到底工作到哪一步了」。
#
# adb forward 的端口活不长（adb server 一重启就没了），所以转发与探测在
# 同一条命令里做：先转发，紧接着连。
set -u

ADB="D:/toolchain/android-sdk/platform-tools/adb.exe"
DEVICE="${SAKURE_DEVICE:-A4PLUT4B12016644}"
PORT="${1:-9225}"

PID=$("$ADB" -s "$DEVICE" shell pidof top.izuna.sakure 2>/dev/null | tr -d '\r')
if [ -z "$PID" ]; then
  echo "手机上没有 Sakure 在跑（先启动它）"
  exit 1
fi

"$ADB" -s "$DEVICE" forward "tcp:$PORT" "localabstract:webview_devtools_remote_$PID" >/dev/null 2>&1
sleep 1

cd "$(dirname "$0")/../.."
node dev/probes/deviceProbe.mjs "$PORT"
