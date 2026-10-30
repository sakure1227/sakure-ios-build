// dev/probes/kg_field.mjs
// 酷狗的签名搜索：看返回的完整结构（哪一层是歌、字段名是什么）。
import md5 from 'blueimp-md5';

const clientTimeMs = Date.now();
const clientTimeSec = Math.floor(clientTimeMs / 1000);
const mid = md5(String(clientTimeMs));
const params = {
    sorttype: '0', keyword: '海阔天空', pagesize: 3, page: 1, userid: '0', appid: '3116',
    token: '', clienttime: clientTimeSec, iscorrection: '1', uuid: '-', mid, dfid: '-',
    clientver: '11070', platform: 'AndroidFilter',
};
const src = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('');
params.signature = md5(`LnT6xpN3khm36zse0QzvmgTZ3waWdRSA${src}LnT6xpN3khm36zse0QzvmgTZ3waWdRSA`);
const u = new URL('http://complexsearch.kugou.com/v2/search/song');
for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));

const r = await fetch(u.toString(), {
    headers: {
        'User-Agent': 'Android14-1070-11070-201-0-SearchSong-wifi',
        'KG-Rec': '1', 'KG-RC': '1', 'KG-CLIENTTIMEMS': String(clientTimeMs), mid,
        'x-router': 'complexsearch.kugou.com',
    },
});
const j = await r.json();
console.log('status:', j.status, 'error_code:', j.error_code, 'total:', j.data?.total);
console.log('data keys:', JSON.stringify(Object.keys(j.data || {})));
const lists = j.data?.lists || [];
console.log('lists len:', lists.length);
console.log('lists[0] keys:', JSON.stringify(Object.keys(lists[0] || {})));
const pick = {};
for (const k of ['FileName','SongName','SingerName','AlbumName','AlbumID','FileHash','Duration','AlbumImage','Image','Privilege','PayType']) {
    if (lists[0]?.[k] !== undefined) pick[k] = String(lists[0][k]).slice(0, 90);
}
console.log('picked fields:', JSON.stringify(pick, null, 1));
for (const [i, item] of lists.entries()) {
    console.log(`lists[${i}] isArray=${Array.isArray(item)}`);
    for (const key of ['Info', 'info', 'SongInfo', 'songinfo']) {
        if (Array.isArray(item?.[key])) {
            console.log(`  -> lists[${i}].${key} len=${item[key].length}`);
            console.log('  -> first row keys:', JSON.stringify(Object.keys(item[key][0] || {})));
            console.log('  -> first row:', JSON.stringify(item[key][0]).slice(0, 500));
        }
    }
}
