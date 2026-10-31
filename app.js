/* 《雨后的线索：校园小侦探》—— 主程序：场景切换、互动、计时器、白奶奶通话 */
(function () {
  'use strict';
  const CFG = window.CFG, Snd = window.Snd, Art = window.Art;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const stage = $('#stage');
  const IW = 1367, IH = 768;
  const SX = 1920 / IW, SY = 1080 / IH;
  const state = { cur: null, base: null, found: new Set(), boardAll: false, callShown: false, cctvSeen: new Set(), reviewStep: 0 };
  const SC = {};
  const ORDER = ['start', 'desk', 'notebook', 'scene', 'call1', 'group', 'meeting', 'deskPhone', 'call2', 'map', 'reveal', 'review'];
  const NAMES = { start: '1 开始页', desk: '2 书桌（笔记本合上）', notebook: '3 案件前情 → 前往现场', scene: '4 现场搜证', call1: '5 白奶奶来电',
    group: '6 小组讨论 · 监控', meeting: '7 推理会议', deskPhone: '8a 书桌 · 手机', call2: '8b 视频汇报白奶奶', map: '8c 校园地图', reveal: '8d 真相揭晓时刻', review: '9 笔记本回顾 · 盖章 · 新案件' };

  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function safe(fn) { try { return fn(); } catch (e) { return null; } }
  /* 把一个 w×h 的方块贴到图片里斜放的四边形上（TL,TR,BR,BL），用来把“来电画面”贴进手机屏幕 */
  function quadMatrix(w, h, q) {
    const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], B = [];
    for (let i = 0; i < 4; i++) { const [x, y] = src[i], [X, Y] = q[i]; A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); B.push(X); A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); B.push(Y); }
    for (let c = 0; c < 8; c++) {
      let m = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
      [A[c], A[m]] = [A[m], A[c]]; [B[c], B[m]] = [B[m], B[c]];
      for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; }
    }
    const v = B.map((b, i) => b / A[i][i]);
    return `matrix3d(${v[0]},${v[3]},0,${v[6]},${v[1]},${v[4]},0,${v[7]},0,0,1,0,${v[2]},${v[5]},0,1)`;
  }

  /* ---------- 舞台缩放：固定 16:9，自动适配电视/投影 ---------- */
  function fit() {
    const v = $('#viewport'); const s = Math.min(v.clientWidth / 1920, v.clientHeight / 1080);
    stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  addEventListener('resize', fit); fit();

  /* ---------- 图片截取（用现场大图做细节放大） ---------- */
  function cropStyle(c, ar) {
    const w = c.w, h = w / ar;
    const x0 = Math.min(Math.max(c.cx - w / 2, 0), IW - w), y0 = Math.min(Math.max(c.cy - h / 2, 0), IH - h);
    return `background-image:url(scene.jpg);background-size:${(IW / w) * 100}% auto;background-position:${(x0 / (IW - w)) * 100}% ${(y0 / (IH - h)) * 100}%`;
  }

  /* ---------- 场景管理 ---------- */
  function def(id, o) { o.el.classList.add('scene'); if (o.overlay) o.el.classList.add('overlay'); stage.appendChild(o.el); SC[id] = o; return o; }
  function go(id, opt) {
    const sc = SC[id]; if (!sc) return;
    const prev = state.cur;
    if (prev && SC[prev] && SC[prev].leave) safe(() => SC[prev].leave(id));
    closeFloaters();
    if (sc.overlay) {
      if (sc.under && state.base !== sc.under) { $$('.scene:not(.overlay)').forEach((e) => e.classList.remove('on')); SC[sc.under].el.classList.add('on'); state.base = sc.under; }
      $$('.scene.overlay').forEach((e) => e.classList.remove('on'));
      sc.el.classList.add('on');
    } else {
      $$('.scene').forEach((e) => e.classList.remove('on'));
      sc.el.classList.add('on'); state.base = id;
    }
    state.cur = id;
    musicAuto(!!sc.music);
    document.body.dataset.scene = id;
    if (sc.enter) safe(() => sc.enter(prev, opt));
  }
  function next() { const i = ORDER.indexOf(state.cur); if (SC[state.cur] && SC[state.cur].next && SC[state.cur].next()) return; if (i < ORDER.length - 1) go(ORDER[i + 1]); }
  function prev() { const i = ORDER.indexOf(state.cur); if (SC[state.cur] && SC[state.cur].prev && SC[state.cur].prev()) return; if (i > 0) go(ORDER[i - 1]); }

  /* ---------- 音乐开关（场景自动 + 手动覆盖） ---------- */
  let musicOverride = null;
  function musicAuto(want) { musicOverride = null; Snd.setMusic(want); syncTool(); }
  function toggleMusic() { musicOverride = !Snd.isMusic(); Snd.init(); Snd.setMusic(musicOverride); syncTool(); }

  /* ---------- 布告栏（书桌背景上的 7 张卡片） ---------- */
  const SLOTS = [[535, 40, 140, 120, -2], [743, 77, 137, 123, 0], [982, 38, 128, 135, 1], [1150, 73, 130, 120, 0], [545, 197, 153, 121, -4], [882, 222, 136, 103, 0], [1108, 230, 132, 102, 0]];
  function cardInner(i, ar) {
    if (i < 4) {
      const c = CFG.clues[i];
      if (c.id === 'prints') return `<div class="ph" style="${cropStyle(c.cropA, ar)}"></div>`;
      return `<div class="ph" style="${cropStyle(c.crop, ar)}"></div>`;
    }
    return `<div class="ph cam-ph">${Art.KEY(CFG.cams[CFG.boardCams[i - 4]].id)}</div>`;
  }
  function makeBoard() {
    const b = el('<div class="board"></div>');
    SLOTS.forEach((s, i) => {
      const d = el(`<div class="slot" data-i="${i}" style="left:${(s[0] / 1680) * 100}%;top:${(s[1] / 944) * 100}%;width:${(s[2] / 1680) * 100}%;height:${(s[3] / 944) * 100}%;--rot:${s[4]}deg"><div class="slot-in">${cardInner(i, (s[2] * 0.86) / (s[3] * 0.86))}</div></div>`);
      b.appendChild(d);
    });
    return b;
  }
  function refreshBoards() {
    $$('.board').forEach((b) => {
      $$('.slot', b).forEach((s) => {
        const i = +s.dataset.i;
        const on = i < 4 ? state.found.has(CFG.clues[i].id) : state.boardAll;
        if (on && !s.classList.contains('on')) { s.classList.add('on', 'pop'); setTimeout(() => s.classList.remove('pop'), 900); }
        if (!on) s.classList.remove('on');
      });
    });
  }

  /* ---------- 页面剥开（翻页）效果 ---------- */
  function peel(host, mid, dir) {
    const sh = el(`<div class="peel ${dir === 'back' ? 'back' : ''}"></div>`);
    host.appendChild(sh); Snd.page();
    setTimeout(() => safe(mid), 330);
    setTimeout(() => sh.remove(), 900);
  }

  /* ---------- 计时器 ---------- */
  let activeTimer = null;
  function makeTimer(host, secs) {
    host.innerHTML = `<div class="tm"><svg class="tm-ring" viewBox="0 0 100 100"><circle class="r0" cx="50" cy="50" r="42"/><circle class="r1" cx="50" cy="50" r="42" transform="rotate(-90 50 50)"/></svg><div class="tm-num">00:00</div><div class="tm-ctl"><button class="tm-go">▶ 开始</button><button class="tm-m">−1分</button><button class="tm-p">＋1分</button><button class="tm-r">↺</button></div><div class="tm-done">时间到！</div></div>`;
    const root = $('.tm', host), num = $('.tm-num', host), go_ = $('.tm-go', host), r1 = $('.r1', host);
    const T = { total: secs, remain: secs, running: false, end: 0, id: null, done: false };
    const C = 2 * Math.PI * 42; r1.style.strokeDasharray = C;
    function draw() {
      const r = Math.max(0, Math.ceil(T.remain));
      num.textContent = String(Math.floor(r / 60)).padStart(2, '0') + ':' + String(r % 60).padStart(2, '0');
      r1.style.strokeDashoffset = C * (1 - (T.total ? Math.min(1, T.remain / T.total) : 0));
      root.classList.toggle('warn', T.remain <= 60 && T.remain > 0 && T.running);
      root.classList.toggle('end', T.done);
      go_.textContent = T.running ? '❚❚ 暂停' : (T.remain < T.total && !T.done ? '▶ 继续' : '▶ 开始');
    }
    function tick() {
      T.remain = (T.end - Date.now()) / 1000;
      if (T.remain <= 0) { T.remain = 0; T.running = false; T.done = true; clearInterval(T.id); Snd.timeup(); }
      draw();
    }
    T.toggle = function () {
      Snd.init();
      if (T.done) { T.reset(); return; }
      if (T.running) { T.running = false; clearInterval(T.id); }
      else { T.running = true; T.end = Date.now() + T.remain * 1000; T.id = setInterval(tick, 200); Snd.click(); }
      draw();
    };
    T.add = function (d) { T.done = false; T.remain = Math.max(0, T.remain + d); T.total = Math.max(T.total, T.remain); if (T.running) T.end = Date.now() + T.remain * 1000; draw(); Snd.click(); };
    T.reset = function () { clearInterval(T.id); T.running = false; T.done = false; T.total = secs; T.remain = secs; draw(); };
    go_.onclick = T.toggle; $('.tm-m', host).onclick = () => T.add(-60); $('.tm-p', host).onclick = () => T.add(60); $('.tm-r', host).onclick = T.reset;
    draw(); return T;
  }

  /* ---------- 长按按钮（防止学生误点） ---------- */
  function longPress(btn, ms, fn) {
    let t = null;
    const start = (e) => { e.preventDefault(); btn.classList.add('holding'); Snd.init(); t = setTimeout(() => { btn.classList.remove('holding'); fn(); }, ms); };
    const stop = () => { clearTimeout(t); btn.classList.remove('holding'); };
    btn.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
  }

  /* ---------- 白奶奶：语音（浏览器朗读）与动作 ---------- */
  const Voice = (function () {
    let voice = null, timer = null, curAudio = null, gen = 0;
    const V = () => Object.assign({ rate: 1.5, pitch: 0.8, voiceName: '' }, CFG.voice || {});
    function pick() {
      if (!window.speechSynthesis) return;
      const vs = speechSynthesis.getVoices(), want = V().voiceName;
      voice = (want && vs.find((v) => v.name.toLowerCase().includes(want.toLowerCase()))) ||
        vs.find((v) => /zh/i.test(v.lang) && /xiaoxiao|xiaoyi|huihui|yaoyao|tingting|mei-?jia|sin-?ji|yunxi/i.test(v.name)) || vs.find((v) => /^zh/i.test(v.lang)) || null;
    }
    if (window.speechSynthesis) { pick(); speechSynthesis.onvoiceschanged = pick; }
    function stop() { gen++; clearTimeout(timer); if (window.speechSynthesis) speechSynthesis.cancel(); if (curAudio) { curAudio.pause(); curAudio = null; } }
    /* 把一句话按标点切成小段：每段单独朗读，语气有起伏、有自然停顿，也避免浏览器朗读长句时中途卡住 */
    function split(t) {
      const parts = t.match(/[^，。！？、…；,.!?;]+[，。！？、…；,.!?;]*/g) || [t], out = [];
      parts.forEach((p) => { if (out.length && out[out.length - 1].replace(/[，。！？、…；,.!?;]/g, '').length < 3) out[out.length - 1] += p; else out.push(p); });
      return out;
    }
    function say(line, ui, done) {
      stop(); const my = gen;
      let shown = false, finished = false;
      const show = () => {
        if (shown || my !== gen) return; shown = true;
        if (ui.sub) { ui.sub.textContent = line.t; ui.sub.classList.add('on'); }
        emote(ui, line.e); ui.wrap.classList.add('talking');
      };
      const fin = () => {
        if (finished || my !== gen) return; finished = true; show(); ui.wrap.classList.remove('talking'); clearTimeout(timer);
        timer = setTimeout(() => { if (my === gen && ui.sub) ui.sub.classList.remove('on'); }, 4000); if (done) done();
      };
      const est = line.t.length * 230 / Math.max(0.6, V().rate / 1.5) + 2500;
      const tts = () => {
        if (!window.speechSynthesis) { show(); timer = setTimeout(fin, est); return; }
        const parts = split(line.t), cfg = V(); let k = 0;
        // 字幕与动作：等声音真正开始说话才出现（最多等 1.2 秒），保证说话和字幕同步
        const fallback = setTimeout(show, 1200);
        const next = () => {
          if (my !== gen) return;
          if (k >= parts.length) { clearTimeout(fallback); fin(); return; }
          const p = parts[k++], last = /[？?]\s*$/.test(p), excl = /[！!]\s*$/.test(p);
          const u = new SpeechSynthesisUtterance(p); u.lang = 'zh-CN'; u.volume = 1;
          u.rate = Math.min(2, cfg.rate * (0.96 + Math.random() * 0.1) * (excl ? 1.04 : 1));
          u.pitch = Math.max(0.1, Math.min(2, cfg.pitch + (last ? 0.1 : 0) + (excl ? 0.06 : 0) + (Math.random() - 0.5) * 0.08));
          if (voice) u.voice = voice;
          u.onstart = () => { clearTimeout(fallback); show(); };
          u.onend = () => setTimeout(next, /[。！？.!?]\s*$/.test(p) ? 90 : 10);
          u.onerror = (ev) => { if (ev && (ev.error === 'interrupted' || ev.error === 'canceled')) return; next(); };
          speechSynthesis.speak(u);
        };
        setTimeout(next, 40);
        clearTimeout(timer); timer = setTimeout(fin, est + 1500);
      };
      if (line.audio) { const a = new Audio(line.audio); curAudio = a; a.onplaying = show; a.onended = fin; a.onerror = tts; a.play().catch(tts); } else tts();
    }
    function emote(ui, e) {
      ['happy', 'puzzled', 'surprised', 'thanks'].forEach((x) => ui.wrap.classList.remove('e-' + x));
      void ui.wrap.offsetWidth;
      if (e) ui.wrap.classList.add('e-' + e);
      const sym = { happy: '♪', puzzled: '？', surprised: '！', thanks: '♥' }[e];
      if (ui.fx && sym) { ui.fx.textContent = sym; ui.fx.className = 'gm-fx pop ' + e; setTimeout(() => ui.fx && ui.fx.classList.remove('pop'), 2200); }
    }
    return { say, stop };
  })();

  /* ============================================================
     场景 1：开始页
     ============================================================ */
  (function () {
    const e = el(`<section id="s-start"><div class="blurbg"></div><div class="cover-wrap"><img src="cover.jpg" alt="雨后的线索：校园小侦探"><button class="cover-hit" aria-label="开始调查"></button></div><div class="petals"></div><div class="start-hint">按 F 进入全屏　·　按 J 打开老师菜单</div></section>`);
    const pet = $('.petals', e);
    for (let i = 0; i < 18; i++) pet.appendChild(el(`<i class="petal" style="left:${Math.random() * 100}%;--d:${8 + Math.random() * 8}s;--dl:${-Math.random() * 14}s;--s:${14 + Math.random() * 16}px;--c:${['#f4a3b5', '#f7bd7c', '#d9b8ee', '#f8d7e0'][i % 4]}"></i>`));
    $('.cover-hit', e).onclick = () => { Snd.init(); Snd.click(); go('desk'); };
    def('start', { el: e });
  })();

  /* ============================================================
     场景 2：书桌（笔记本合上）
     ============================================================ */
  (function () {
    const e = el(`<section id="s-desk"><img class="fill" src="desk.jpg" alt=""><div class="boardhost"></div><button class="nb-hit" aria-label="翻开侦探笔记"><span class="tip">点我翻开侦探笔记</span></button></section>`);
    $('.boardhost', e).appendChild(makeBoard());
    $('.nb-hit', e).onclick = () => { Snd.init(); Snd.page(); e.classList.add('zoom'); setTimeout(() => { go('notebook'); setTimeout(() => e.classList.remove('zoom'), 700); }, 450); };
    def('desk', { el: e, next() { $('.nb-hit', e).click(); return true; } });
  })();

  /* ============================================================
     场景 3：笔记本·案件前情 → 前往现场
     ============================================================ */
  (function () {
    const e = el(`<section id="s-nb"><img class="fill" src="notebook.jpg" alt="">
      <div class="nb-go"><div class="nb-go-t">小侦探们，出发！</div><button class="nb-lens" aria-label="前往现场"><i></i></button><button class="btn lg go-scene">前往现场</button></div></section>`);
    function go2() { Snd.init(); Snd.click(); go('scene'); }
    $('.go-scene', e).onclick = go2; $('.nb-lens', e).onclick = go2;
    def('notebook', { el: e, next() { go2(); return true; }, prev() { go('desk'); return true; } });
  })();

  /* ============================================================
     场景 4：现场搜证
     ============================================================ */
  (function () {
    const e = el(`<section id="s-scene"><img class="fill" src="scene.jpg" alt=""><div class="hots"></div>
      <div class="hud"><div class="hud-t">线索</div><div class="slots"></div><div class="hud-n">0 / 4</div></div>
      <button class="btn small hintbtn">💡 提示</button><div class="detail"></div></section>`);
    const hots = $('.hots', e), slots = $('.slots', e), detail = $('.detail', e);
    const cur = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="26" cy="26" r="17" fill="#cfeaf2" fill-opacity=".55" stroke="#d6a43e" stroke-width="6"/><path d="M16 20q4-8 12-8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/><path d="M39 39L58 58" stroke="#8a4f2b" stroke-width="9" stroke-linecap="round"/></svg>') + '") 22 22, zoom-in';
    hots.style.cursor = cur;
    CFG.clues.forEach((c, i) => {
      (c.hots || [c.hot]).forEach((h) => hots.appendChild(el(`<button class="hot" data-i="${i}" aria-label="${c.name}" style="left:${(h.x / IW) * 100}%;top:${(h.y / IH) * 100}%;width:${((h.r * 2) / IW) * 100}%;cursor:inherit"><span class="ring"></span><span class="ring r2"></span><span class="chk">✓</span></button>`)));
      slots.appendChild(el(`<div class="hslot" data-i="${i}"><span>${i + 1}</span></div>`));
    });
    function updateHud() {
      $$('.hslot', e).forEach((s) => { const c = CFG.clues[+s.dataset.i], on = state.found.has(c.id); s.classList.toggle('on', on); if (on && !s.querySelector('.ph')) s.insertAdjacentHTML('beforeend', `<div class="ph" style="${cropStyle(c.crop || c.cropA, 1)}"></div>`); });
      $$('.hot', e).forEach((h) => h.classList.toggle('found', state.found.has(CFG.clues[+h.dataset.i].id)));
      $('.hud-n', e).textContent = state.found.size + ' / 4';
    }
    function cardHtml(c) {
      const num = '①②③④'[c.no - 1];
      const ask = `<div class="dc-ask"><b>想一想：</b>${c.ask.join('　')}</div>`;
      let media;
      if (c.id === 'hair') media = `<div class="dc-lens"><div class="lens-img" style="${cropStyle(c.lens || c.crop, 1)}"></div><div class="lens-rim"></div></div><div class="lens-handle"></div>`;
      else if (c.id === 'prints') media = `<div class="dc-two">${['cropA', 'cropB', 'cropC'].map((k, n) => `${n ? '<div class="vs">VS</div>' : ''}<figure><div class="dc-media sm" style="${cropStyle(c[k], 4 / 3)}"></div><figcaption>脚印 ${'ABC'[n]}</figcaption></figure>`).join('')}</div>`;
      else if (c.id === 'dew') media = `<div class="dc-media" style="${cropStyle(c.crop, 4 / 3)}">${[[22, 28], [38, 52], [54, 24], [70, 46], [30, 72], [62, 70], [84, 66], [48, 40]].map((p, i) => `<i class="drop" style="left:${p[0]}%;top:${p[1]}%;animation-delay:${i * 0.35}s"></i>`).join('')}</div>`;
      else media = `<div class="dc-media" style="${cropStyle(c.crop, 4 / 3)}"></div>`;
      return `<div class="dc c-${c.id}"><div class="tape"></div><h2>线索${num}　${c.name}</h2><div class="dc-body">${media}</div>${ask}<button class="btn dc-close">收好线索</button></div>`;
    }
    function open(i) {
      const c = CFG.clues[i]; Snd.init(); Snd.pop();
      detail.innerHTML = cardHtml(c); detail.classList.add('on');
      $('.dc-close', detail).onclick = close;
      if (!state.found.has(c.id)) { state.found.add(c.id); setTimeout(() => { Snd.ding(); updateHud(); refreshBoards(); }, 350); }
    }
    function close() {
      if (!detail.classList.contains('on')) return false;
      detail.classList.remove('on'); Snd.click();
      if (state.found.size === 4 && !state.callShown) { state.callShown = true; setTimeout(() => { if (state.base === 'scene') go('call1'); }, 900); }
      return true;
    }
    $$('.hot', e).forEach((h) => h.onclick = () => open(+h.dataset.i));
    detail.onclick = (ev) => { if (ev.target === detail) close(); };
    $('.hintbtn', e).onclick = () => { hots.classList.add('hint'); setTimeout(() => hots.classList.remove('hint'), 2600); Snd.click(); };
    def('scene', { el: e, enter() { updateHud(); }, close, leave() { detail.classList.remove('on'); }, hasFloater: () => detail.classList.contains('on') });
  })();

  /* ============================================================
     白奶奶视频电话（overlay）：call1 / call2
     ============================================================ */
  const Call = (function () {
    const e = el(`<section id="s-call"><div class="call-dim"></div>
      <div class="call-win"><div class="call-head"><span class="call-name">📞 白奶奶</span><span class="call-time">00:00</span><button class="hang" aria-label="挂断">挂断</button></div>
        <div class="call-video"><div class="call-bg"></div><div class="rings"><i></i><i></i><i></i></div><div class="gm-wrap"><img class="gm" src="grandma.png" alt="白奶奶"></div><div class="gm-fx"></div>
          <div class="call-ringtxt">白奶奶来电…</div><button class="btn accept">✔ 接听</button><div class="call-sub"></div></div></div>
      <div class="call-bar"></div></section>`);
    const ui = { wrap: $('.gm-wrap', e), fx: $('.gm-fx', e), sub: $('.call-sub', e) };
    let key = null, live = false, tmr = null, t0 = 0, autoId = null;
    function lines() { return CFG.grandma[key].lines; }
    function buildBar() {
      const bar = $('.call-bar', e); bar.innerHTML = '';
      lines().forEach((l, i) => { const b = el(`<button class="ln"><i>${i + 1}</i>${l.k}</button>`); b.title = l.t; b.onclick = () => say(i); bar.appendChild(b); });
      if (key === 'call2') { const b = el(`<button class="ln map"><i>0</i>🗺 校园地图</button>`); b.onclick = openMap; bar.appendChild(b); }
    }
    function say(i) { const l = lines()[i]; if (l && live) Voice.say(l, ui); }
    function open(k, outgoing) {
      key = k; live = false; clearTimeout(autoId); clearInterval(tmr);
      e.classList.remove('live'); e.classList.toggle('outgoing', !!outgoing);
      $('.call-ringtxt', e).textContent = CFG.grandma[k].ring; $('.call-time', e).textContent = '00:00'; ui.sub.classList.remove('on');
      buildBar(); Snd.init(); Snd.ring(true);
      if (outgoing) autoId = setTimeout(accept, 2000);
    }
    function accept() {
      if (live) return; clearTimeout(autoId); live = true; Snd.ring(false); Snd.click();
      e.classList.add('live'); t0 = Date.now();
      tmr = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('.call-time', e).textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 500);
      setTimeout(() => Voice.say(CFG.grandma[key].intro, ui), 900);
    }
    function stop() { clearTimeout(autoId); clearInterval(tmr); Snd.ring(false); Voice.stop(); live = false; }
    function hangup() { stop(); Snd.hang(); go(key === 'call1' ? 'group' : 'deskPhone'); }
    function openMap() { stop(); Snd.click(); go('map'); }
    $('.accept', e).onclick = accept; $('.hang', e).onclick = hangup;
    def('call1', { el: e, overlay: true, under: 'scene', enter() { open('call1', false); }, leave() { stop(); } });
    // call2 与 call1 共用同一个界面
    SC.call2 = { el: e, overlay: true, under: 'deskPhone', enter() { open('call2', true); }, leave() { stop(); } };
    return { say, accept, openMap, hangup, isLive: () => live, key: () => key };
  })();

  /* ============================================================
     场景 6：小组讨论（书桌 + 老电脑 + CCTV）
     ============================================================ */
  (function () {
    const e = el(`<section id="s-group"><img class="fill" src="desk_pc.jpg" alt=""><div class="boardhost"></div><div class="pc-over"></div>
      <div class="ribbon">小组讨论时间</div><div class="timer-host"></div>
      <button class="pc" aria-label="打开校园监控"><span class="tip">点我打开校园监控</span></button>
      <button class="btn endbtn">长按 结束讨论 ▶<i></i></button>
      <div class="cctv"><div class="mon"><div class="mon-screen"><div class="grid"></div><div class="big"><div class="big-in"></div><div class="big-hud"></div><button class="btn small back">◀ 返回监控墙</button></div><div class="scan"></div></div><div class="mon-bar"><span class="led"></span><b>校园监控</b><button class="btn small mon-close">关闭监控</button></div></div></div></section>`);
    $('.boardhost', e).appendChild(makeBoard());
    const grid = $('.grid', e), cctv = $('.cctv', e), big = $('.big', e), bigIn = $('.big-in', e);
    CFG.gridOrder.forEach((r, g) => {
      const cam = CFG.cams[r];
      grid.appendChild(el(`<button class="cell" data-r="${r}"><div class="cam-art">${Art.KEY(cam.id)}</div><span class="cam-id">CAM 0${g + 1}</span><span class="cam-time">${cam.time}</span><span class="rec">● REC</span></button>`));
    });
    $$('.cell', e).forEach((c) => c.onclick = () => openBig(+c.dataset.r, +$$('.cell', e).indexOf(c)));
    function openBig(r, g) {
      const cam = CFG.cams[r]; Snd.static();
      bigIn.innerHTML = Art.KEY(cam.id); bigIn.classList.remove('zoomed'); bigIn.style.transformOrigin = '50% 50%'; bigIn.style.transform = '';
      $('.big-hud', e).innerHTML = `<span class="cam-id">CAM 0${g + 1}</span><span class="cam-time">${cam.time}</span><span class="rec">● REC</span><span class="zhint">点一下画面可放大</span>`;
      big.classList.add('on'); state.cctvSeen.add(r);
    }
    bigIn.onclick = () => { bigIn.classList.toggle('zoomed'); bigIn.style.transform = bigIn.classList.contains('zoomed') ? 'scale(2.3)' : ''; Snd.click(); };
    bigIn.onmousemove = (ev) => { if (!bigIn.classList.contains('zoomed')) return; const r = bigIn.getBoundingClientRect(); bigIn.style.transformOrigin = ((ev.clientX - r.left) / r.width * 100) + '% ' + ((ev.clientY - r.top) / r.height * 100) + '%'; };
    $('.back', e).onclick = () => { big.classList.remove('on'); Snd.click(); };
    function openCctv() { Snd.init(); Snd.static(); cctv.classList.add('on'); big.classList.remove('on'); }
    function closeCctv() { if (!cctv.classList.contains('on')) return false; if (big.classList.contains('on')) { big.classList.remove('on'); return true; } cctv.classList.remove('on'); Snd.click(); return true; }
    $('.pc', e).onclick = openCctv; $('.mon-close', e).onclick = () => { big.classList.remove('on'); closeCctv(); };
    longPress($('.endbtn', e), 900, () => { Snd.click(); go('meeting'); });
    let T = null;
    def('group', { el: e, music: true, close: closeCctv, hasFloater: () => cctv.classList.contains('on'),
      enter() { refreshBoards(); if (!T) T = makeTimer($('.timer-host', e), CFG.timers.group); activeTimer = T; },
      leave() { cctv.classList.remove('on'); big.classList.remove('on'); state.boardAll = true; } });
  })();

  /* ============================================================
     场景 7：推理会议（布告栏 + 语言支架卷轴）
     ============================================================ */
  (function () {
    const e = el(`<section id="s-meet"><img class="fill blur" src="desk.jpg" alt=""><div class="meet-dim"></div>
      <div class="ribbon">推理会议</div><div class="timer-host"></div>
      <div class="cork"><svg class="strings" viewBox="0 0 1060 720"></svg><div class="cards"></div></div>
      <button class="roll" aria-label="展开语言支架"><img src="scroll_closed.png" alt=""><span class="tip">点开卷轴 · 语言支架</span></button>
      <div class="scroll-panel"><div class="paper"><h3>语言支架</h3><div class="cats"></div></div><button class="btn small sp-close">收起卷轴</button></div>
      <div class="lightbox"><div class="lb-card"></div></div>
      <button class="btn endbtn2">结束 ▶</button></section>`);
    /* 布告栏：上排 4 张线索照片，下排最多 5 张监控照片（CFG.meetCams） */
    const meetCams = (CFG.meetCams || []).slice(0, 5);
    const POS = [[8, 34, -2, 'L'], [272, 52, 1.5, 'L'], [536, 30, -1.5, 'L'], [800, 50, 2, 'L']]
      .concat(meetCams.map((_, k) => [8 + k * 212, 392 + (k % 2 ? 22 : -4), [-2, 1.5, -1, 2, -1.5][k], 'S']));
    const LAB = ['线索① 折断的花枝', '线索② 神秘的毛发', '线索③ 泥地脚印', '线索④ 叶上露珠'].concat(meetCams.map((r) => '监控 · ' + (CFG.camNames[CFG.cams[r].id] || '')));
    const cards = $('.cards', e);
    POS.forEach((p, i) => {
      let inner;
      if (i < 4) { const c = CFG.clues[i]; inner = `<div class="ph" style="${cropStyle(c.crop || c.cropA, 4 / 3)}"></div>`; }
      else inner = `<div class="ph">${Art.KEY(CFG.cams[meetCams[i - 4]].id)}</div>`;
      const pin = ['#e57a8a', '#7fa6d6', '#9b8bc8', '#e0a63c', '#e57a8a', '#7fa6d6', '#e0a63c', '#79bf86', '#e57a8a'][i];
      const d = el(`<button class="pc2 ${p[3] === 'S' ? 'sm' : ''}" data-i="${i}" style="left:${p[0]}px;top:${p[1]}px;--rot:${p[2]}deg"><i class="pin" style="background:${pin}"></i>${inner}<span class="lab">${LAB[i]}</span></button>`);
      d.onclick = () => zoom(i); cards.appendChild(d);
    });
    // 红线
    const pts = POS.map((p) => [p[0] + (p[3] === 'S' ? 100 : 125), p[1] + 12]);
    const links = [[0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 6], [3, 7], [4, 5], [5, 6], [6, 7], [7, 8], [3, 8]].filter(([a, b]) => pts[a] && pts[b]);
    $('.strings', e).innerHTML = links.map(([a, b]) => `<path d="M${pts[a][0]} ${pts[a][1]} Q${(pts[a][0] + pts[b][0]) / 2} ${(pts[a][1] + pts[b][1]) / 2 + 40} ${pts[b][0]} ${pts[b][1]}" stroke="#c4474f" stroke-width="3.2" fill="none" opacity=".85"/>`).join('');
    const lb = $('.lightbox', e), lbc = $('.lb-card', e);
    function zoom(i) {
      Snd.pop();
      let inner;
      if (i < 4) { const c = CFG.clues[i]; inner = c.id === 'prints' ? `<div class="lb-two">${['cropA', 'cropB', 'cropC'].map((k) => `<div class="ph" style="${cropStyle(c[k], 4 / 3)}"></div>`).join('')}</div>` : `<div class="ph big" style="${cropStyle(c.crop, 4 / 3)}"></div>`; }
      else inner = `<div class="ph big cam-ph">${Art.KEY(CFG.cams[meetCams[i - 4]].id)}</div>`;
      lbc.innerHTML = inner + `<div class="lb-lab">${LAB[i]}</div>`; lb.classList.add('on');
    }
    lb.onclick = () => lb.classList.remove('on');
    const CATS = [['提出问题', '#8fb9d9', ['请问……？', '为什么……？', '这些线索说明了什么？']], ['表达推测', '#9cc79a', ['我认为……，因为……']], ['表示同意', '#e9c96a', ['我同意你的看法，因为……']],
      ['补充意见', '#f0a86a', ['我想补充一点……']], ['提出质疑', '#e88fa0', ['可是，我想知道……', '如果……，为什么……？']], ['礼貌回应', '#b9a3dc', ['谢谢你的意见。', '不好意思，我有不同的看法。']]];
    $('.cats', e).innerHTML = CATS.map((c) => `<div class="cat" style="--c:${c[1]}"><b>${c[0]}</b>${c[2].map((s) => `<p>${s}</p>`).join('')}</div>`).join('');
    $$('.cat', e).forEach((c) => c.onclick = () => { const on = c.classList.contains('spot'); $$('.cat', e).forEach((x) => x.classList.remove('spot')); $('.cats', e).classList.toggle('dim', !on); if (!on) c.classList.add('spot'); Snd.click(); });
    const panel = $('.scroll-panel', e);
    function openScroll() { Snd.page(); panel.classList.add('on'); e.classList.add('rolled'); }
    function closeScroll() { if (!panel.classList.contains('on')) return false; panel.classList.remove('on'); e.classList.remove('rolled'); Snd.page(); return true; }
    $('.roll', e).onclick = openScroll; $('.sp-close', e).onclick = closeScroll;
    $('.endbtn2', e).onclick = () => { Snd.click(); go('deskPhone'); };
    let T = null;
    def('meeting', { el: e, music: true, close() { if (lb.classList.contains('on')) { lb.classList.remove('on'); return true; } return closeScroll(); }, hasFloater: () => lb.classList.contains('on') || panel.classList.contains('on'),
      enter() { if (!T) T = makeTimer($('.timer-host', e), CFG.timers.meeting); activeTimer = T; }, leave() { closeScroll(); lb.classList.remove('on'); } });
  })();

  /* ============================================================
     场景 8a：书桌 · 手机
     ============================================================ */
  (function () {
    const P = (x, y) => [x * 1920 / 1376, y * 1080 / 768];
    const e = el(`<section id="s-dphone"><img class="fill" src="desk_phone.jpg" alt=""><div class="boardhost"></div>
      <div class="ribbon small">案件有线索了！给白奶奶打个电话吧</div>
      <div class="pfx"><div class="pfx-img"></div><div class="pscreen"><div class="ps-waves"><i></i><i></i></div><div class="ps-top">视频来电</div><div class="ps-face"><img src="grandma.png" alt=""></div><div class="ps-name">白奶奶</div><div class="ps-sub">邀请你视频通话…</div><div class="ps-btns"><span class="no">✕</span><span class="yes">📞</span></div></div></div>
      <button class="phone" aria-label="接听白奶奶的视频电话"><span class="tip">点我接听白奶奶的电话</span></button></section>`);
    $('.boardhost', e).appendChild(makeBoard());
    $('.pscreen', e).style.transform = quadMatrix(220, 440, [P(958, 236), P(1046, 250), P(1026, 452), P(932, 440)]);
    let buzzes = 0, bt = null;
    function buzzLoop() { if (state.cur !== 'deskPhone' || buzzes >= 4) return; buzzes++; Snd.buzz(); bt = setTimeout(buzzLoop, 2600); }
    $('.phone', e).onclick = () => { Snd.init(); Snd.click(); clearTimeout(bt); e.classList.add('zoomp'); setTimeout(() => { go('call2'); setTimeout(() => e.classList.remove('zoomp'), 700); }, 450); };
    def('deskPhone', { el: e, enter() { state.boardAll = true; refreshBoards(); buzzes = 0; clearTimeout(bt); bt = setTimeout(buzzLoop, 900); }, leave(nx) { if (nx !== 'call2') clearTimeout(bt); }, next() { $('.phone', e).click(); return true; } });
  })();

  /* ============================================================
     场景 8c：校园地图
     ============================================================ */
  (function () {
    const N = Art.MAP_NODES, ED = Art.MAP_EDGES;
    const e = el(`<section id="s-map"><div class="map-zoom"><div class="map-art"></div>
        <svg class="trail" viewBox="0 0 1920 1080"><polyline points="" /></svg><div class="markers"></div><div class="walker"><img src="grandma.png" alt=""></div><button class="hole" aria-label="小洞口"><i></i><span>发现小洞口！</span></button></div>
      <div class="map-card"><b>请你们指引白奶奶</b>白奶奶在花园。她应该往哪里走？</div>
      <div class="pip"><div class="gm-wrap"><img class="gm" src="grandma.png" alt=""></div><div class="gm-fx"></div></div><div class="call-sub map-sub"></div>
      <div class="call-bar mapbar"></div><button class="btn small rbtn">真相揭晓 ▶</button></section>`);
    $('.map-art', e).innerHTML = Art.map();
    const markers = $('.markers', e), walker = $('.walker', e), trail = $('.trail polyline', e), hole = $('.hole', e);
    const ui = { wrap: $('.pip .gm-wrap', e), fx: $('.pip .gm-fx', e), sub: $('.map-sub', e) };
    let at = 'G', moving = false, trailPts = [];
    Object.keys(N).forEach((k) => { if (!N[k].n) return; const m = el(`<button class="mk" data-k="${k}" style="left:${N[k].x}px;top:${N[k].y}px" aria-label="${N[k].n}"><i></i></button>`); m.onclick = () => walkTo(k); markers.appendChild(m); });
    function place(k) { walker.style.left = N[k].x + 'px'; walker.style.top = N[k].y + 'px'; }
    function path(a, b) {
      const q = [[a]], seen = new Set([a]);
      while (q.length) { const p = q.shift(), last = p[p.length - 1]; if (last === b) return p; ED.forEach(([x, y]) => { const nx = x === last ? y : (y === last ? x : null); if (nx && !seen.has(nx)) { seen.add(nx); q.push(p.concat(nx)); } }); }
      return [a];
    }
    function walkTo(k) {
      if (moving || k === at) return; Snd.init(); const route = path(at, k); moving = true; walker.classList.add('walk'); hole.classList.remove('on');
      const pts = route.map((r) => N[r]), lens = [0];
      for (let n = 1; n < pts.length; n++) lens.push(lens[n - 1] + Math.hypot(pts[n].x - pts[n - 1].x, pts[n].y - pts[n - 1].y));
      const total = lens[lens.length - 1], dur = Math.max(500, total / 0.85), t0 = performance.now(); let lastStep = -999;
      (function f(t) {
        const p = Math.min(1, (t - t0) / dur), d = total * (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2) * 0.35 + total * p * 0.65; // 起步/收步稍缓，中间匀速，整体偏快
        let n = 1; while (n < lens.length - 1 && lens[n] < d) n++;
        const a = pts[n - 1], b = pts[n], seg = lens[n] - lens[n - 1] || 1, u = Math.min(1, Math.max(0, (d - lens[n - 1]) / seg));
        const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
        walker.style.left = x + 'px'; walker.style.top = y + 'px'; trailPts.push(x.toFixed(0) + ',' + y.toFixed(0)); if (trailPts.length % 2 === 0) trail.setAttribute('points', trailPts.join(' '));
        if (t - lastStep > 260) { Snd.step(); lastStep = t; }
        if (p < 1) requestAnimationFrame(f); else { at = k; moving = false; walker.classList.remove('walk'); place(k); arrive(k); }
      })(t0);
    }
    const ARRIVE = { K: '这里没有脚印，也没有猫爪印……线索好像中断了！', P: '脚印淡得几乎看不见了，只剩下花瓣……', W: '请问，这里有什么发现吗？' };
    function arrive(k) {
      trail.setAttribute('points', trailPts.join(' '));
      $('.map-card', e).innerHTML = `<b>白奶奶到了「${N[k].n}」</b>${ARRIVE[k] || '请问，这里有什么发现吗？'}`; Snd.ding();
      if (k === 'W') { hole.classList.add('on'); }
    }
    function discover() {
      hole.classList.remove('on'); Snd.pop();
      Voice.say(CFG.grandma.map.lines[5], ui);
      const z = $('.map-zoom', e); z.style.transformOrigin = '1790px 235px'; z.classList.add('dive');
      setTimeout(() => { Snd.whoosh(); }, 1100);
      setTimeout(() => { go('reveal'); setTimeout(() => z.classList.remove('dive'), 800); }, 2600);
    }
    hole.onclick = discover; $('.rbtn', e).onclick = discover;
    const bar = $('.mapbar', e);
    CFG.grandma.map.lines.forEach((l, i) => { const b = el(`<button class="ln"><i>${i + 1}</i>${l.k}</button>`); b.title = l.t; b.onclick = () => Voice.say(l, ui); bar.appendChild(b); });
    def('map', { el: e, discover, leave() { Voice.stop(); },
      enter(prev) { if (prev === 'call2' || prev === 'deskPhone' || !trailPts.length) { at = 'G'; trailPts = []; trail.setAttribute('points', ''); place('G'); hole.classList.remove('on'); $('.map-card', e).innerHTML = '<b>请你们指引白奶奶</b>白奶奶在花园。她应该往哪里走？'; } },
      lineKey(n) { const l = CFG.grandma.map.lines[n - 1]; if (l) Voice.say(l, ui); } });
    place('G');
  })();

  /* ============================================================
     场景 8d：真相揭晓时刻（全屏视频）
     ============================================================ */
  (function () {
    const e = el(`<section id="s-reveal"><video playsinline preload="auto"></video><div class="rv-holder"></div><div class="rv-title">真相揭晓时刻</div><button class="skip">跳过 ▶</button></section>`);
    const v = $('video', e), holder = $('.rv-holder', e); let phTimer = null, usingPh = false;
    function finish() { clearTimeout(phTimer); if (state.cur === 'reveal') go('review'); }
    function placeholder() {
      if (usingPh) return; usingPh = true; v.style.display = 'none'; holder.innerHTML = Art.revealPlaceholder(); holder.classList.add('on');
      void holder.offsetWidth; holder.classList.add('run'); Snd.whoosh(); phTimer = setTimeout(finish, 12500);
    }
    v.addEventListener('error', placeholder); v.addEventListener('ended', finish);
    $('.skip', e).onclick = finish;
    def('reveal', { el: e,
      enter() {
        usingPh = false; holder.classList.remove('on', 'run'); holder.innerHTML = ''; v.style.display = '';
        v.src = CFG.revealVideo; v.currentTime = 0; v.muted = false;
        const p = v.play(); if (p && p.catch) p.catch((err) => { if (err && err.name !== 'NotAllowedError' && err.name !== 'AbortError') placeholder(); else { v.muted = true; v.play().catch(placeholder); } });
        clearTimeout(phTimer); phTimer = setTimeout(() => { if (!usingPh && (v.readyState < 2)) placeholder(); }, 2500);
      },
      leave() { v.pause(); clearTimeout(phTimer); holder.classList.remove('on', 'run'); },
      next() { finish(); return true; } });
  })();

  /* ============================================================
     场景 9：笔记本回顾 · 盖章 · 新案件警报
     ============================================================ */
  (function () {
    const e = el(`<section id="s-review"><div class="rv-desk"><img class="fill" src="desk.jpg" alt=""><div class="boardhost"></div></div>
      <div class="rv-nb"><img class="fill" src="notebook_blank.jpg" alt=""><div class="pg pgl"></div><div class="pg pgr"></div><div class="rv-pagen"></div>
        <button class="arr arr-l" aria-label="上一页"></button><button class="arr arr-r" aria-label="下一页"></button></div>
      <div class="alarm"><svg viewBox="0 0 420 380"><path d="M210 18 L400 350 H20z" fill="#ffd23f" stroke="#c0392b" stroke-width="22" stroke-linejoin="round"/><rect x="195" y="120" width="30" height="130" rx="15" fill="#c0392b"/><circle cx="210" cy="298" r="19" fill="#c0392b"/></svg><h2></h2><div class="acase"></div><button class="btn small al-close">收起 ✔</button></div><div class="confetti"></div></section>`);
    $('.boardhost', e).appendChild(makeBoard());
    const stampEl = el('<div class="stamp">破案<br>成功</div>'); $('.rv-nb', e).appendChild(stampEl);
    const L = $('.pgl', e), R = $('.pgr', e), nb = $('.rv-nb', e), pn = $('.rv-pagen', e);
    const NUM = '①②③④';
    const spreads = [];
    CFG.clues.forEach((c, i) => spreads.push({
      l: `<div class="polaroid"><div class="ph" style="${cropStyle(c.crop || c.cropA, 4 / 3)}"></div></div><h4>线索${NUM[i]}<br>${c.name}</h4>`,
      r: `<div class="solved">已解开 ✓</div><p class="note">${c.truth}</p>`
    }));
    const routeNames = ['花园', '走廊', '小卖部', '图书馆', '篮球场', '升旗台', '操场', '体育馆', '体育馆旁小路'];
    const mini = `<div class="mini"><div class="mini-map">${Art.map()}${Art.miniRoutes()}</div></div>`;
    spreads.push({ l: mini + '<h4>脚印和花瓣<br>留下的路线</h4>', r: `<div class="solved">已解开 ✓</div><p class="note"><b class="cb">红色</b>猫爪印：一路走到体育馆旁的小路和石墙。<br><b class="cbl">蓝色</b>雨靴印：在食堂中断了。</p>` });
    spreads.push({ l: `<div class="polaroid"><div class="ph cam-ph"><img class="truth-img" src="truth.jpg" alt="" onerror="this.outerHTML=window.Art.truth()"></div></div><h4>真相大白</h4>`, r: `<div class="solved">已解开 ✓</div><p class="note">是叔叔养的黑猫和橘猫，从石墙的小洞钻过来，偷吃了百日菊！</p>` });
    spreads.push({ l: `<div style="font-family:var(--display);font-size:54px;margin-top:70px;text-align:center;color:#4c6a86">恭喜你们！</div><div style="text-align:center;margin-top:30px;font-size:32px;line-height:1.35">小侦探们<br>成功破案啦！<br>你们会提问、会推理、<br>也会礼貌地交流。</div>`, r: `<div style="margin-top:318px;font-size:30px">了不起的小侦探！</div>`, stamp: true });
    let idx = 0;
    function render() {
      const s = spreads[idx]; L.innerHTML = s.l; R.innerHTML = s.r; pn.textContent = (idx + 1) + ' / ' + spreads.length;
      e.dataset.last = idx === spreads.length - 1 ? '1' : '0';
      stampEl.classList.remove('on'); stampEl.style.opacity = 0; $('.confetti', e).innerHTML = ''; if (s.stamp) setTimeout(() => { if (state.cur !== 'review' || idx !== spreads.length - 1) return; stampEl.style.opacity = ''; stampEl.classList.add('on'); Snd.stamp(); setTimeout(burst, 450); }, 800);
    }
    function burst() { const c = $('.confetti', e); for (let i = 0; i < 30; i++) c.appendChild(el(`<i class="petal" style="left:${Math.random() * 100}%;--d:${6 + Math.random() * 6}s;--dl:${-Math.random() * 3}s;--s:${16 + Math.random() * 18}px;--c:${['#f4a3b5', '#f7bd7c', '#d9b8ee', '#f8d7e0'][i % 4]}"></i>`)); }
    function forward() { if (idx < spreads.length - 1) { peel(nb, () => { idx++; render(); }); } else alarm(); }
    function backward() { if (idx > 0) peel(nb, () => { idx--; render(); }, 'back'); }
    const al = $('.alarm', e);
    function alarm() {
      if (al.classList.contains('on')) return; $('h2', al).textContent = CFG.newCase.title; $('.acase', al).textContent = CFG.newCase.text;
      al.classList.add('on'); Snd.alarm(3.4);
    }
    function closeAlarm() { if (!al.classList.contains('on')) return false; al.classList.remove('on'); return true; }
    $('.al-close', e).onclick = closeAlarm;
    $('.arr-r', e).onclick = forward; $('.arr-l', e).onclick = backward;
    function openNb() { e.classList.add('open'); Snd.page(); }
    $('.rv-desk', e).onclick = openNb;
    let openTimer = null;
    def('review', { el: e, close: closeAlarm, hasFloater: () => al.classList.contains('on'),
      enter() { idx = 0; e.classList.remove('open'); al.classList.remove('on'); render(); refreshBoards(); clearTimeout(openTimer); openTimer = setTimeout(openNb, 1800); },
      leave() { clearTimeout(openTimer); },
      next() { if (!e.classList.contains('open')) { openNb(); return true; } forward(); return true; }, prev() { if (e.classList.contains('open')) { backward(); return true; } return false; } });
  })();

  /* ============================================================
     工具栏、老师菜单、快捷键
     ============================================================ */
  const tool = el(`<div class="toolbar"><button data-a="music" title="背景音乐 (M)">🎵</button><button data-a="sfx" title="音效">🔊</button><button data-a="fs" title="全屏 (F)">⛶</button><button data-a="menu" title="老师菜单 (J)">🧭</button></div>`);
  stage.appendChild(tool);
  function syncTool() { const m = $('[data-a=music]', tool), s = $('[data-a=sfx]', tool); if (m) m.classList.toggle('off', !Snd.isMusic()); if (s) s.classList.toggle('off', !Snd.isSfx()); }
  const menu = el(`<div class="menu"><div class="menu-card"><h2>老师菜单</h2><div class="menu-list"></div><div class="menu-keys"><b>快捷键</b>　→ 下一步　← 上一步　J 菜单　F 全屏　M 音乐　空格 计时开始/暂停　＋ / − 加减 1 分钟　1–9 白奶奶台词　0 打开地图　H 隐藏台词按钮　R 真相揭晓（地图）　Esc 关闭弹窗</div><div class="menu-act"><button class="btn small" data-a="reset">重置全部进度</button><button class="btn small" data-a="close">关闭</button></div></div></div>`);
  stage.appendChild(menu);
  ORDER.forEach((id) => { const b = el(`<button class="btn small">${NAMES[id]}</button>`); b.onclick = () => { menu.classList.remove('on'); Snd.init(); go(id); }; $('.menu-list', menu).appendChild(b); });
  $('[data-a=close]', menu).onclick = () => menu.classList.remove('on');
  $('[data-a=reset]', menu).onclick = () => { state.found.clear(); state.boardAll = false; state.callShown = false; state.cctvSeen.clear(); $$('.hslot').forEach((s) => { s.classList.remove('on'); const p = $('.ph', s); if (p) p.remove(); }); refreshBoards(); menu.classList.remove('on'); go('start'); };
  tool.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return; Snd.init();
    const a = b.dataset.a;
    if (a === 'music') toggleMusic(); else if (a === 'sfx') { Snd.setSfx(!Snd.isSfx()); syncTool(); } else if (a === 'fs') toggleFS(); else if (a === 'menu') menu.classList.toggle('on');
  });
  function toggleFS() { const d = document.documentElement; if (!document.fullscreenElement) { (d.requestFullscreen || d.webkitRequestFullscreen || function () { }).call(d); } else document.exitFullscreen && document.exitFullscreen(); }
  function closeFloaters() { menu.classList.remove('on'); }
  function closeTop() {
    if (menu.classList.contains('on')) { menu.classList.remove('on'); return; }
    const sc = SC[state.cur]; if (sc && sc.close && sc.close()) return;
    const base = SC[state.base]; if (base && base !== sc && base.close) base.close();
  }
  addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (k === 'j' || k === 'J') { menu.classList.toggle('on'); }
    else if (k === 'f' || k === 'F') toggleFS();
    else if (k === 'm' || k === 'M') toggleMusic();
    else if (k === 'h' || k === 'H') document.body.classList.toggle('bars-hidden');
    else if (k === 'ArrowRight') { ev.preventDefault(); Snd.init(); if (state.cur === 'scene' && SC.scene.hasFloater()) return; next(); }
    else if (k === 'ArrowLeft') { ev.preventDefault(); prev(); }
    else if (k === ' ') { ev.preventDefault(); if (activeTimer && (state.base === 'group' || state.base === 'meeting')) activeTimer.toggle(); }
    else if (k === '+' || k === '=') { if (activeTimer && (state.base === 'group' || state.base === 'meeting')) activeTimer.add(60); }
    else if (k === '-' || k === '_') { if (activeTimer && (state.base === 'group' || state.base === 'meeting')) activeTimer.add(-60); }
    else if (k === 'Escape') closeTop();
    else if (k === 'Enter') { if (state.cur === 'call1' || state.cur === 'call2') Call.accept(); }
    else if (k === 'r' || k === 'R') { if (state.cur === 'map') SC.map.discover(); }
    else if (/^[0-9]$/.test(k)) {
      const n = +k;
      if (state.cur === 'call1' || state.cur === 'call2') { if (n === 0 && state.cur === 'call2') Call.openMap(); else if (n > 0) Call.say(n - 1); }
      else if (state.cur === 'map' && n > 0) SC.map.lineKey(n);
    }
  });
  addEventListener('pointerdown', () => Snd.init(), { once: true });

  syncTool();
  go('start');
  window.__app = { go, state, SC };
})();
