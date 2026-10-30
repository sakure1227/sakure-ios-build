import io

p = 'src/services/onlineMusic/qq/qqLyricProvider.ts'
s = io.open(p, encoding='utf-8').read()

old = """  try {
    const data = await requestQQ("GetPlayLyricInfo", "music.musichallSong.PlayLyricInfo", param);
    const encryptedLyricHex = data?.lyric;
    const encryptedTransHex = data?.trans;
    const encryptedRomanizationHex = data?.roma;

    if (!encryptedLyricHex) {
      return null;
    }

    const decryptedLyric = await qrcDecrypt(encryptedLyricHex);
    const decryptedTrans = encryptedTransHex ? await qrcDecrypt(encryptedTransHex) : '';
    const decryptedRomanization = encryptedRomanizationHex ? await qrcDecrypt(encryptedRomanizationHex) : '';

    const isQrc = detectIsQrc(decryptedLyric);"""

new = """  try {
    const data = await requestQQ("GetPlayLyricInfo", "music.musichallSong.PlayLyricInfo", param);
    const encryptedLyricHex = data?.lyric;
    const encryptedTransHex = data?.trans;
    const encryptedRomanizationHex = data?.roma;

    if (!encryptedLyricHex) {
      return null;
    }

    // \u660e\u6587\u8fd8\u662f\u5bc6\u6587\uff1f
    //
    // \u5e73\u53f0\u7684\u53d6\u8bcd\u63a5\u53e3\u6709\u4e24\u79cd\u7ed9\u6cd5\uff1a`crypt: 1` \u7ed9\u5bc6\u6587\uff08\u8981 3DES \u89e3\u5bc6\uff09\uff0c
    // `crypt: 0` \u7ed9\u660e\u6587\uff08base64 \u7684 lrc/qrc \u6587\u672c\uff09\u3002
    //
    // \u6211\u4eec\u4f18\u5148\u8981\u660e\u6587\uff1a\u5bc6\u6587\u90a3\u4e00\u8def\u8981\u5728\u6d4f\u89c8\u5668\u91cc\u505a 3DES \u89e3\u5bc6\u518d\u538b\u7f29\uff0c
    // \u800c\u624b\u673a\u7248\u7684 WebView \u4e0a\u90a3\u4e9b\u80fd\u529b\u4e0d\u4e00\u5b9a\u5b58\u5728\uff08\u89e3\u5bc6\u5931\u8d25\u65f6\u53ea\u80fd\u770b\u5230\u300c\u6ca1\u6b4c\u8bcd\u300d\uff0c
    // \u800c\u5e73\u53f0\u672c\u6765\u5c31\u80fd\u7ed9\u660e\u6587\uff0c\u6ca1\u5fc5\u9002\u90e8\u8651\u89e3\u5bc6\u3002
    const plain = readPlainLyric(encryptedLyricHex);

    const decryptedLyric = plain ? plain.text : await qrcDecrypt(encryptedLyricHex);
    const decryptedTrans = encryptedTransHex
      ? (readPlainLyric(encryptedTransHex)?.text ?? await qrcDecrypt(encryptedTransHex))
      : '';
    const decryptedRomanization = encryptedRomanizationHex
      ? (readPlainLyric(encryptedRomanizationHex)?.text ?? await qrcDecrypt(encryptedRomanizationHex))
      : '';

    const isQrc = detectIsQrc(decryptedLyric);"""

assert old in s, 'qq lyric \u89e3\u5bc6\u6bb5\u6ca1\u627e\u5230'
s = s.replace(old, new)

# \u6539 param\uff1acrypt: 0 \u5148\u8981\u660e\u6587
old2 = """  const param = {
    albumName: toBase64(song.album?.name || ''),
    crypt: 1,
    ct: 19,
    cv: 2111,
    interval: Math.floor(song.durationMs / 1000),
    lrc_t: 0,
    qrc: 1,
    qrc_t: 0,
    roma: 1,
    roma_t: 0,"""
