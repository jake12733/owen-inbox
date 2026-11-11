/* OW INBOX · 내 폰 원격 조종 (USB + Chrome WebUSB + scrcpy)
   - PC에 USB로 연결된 안드로이드 폰 화면을 폰 모양 창에 띄우고 마우스/키보드로 조작
   - 라이브러리: Tango (ya-webadb, MIT) · 서버: scrcpy v3.3.3 (Apache-2.0) */
const ESM = 'https://esm.sh/';
const SERVER_URL = new URL('scrcpy-server.bin', location.href).href;
let L = null;
async function libs() {
  if (L) return L;
  const names = ['@yume-chan/adb', '@yume-chan/adb-daemon-webusb', '@yume-chan/adb-credential-web', '@yume-chan/adb-scrcpy', '@yume-chan/scrcpy', '@yume-chan/scrcpy-decoder-webcodecs'];
  const [adb, usb, cred, as, sc, dec] = await Promise.all(names.map(n => import(ESM + n)));
  return (L = { adb, usb, cred, as, sc, dec });
}

const css = `
.rp-fab{position:fixed;right:18px;bottom:18px;z-index:150;height:46px;padding:0 16px;border-radius:23px;border:1px solid #323848;background:#151820;color:#e8eaf0;font:700 13.5px var(--font,system-ui);display:flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.rp-fab:hover{border-color:#d4b06a}
.rp-fab i{width:9px;height:9px;border-radius:50%;background:#6d7488}
.rp-fab.on i{background:#3ecf8e;box-shadow:0 0 0 3px rgba(62,207,142,.25)}
.rp{position:fixed;right:24px;top:70px;z-index:160;display:none;flex-direction:column;align-items:center;user-select:none;font-family:var(--font,system-ui)}
.rp.open{display:flex}
.rp-bar{display:flex;align-items:center;gap:6px;margin-bottom:8px;background:#151820;border:1px solid #323848;border-radius:12px;padding:6px 8px;cursor:move;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.rp-bar b{font-size:12.5px;color:#e8eaf0;margin-right:4px}
.rp-bar .st{font-size:11px;color:#a4aabb;margin-right:6px;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp-bar button{height:28px;padding:0 10px;border-radius:8px;border:1px solid #323848;background:#1b1f29;color:#e8eaf0;font:600 12px inherit;cursor:pointer}
.rp-bar button.pri{background:#d4b06a;border-color:#d4b06a;color:#111}
.rp-phone{width:var(--pw,300px);background:#0b0c10;border-radius:44px;padding:12px;box-shadow:0 0 0 2px #2b2f3a,0 0 0 9px #111318,0 30px 70px rgba(0,0,0,.6);position:relative}
.rp-phone:before{content:"";position:absolute;top:20px;left:50%;transform:translateX(-50%);width:76px;height:20px;border-radius:12px;background:#000;z-index:3;pointer-events:none}
.rp-screen{position:relative;border-radius:34px;overflow:hidden;background:#000;aspect-ratio:var(--ar,9/19.5);display:flex;align-items:center;justify-content:center}
.rp-screen canvas{width:100%;height:100%;display:block;touch-action:none;cursor:pointer;outline:none}
.rp-guide{position:absolute;inset:0;padding:54px 20px 20px;color:#e8eaf0;font-size:12.5px;line-height:1.6;overflow:auto;background:linear-gradient(180deg,#141821,#0b0c10)}
.rp-guide h4{font-size:16px;margin-bottom:10px}
.rp-guide ol{padding-left:18px;color:#a4aabb}
.rp-guide ol li{margin-bottom:6px}
.rp-guide ol b{color:#e8eaf0}
.rp-guide .go{width:100%;height:44px;border-radius:12px;border:0;background:#d4b06a;color:#111;font:800 14px inherit;cursor:pointer;margin:12px 0 8px}
.rp-guide .msg{font-size:12px;color:#ffb547;white-space:pre-wrap}
.rp-guide .msg.err{color:#ff8a8a}
.rp-nav{display:flex;justify-content:space-around;width:100%;padding:10px 6px 2px}
.rp-nav button{width:52px;height:34px;border-radius:10px;border:0;background:transparent;color:#a4aabb;cursor:pointer;display:grid;place-items:center}
.rp-nav button:hover{background:#1b1f29;color:#fff}
.rp-nav svg{width:18px;height:18px}
.rp-type{display:flex;gap:6px;margin-top:10px;width:calc(var(--pw,300px) + 18px)}
.rp-type input{flex:1;height:36px;border-radius:10px;border:1px solid #323848;background:#151820;color:#e8eaf0;padding:0 10px;font:13px inherit;outline:none}
.rp-type input:focus{border-color:#d4b06a}
.rp-type button{height:36px;padding:0 12px;border-radius:10px;border:0;background:#d4b06a;color:#111;font:700 12.5px inherit;cursor:pointer}
.rp-side{position:absolute;right:-48px;top:110px;display:flex;flex-direction:column;gap:8px}
.rp-side button{width:36px;height:36px;border-radius:10px;border:1px solid #323848;background:#151820;color:#a4aabb;cursor:pointer;display:grid;place-items:center}
.rp-side button:hover{color:#fff;border-color:#d4b06a}
.rp-side svg{width:16px;height:16px}
@media(max-width:700px){.rp{right:8px;left:8px;top:60px}}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

const ic = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 5l-7 7 7 7"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="6"/></svg>',
  recent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v8"/><path d="M6.3 7.5a8 8 0 1 0 11.4 0"/></svg>',
  vup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l3 3-3 3" transform="rotate(-90 18.5 12)"/></svg>',
  vdn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 12h5"/></svg>',
  shot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l2-2h4l2 2"/></svg>',
};

const fab = document.createElement('button'); fab.className = 'rp-fab'; fab.innerHTML = '<i></i>내 폰 원격'; fab.title = 'USB로 연결한 내 폰을 이 화면에서 조작';
const root = document.createElement('div'); root.className = 'rp';
root.innerHTML = `
  <div class="rp-bar" id="rpBar"><b>내 폰</b><span class="st" id="rpSt">연결 안 됨</span><button id="rpConn" class="pri">연결</button><button id="rpSize" title="크기">크기</button><button id="rpX" title="닫기">✕</button></div>
  <div class="rp-phone" id="rpPhone">
    <div class="rp-screen" id="rpScreen">
      <canvas id="rpCv" tabindex="0"></canvas>
      <div class="rp-guide" id="rpGuide">
        <h4>내 폰을 연결해요</h4>
        <ol>
          <li><b>USB 케이블</b>로 폰을 이 PC에 꽂아요</li>
          <li>폰 <b>설정 → 휴대전화 정보 → 소프트웨어 정보 → 빌드번호</b>를 7번 눌러 개발자 모드 켜기</li>
          <li><b>설정 → 개발자 옵션 → USB 디버깅</b> 켜기</li>
          <li>아래 <b>연결하기</b> → 크롬 창에서 폰 선택 → 폰에 뜨는 <b>"USB 디버깅 허용"</b>에서 <b>항상 허용</b> 체크 후 허용</li>
        </ol>
        <button class="go" id="rpGo">연결하기</button>
        <div class="msg" id="rpMsg"></div>
      </div>
    </div>
    <div class="rp-nav"><button data-k="4" title="뒤로">${ic.back}</button><button data-k="3" title="홈">${ic.home}</button><button data-k="187" title="최근 앱">${ic.recent}</button></div>
    <div class="rp-side"><button data-k="26" title="전원(화면 켜기/끄기)">${ic.power}</button><button data-k="24" title="볼륨 올리기">${ic.vup}</button><button data-k="25" title="볼륨 내리기">${ic.vdn}</button><button id="rpShot" title="화면 캡처 저장">${ic.shot}</button></div>
  </div>
  <div class="rp-type"><input id="rpTxt" placeholder="폰에 입력할 글자 (한글 가능) → Enter"><button id="rpSend">입력</button></div>`;
document.body.append(fab, root);
const $ = id => document.getElementById(id);

let S = null; // session
let vw = 0, vh = 0;
const setSt = (t) => { $('rpSt').textContent = t; };
const msg = (t, err) => { const m = $('rpMsg'); m.textContent = t || ''; m.className = 'msg' + (err ? ' err' : ''); };
const sizes = [260, 300, 360, 420]; let si = +(localStorage.getItem('owRemote.size') ?? 1);
const applySize = () => { root.style.setProperty('--pw', sizes[si] + 'px'); };
applySize();

fab.onclick = () => { root.classList.toggle('open'); };
$('rpX').onclick = () => root.classList.remove('open');
$('rpSize').onclick = () => { si = (si + 1) % sizes.length; localStorage.setItem('owRemote.size', si); applySize(); };
$('rpGo').onclick = () => connect();
$('rpConn').onclick = () => S ? disconnect() : (root.classList.add('open'), connect());

// drag window
(() => { const bar = $('rpBar'); let sx, sy, ox, oy, on = false;
  bar.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; on = true; const r = root.getBoundingClientRect(); sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; bar.setPointerCapture(e.pointerId); });
  bar.addEventListener('pointermove', e => { if (!on) return; root.style.left = Math.max(0, ox + e.clientX - sx) + 'px'; root.style.top = Math.max(0, oy + e.clientY - sy) + 'px'; root.style.right = 'auto'; });
  bar.addEventListener('pointerup', () => on = false); })();

function explain(e) {
  const m = String(e && (e.message || e)) || '';
  if (/claim|Unable to claim|access denied|SecurityError/i.test(m)) return '폰의 USB 연결을 다른 프로그램이 쓰고 있어요.\n· Samsung Smart Switch, 안드로이드 스튜디오, adb 프로그램을 끄고 다시 연결해 보세요.\n· 그래도 안 되면 케이블을 뽑았다 다시 꽂아주세요.\n(' + m + ')';
  if (/NotFound|No device/i.test(m)) return '폰이 목록에 없었어요. USB 디버깅이 켜져 있는지, 케이블이 "데이터 전송"을 지원하는지 확인해 주세요.';
  if (/auth|unauthor/i.test(m)) return '폰에서 "USB 디버깅 허용"을 눌러주세요.';
  return '연결 중 오류: ' + m;
}

async function connect() {
  if (S) return;
  if (!navigator.usb) { msg('이 브라우저는 USB 연결을 지원하지 않아요. PC 크롬이나 엣지에서 열어주세요.', true); return; }
  if (typeof VideoDecoder === 'undefined') { msg('이 브라우저는 화면 디코딩을 지원하지 않아요. 최신 크롬을 써주세요.', true); return; }
  msg('라이브러리 불러오는 중...'); setSt('준비 중');
  let device;
  try {
    const { usb } = await libs();
    device = await usb.AdbDaemonWebUsbDeviceManager.BROWSER.requestDevice();
  } catch (e) { msg(explain(e), true); setSt('연결 안 됨'); return; }
  if (!device) { msg('폰을 선택하지 않았어요. 목록에 폰이 없으면 USB 디버깅을 켜고 케이블을 다시 꽂아주세요.', true); setSt('연결 안 됨'); return; }
  try {
    const { adb, cred, as, sc, dec } = L;
    msg('폰에 연결하는 중... 폰 화면에 "USB 디버깅 허용" 창이 뜨면 허용을 눌러주세요.'); setSt('승인 대기');
    const connection = await device.connect();
    const store = new cred.default('OW INBOX');
    const transport = await adb.AdbDaemonTransport.authenticate({ serial: device.serial, connection, credentialStore: store });
    const A = new adb.Adb(transport);
    msg('화면 전송 준비 중...'); setSt('준비 중');
    const res = await fetch(SERVER_URL);
    if (!res.ok) throw new Error('서버 파일을 받지 못했어요 (' + res.status + ')');
    await as.AdbScrcpyClient.pushServer(A, res.body);
    const Opt = as.AdbScrcpyOptions3_3_3 || as.AdbScrcpyOptionsLatest;
    const options = new Opt({ audio: false, videoCodec: 'h264', maxSize: 1280, videoBitRate: 6_000_000, maxFps: 45, stayAwake: true, clipboardAutosync: false, powerOn: true });
    const client = await as.AdbScrcpyClient.start(A, sc.DefaultServerPath, options);
    client.output.pipeTo(new WritableStream({ write() {} })).catch(() => {});
    if (client.clipboard) client.clipboard.pipeTo(new WritableStream({ write() {} })).catch(() => {});
    const { metadata, stream } = await client.videoStream;
    const cv = $('rpCv');
    const renderer = dec.WebGLVideoFrameRenderer.isSupported ? new dec.WebGLVideoFrameRenderer(cv) : new dec.BitmapVideoFrameRenderer(cv);
    const decoder = new dec.WebCodecsVideoDecoder({ codec: metadata.codec, renderer });
    decoder.sizeChanged(({ width, height }) => { vw = width; vh = height; $('rpScreen').style.setProperty('--ar', width + '/' + height); });
    stream.pipeTo(decoder.writable).catch(() => {});
    S = { A, client, decoder, transport, device, model: metadata.deviceName || device.name || '안드로이드' };
    $('rpGuide').style.display = 'none'; $('rpConn').textContent = '끊기'; $('rpConn').classList.remove('pri');
    setSt(S.model + ' · 연결됨'); fab.classList.add('on');
    transport.disconnected.then(() => cleanup('폰 연결이 끊어졌어요')).catch(() => cleanup('폰 연결이 끊어졌어요'));
    cv.focus();
  } catch (e) {
    console.error(e);
    msg(explain(e) + (e && e.output ? '\n' + e.output.slice(-3).join('\n') : ''), true); setSt('연결 실패');
    try { await device?.raw?.close?.(); } catch {}
  }
}
async function disconnect() { if (!S) return; try { await S.client.close(); } catch {} try { await S.A.close(); } catch {} cleanup('연결을 끊었어요'); }
function cleanup(t) {
  if (!S) return; try { S.decoder.dispose?.(); } catch {}
  S = null; vw = vh = 0; $('rpGuide').style.display = ''; $('rpConn').textContent = '연결'; $('rpConn').classList.add('pri');
  setSt('연결 안 됨'); fab.classList.remove('on'); msg(t || '');
}

// touch / mouse
const cv = $('rpCv');
const BTN = [1, 4, 2, 8, 16];
function pointer(e) {
  if (!S || !vw) return; e.preventDefault(); e.stopPropagation();
  const { AndroidMotionEventAction: A } = L.sc;
  let action;
  if (e.type === 'pointerdown') { action = A.Down; cv.setPointerCapture(e.pointerId); cv.focus(); }
  else if (e.type === 'pointermove') action = e.buttons === 0 ? A.HoverMove : A.Move;
  else if (e.type === 'pointerup' || e.type === 'pointercancel') action = A.Up;
  else return;
  if (action === A.HoverMove) return;
  const r = cv.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * vw;
  const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) * vh;
  S.client.controller?.injectTouch({ action, pointerId: e.pointerType === 'mouse' ? L.sc.ScrcpyPointerId.Finger : BigInt(e.pointerId), pointerX: x, pointerY: y, videoWidth: vw, videoHeight: vh, pressure: action === A.Up ? 0 : 1, actionButton: action === A.Move ? 0 : 1, buttons: action === A.Up ? 0 : 1 }).catch(() => {});
}
['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, pointer));
cv.addEventListener('contextmenu', e => { e.preventDefault(); key(4); });
cv.addEventListener('wheel', e => {
  if (!S || !vw) return; e.preventDefault();
  const r = cv.getBoundingClientRect();
  S.client.controller?.injectScroll({ pointerX: (e.clientX - r.left) / r.width * vw, pointerY: (e.clientY - r.top) / r.height * vh, videoWidth: vw, videoHeight: vh, scrollX: -Math.sign(e.deltaX) * Math.min(3, Math.abs(e.deltaX) / 60 || 0), scrollY: -Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 60 || 1), buttons: 0 }).catch(() => {});
}, { passive: false });

async function key(code) {
  if (!S) return; const { AndroidKeyEventAction: K } = L.sc; const c = S.client.controller; if (!c) return;
  try { await c.injectKeyCode({ action: K.Down, keyCode: code, repeat: 0, metaState: 0 }); await c.injectKeyCode({ action: K.Up, keyCode: code, repeat: 0, metaState: 0 }); } catch {}
}
root.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) key(+b.dataset.k); });
const KEYMAP = { Enter: 66, Backspace: 67, Delete: 112, Tab: 61, Escape: 4, ArrowUp: 19, ArrowDown: 20, ArrowLeft: 21, ArrowRight: 22, Home: 3, ' ': 62 };
cv.addEventListener('keydown', async e => {
  if (!S) return;
  if (KEYMAP[e.key]) { e.preventDefault(); return key(KEYMAP[e.key]); }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && /[\x20-\x7e]/.test(e.key)) { e.preventDefault(); S.client.controller?.injectText(e.key).catch(() => {}); }
});
async function sendText() {
  const t = $('rpTxt').value; if (!S || !t) return;
  try { await S.client.controller?.setClipboard({ content: t, paste: true, sequence: 0n }); $('rpTxt').value = ''; } catch (e) { console.error(e); }
}
$('rpSend').onclick = sendText; $('rpTxt').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendText(); } });
$('rpShot').onclick = async () => { if (!S) return; const b = await S.decoder.snapshot?.(); if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '폰화면-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.png'; a.click(); };
window.addEventListener('beforeunload', () => { try { S && S.client.close(); } catch {} });
