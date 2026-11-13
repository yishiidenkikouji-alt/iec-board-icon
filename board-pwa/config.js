/* ここには公開してよいWebアプリの入口URLだけを設定します。
 * 管理者コード・トークン・氏名・台帳ID・APIキーは絶対に書かないでください。
 * 現在使っているGASの「ウェブアプリURL」（/execで終わるURL）を入れます。
 * 端末の接続先保存が消えた場合も、この共通設定から業務画面を開きます。
 * 画面の「接続先設定」で保存した接続先がある場合は、そちらを優先します。
 */
window.IEC_PWA_CONFIG = Object.freeze({
  gasUrl: 'https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec',
  nativeP086: true, // Default for existing authorized users; server checks remain authoritative.
  nativeP086OptIn: true, // Keep a per-device fallback choice in connection diagnostics.
  version: '2026.11.13-D16'
});