new2 = """  const param = {
    albumName: toBase64(song.album?.name || ''),
    // 0 = \u660e\u6587\uff08base64 \u7684\u6b4c\u8bcd\u6587\u672c\uff09\u3002\u5bc6\u6587\uff08crypt: 1\uff09\u8981\u5728\u6d4f\u89c8\u5668\u91cc\u505a 3DES \u89e3\u5bc6\uff0c
    // \u624b\u673a\u7248\u7684 WebView \u4e0d\u4e00\u5b9a\u652f\u6301\uff0c\u6240\u4ee5\u5148\u8981\u660e\u6587\u3002\u89e3\u5bc6\u90a3\u4e00\u8def\u4f5c\u4e3a\u515c\u5e95\u3002
    crypt: 0,
    ct: 19,
    cv: 2111,
    interval: Math.floor(song.durationMs / 1000),
    lrc_t: 0,
    qrc: 1,
    qrc_t: 0,
    roma: 1,
    roma_t: 0,"""
assert old2 in s, 'qq param \u6bb5\u6ca1\u627e\u5230'
s = s.replace(old2, new2)

# \u52a0\u8f85\u52a9\u51fd\u6570
helper = """
/**
 * \u8bfb\u660e\u6587\u6b4c\u8bcd\uff08\u5e73\u53f0\u5728 `crypt: 0` \u65f6\u7ed9\u7684\u90a3\u4e00\u4efd\uff09\u3002
 *
 * \u5b83\u662f base64 \u7684 lrc/qrc \u6587\u672c\u3002\u4e0e\u5bc6\u6587\u7684\u533a\u522b\uff1a\u5bc6\u6587\u662f\u5341\u516d\u8fdb\u5236\u7684\u5b57\u8282\uff08\u89e3\u5bc6\u540e\u624d\u662f\u6587\u672c\uff09\uff0c
 * \u660e\u6587\u5c31\u662f base64\u3002\u5206\u5f00\u7684\u65b9\u6cd5\uff1a\u89e3\u5bc6\u540e\u7684\u5185\u5bb9\u4ee5 `<` \u5f00\u5934\uff08QRC \u662f XML\uff09\uff0c\u800c\u660e\u6587\u7684 base64
 * \u89e3\u7801\u540e\u662f\u6b4c\u8bcd\u6587\u672c\uff08\u4ee5 `[00:` \u8fd9\u6837\u7684\u65f6\u95f4\u8bb0\u5f00\u5934\uff09\u3002
 *
 * \u6309\u8fd9\u4e2a\u533a\u522b\u5bf9\uff1a\u660e\u6587\u76f4\u63a5\u7528\uff0c\u5bc6\u6587\u8d70\u89e3\u5bc6\u3002
 */
const readPlainLyric = (value: string): { text: string } | null => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  // \u5bc6\u6587\u662f\u5341\u516d\u8fdb\u5236\uff08\u53ea\u6709 0-9a-f\uff09\uff0c\u660e\u6587\u7684 base64 \u91cc\u6709\u5927\u5c0f\u5199\u5b57\u6bcd\u4e0e\u3001/=\u3002
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    return null;
  }
  try {
    const decoded = decodeBase64Utf8(raw);
    if (!decoded.trim()) return null;
    // QRC \u662f XML\uff0c\u666e\u901a lrc \u4ee5\u65f6\u95f4\u8bb0\u5f00\u5934\u3002
    if (!decoded.trimStart().startsWith('<') && !/^\\[\\d+:/]/.test(decoded.trim())) {
      return null;
    }
    return { text: decoded };
  } catch {
    return null;
  }
};

/** base64 \u89e3\u7801\u4e3a UTF-8 \u6587\u672c\uff08\u4e2d\u6587\u4e5f\u8981\u5bf9\uff09\u3002 */
const decodeBase64Utf8 = (value: string): string => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
};
"""

anchor = """export async function fetchQQLyrics("""
assert anchor in s
s = s.replace(anchor, helper + "\n" + anchor, 1)

io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
