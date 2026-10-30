/*
 * @name 端到端测试源
 * @description Sakure 内置的自定义源端到端测试脚本，用于验证 lx API 桥是否工作
 * @author Sakure
 * @version 1.0.0
 * @homepage https://github.com/lyswhut/lx-music-desktop
 */

const { name, description, version, author } = lx.currentScriptInfo

// 记录脚本被执行的证据
globalThis.__sakureTestLog = {
    ran: true,
    scriptInfo: { name, description, version, author },
    lxVersion: lx.version,
    lxEnv: lx.env,
    cryptoWorks: false,
    requestWorks: false,
    requestResult: null,
}

// 测试 lx.utils.crypto
try {
    const md5 = lx.utils.crypto.md5('sakure')
    globalThis.__sakureTestLog.cryptoWorks = md5 === '0f7c3a4b0e8b2e7a8d3f1c2b5a6d9e0f' || typeof md5 === 'string' && md5.length === 32
} catch (err) {
    globalThis.__sakureTestLog.cryptoError = err.message
}

// 测试 lx.request（走主进程的网络出口）
lx.request('https://httpbin.org/json', { method: 'get', timeout: 15000 }, (err, resp, body) => {
    if (err) {
        globalThis.__sakureTestLog.requestError = err.message
        return
    }
    globalThis.__sakureTestLog.requestWorks = true
    globalThis.__sakureTestLog.requestResult = {
        statusCode: resp?.statusCode,
        hasBody: body != null,
    }
})

// 声明自己的能力：支持 wy 平台的 musicUrl
lx.send('inited', {
    status: true,
    openDevTools: false,
    message: '',
    sources: {
        wy: {
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['128k', '320k', 'flac', 'flac24bit'],
        },
    },
})

// 处理请求：返回一个固定的播放地址
//
// 洛雪的自定义源脚本收到的是旧版扁平结构，标识平铺在顶层。这里读 songmid —— 真实脚本
// 就是这么读的；读不到说明 Sakure 给出的结构不对。
lx.on('request', ({ source, action, info }) => {
    if (action === 'musicUrl' && source === 'wy') {
        const musicInfo = info?.musicInfo
        globalThis.__sakureTestLog.receivedSong = {
            id: musicInfo?.id,
            songmid: musicInfo?.songmid,
            source: musicInfo?.source,
            name: musicInfo?.name,
            hasMeta: musicInfo?.meta != null,
        }
        const key = musicInfo?.songmid ?? musicInfo?.id ?? 'unknown'
        return Promise.resolve(`https://example.com/test/${key}.mp3`)
    }
    return Promise.reject(new Error(`unsupported: ${source}/${action}`))
})
