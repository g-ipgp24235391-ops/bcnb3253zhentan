(function () {
  'use strict';
  const CFG = window.CFG, Art = window.Art, Snd = window.Snd;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const stage = $('#stage');
  const IW = 1367, IH = 768;
  const state = { cur: null, base: null, found: new Set(), popped: new Set(), boardLevel: 0, timer: null, musicManual: null };
  const scenes = {};
  const NUM = ['①', '②', '③', '④'];
  const ORDER = [
    ['start', '1 开始页'], ['desk', '2 书桌'], ['notebook', '3 案件前情'], ['scene', '4 现场搜证'],
    ['call1', '5 白奶奶来电'], ['group', '6 小组讨论·监控'], ['meeting', '7 推理会议'], ['deskPhone', '8 回到书桌·手机'],
    ['call2', '8 视频汇报'], ['map', '8 校园地图'], ['reveal', '8 真相揭晓'], ['review', '9 笔记本回顾']
  ];

  /* ---------- 小工具 ---------- */
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function crop(c, ar) {
    const w = c.w, hh = w / ar;
    const x0 = Math.min(Math.max(c.cx - w / 2, 0), IW - w), y0 = Math.min(Math.max(c.cy - hh / 2, 0), IH - hh);
    return `background-image:url(assets/img/scene.jpg);background-size:${IW / w * 100}% auto;background-position:${x0 / (IW - w) * 100}% ${y0 / (IH - hh) * 100}%`;
  }
  function addScene(id, cls, html) {
    const el = document.createElement('section');
    el.className = 'scene ' + (cls || ''); el.id = 's-' + id; if (html) el.innerHTML = html;
    stage.appendChild(el); return el;
  }
  function camFrame(idx) {
    const id = CFG.cams[idx].id;
    if (id === 'garden') return `<div style="width:100%;height:100%;${crop({ cx: 600, cy: 400, w: 980 }, 4 / 3)}"></div>`;
    return Art.cam(id);
  }
  function peel(host, rect, mid) {
    const p = document.createElement('div'); p.className = 'peel';
    Object.assign(p.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', transform: 'rotateY(0deg)', transition: 'transform .8s ease-in-out,opacity .3s' });
    host.style.perspective = '2600px'; host.appendChild(p);
    Snd.sfx.page();
    requestAnimationFrame(() => requestAnimationFrame(() => { p.style.transform = 'rotateY(-176deg)'; }));
    setTimeout(mid, 380); setTimeout(() => { p.style.opacity = 0; }, 760); setTimeout(() => p.remove(), 1100);
  }
  function holdBtn(el, ms, cb) {
    const bar = el.querySelector('.fillbar'); let t0 = 0, raf = 0, down = false;
    const loop = () => { if (!down) return; const p = Math.min(1, (performance.now() - t0) / ms); bar.style.width = p * 100 + '%'; if (p >= 1) { down = false; bar.style.width = '0'; cb(); return; } raf = requestAnimationFrame(loop); };
    el.addEventListener('pointerdown', e => { e.preventDefault(); Snd.init(); down = true; t0 = performance.now(); loop(); });
    const up = () => { down = false; cancelAnimationFrame(raf); bar.style.width = '0'; };
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, up));
  }
  function petalsLayer(n, host) {
    const cols = ['#ee86a0', '#f5a964', '#f6c1d0', '#c9a7e0'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div'); p.className = 'petal';
      const s = 20 + Math.random() * 22;
      p.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s * .6}px;background:${cols[i % 4]};border-radius:60% 40% 60% 40%;opacity:.85;--dx:${(Math.random() - .5) * 300}px;animation-duration:${9 + Math.random() * 9}s;animation-delay:${-Math.random() * 14}s`;
      host.appendChild(p);
    }
  }

  /* ---------- 白奶奶：朗读与表情 ---------- */
  const Voice = {
    voice: null, cur: null,
    init() {
      if (!('speechSynthesis' in window)) return;
      const pick = () => {
        const vs = speechSynthesis.getVoices();
        this.voice = vs.find(v => /zh[-_]CN/i.test(v.lang) && /Xiaoxiao|Xiaoyi|Yunxi|Huihui|Yaoyao|Tingting|Meijia|Google/i.test(v.name)) || vs.find(v => /zh[-_]CN|cmn/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null;
      };
      pick(); speechSynthesis.onvoiceschanged = pick;
    },
    cancel() { try { speechSynthesis.cancel(); } catch (e) {} if (this.cur) { try { this.cur.pause(); } catch (e) {} this.cur = null; } },
    speak(line, onend) {
      this.cancel();
      let done = false; const fin = () => { if (!done) { done = true; clearTimeout(tm); onend && onend(); } };
      const tm = setTimeout(fin, line.t.length * 420 + 2500);
      const tts = () => {
        if (!('speechSynthesis' in window)) return;
        const u = new SpeechSynthesisUtterance(line.t); u.lang = 'zh-CN'; if (this.voice) u.voice = this.voice;
        u.rate = .88; u.pitch = 1.0; u.onend = fin; u.onerror = fin; speechSynthesis.speak(u);
      };
      if (line.audio) { const a = new Audio(line.audio); this.cur = a; a.onended = fin; a.onerror = tts; a.play().catch(tts); } else tts();
    }
  };
  const EMO = { happy: '♪', puzzled: '？', surprised: '！', thanks: '♥' };
  function sayIn(ui, line) {
    clearTimeout(ui.subT);
    ui.sub.textContent = line.t; ui.sub.classList.add('on');
    const e = line.e || 'happy';
    ui.react.textContent = EMO[e] || '♪'; ui.react.classList.add('on');
    ui.react.style.color = e === 'puzzled' ? '#4c6a86' : e === 'surprised' ? '#e5604b' : e === 'thanks' ? '#e9718a' : '#7fa86a';
    ui.img.className = 'gimg ' + (e === 'puzzled' || e === 'surprised' ? e : 'talk');
    Snd.sfx.click();
    Voice.speak(line, () => {
      ui.img.className = 'gimg idle'; ui.react.classList.remove('on');
      ui.subT = setTimeout(() => ui.sub.classList.remove('on'), 5000);
    });
  }
  function stopSay(ui) { Voice.cancel(); if (ui) { ui.sub.classList.remove('on'); ui.react.classList.remove('on'); ui.img.className = 'gimg idle'; } }

  /* ---------- 计时器 ---------- */
  function makeTimer(host, secs, left) {
    const C = 2 * Math.PI * 42;
    const el = h(`<div class="timer"><svg class="ringsvg" viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="42"/><circle class="fgc" cx="50" cy="50" r="42" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><div class="tm">00:00</div><div class="tcs"><div class="row"><button data-a="toggle">▶ 开始</button><button data-a="reset">↺</button></div><div class="row"><button data-a="minus">−1分</button><button data-a="plus">＋1分</button></div></div></div>`);
    const end = h('<div class="bubbleEnd">时间到啦！</div>');
    if (left) el.classList.add('tleft');
    host.appendChild(el); host.appendChild(end);
    const tm = $('.tm', el), fg = $('.fgc', el), tg = $('[data-a=toggle]', el);
    let total = secs, remain = secs, running = false, last = 0, iv = null;
    function render() {
      const r = Math.ceil(remain), m = Math.floor(r / 60), s = r % 60;
      tm.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      fg.style.strokeDashoffset = C * (1 - Math.max(0, remain) / total);
      el.classList.toggle('warn', remain > 0 && remain <= 60); el.classList.toggle('end', remain <= 0);
      tg.textContent = running ? '⏸ 暂停' : (remain <= 0 ? '▶ 重来' : '▶ 开始');
    }
    function tick() {
      if (!running) return; const n = performance.now(); remain -= (n - last) / 1000; last = n;
      if (remain <= 0) { remain = 0; running = false; clearInterval(iv); Snd.sfx.timeup(); end.classList.add('on'); setTimeout(() => end.classList.remove('on'), 6000); }
      render();
    }
    const api = {
      toggle() { Snd.init(); if (remain <= 0) { remain = total; } running = !running; last = performance.now(); clearInterval(iv); if (running) iv = setInterval(tick, 200); end.classList.remove('on'); render(); },
      plus() { remain += 60; total = Math.max(total, remain); render(); },
      minus() { remain = Math.max(0, remain - 60); render(); },
      reset() { running = false; clearInterval(iv); remain = total = secs; end.classList.remove('on'); render(); },
      stop() { running = false; clearInterval(iv); }
    };
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; Snd.sfx.click(); api[b.dataset.a](); });
    render(); return api;
  }
  function timerKey(e) {
    const t = state.timer; if (!t) return false;
    if (e.key === ' ') { t.toggle(); return true; }
    if (e.key === '+' || e.key === '=') { t.plus(); return true; }
    if (e.key === '-' || e.key === '_') { t.minus(); return true; }
    return false;
  }

  /* ---------- 布告栏（书桌场景上的卡片） ---------- */
  const SLOTS = [[535, 40, 140, 120, -2], [743, 77, 137, 123, 0], [982, 38, 128, 135, 1], [1150, 73, 130, 120, 0], [545, 197, 153, 121, -4], [882, 222, 136, 103, 0], [1108, 230, 132, 102, 0]];
  function renderBoard(layer) {
    layer.innerHTML = '';
    SLOTS.forEach((s, i) => {
      let content = null, key = 's' + i;
      if (i < 4) { const c = CFG.clues[i]; if (state.found.has(c.id)) content = `<div class="ph" style="${crop(c.crop || c.cropA, s[2] * .84 / (s[3] * .84))}"></div>`; }
      else if (state.boardLevel >= 7) content = `<div class="ph">${camFrame(CFG.boardCams[i - 4])}</div>`;
      if (!content) return;
      const d = document.createElement('div'); d.className = 'pcard' + (state.popped.has(key) ? '' : ' pop');
      state.popped.add(key);
      d.style.cssText = `left:${s[0] / 1680 * 100}%;top:${s[1] / 944 * 100}%;width:${s[2] / 1680 * 100}%;height:${s[3] / 944 * 100}%;transform:rotate(${s[4]}deg)`;
      d.innerHTML = content + '<i class="pin"></i>'; layer.appendChild(d);
    });
  }
  function deskScene(id, extraHTML, opts) {
    opts = opts || {};
    const el = addScene(id, '', `<img class="bg" src="assets/img/desk.jpg" alt=""><div class="board-layer"></div>${extraHTML || ''}`);
    return el;
  }

  /* ---------- 场景切换 ---------- */
  function go(id) {
    const S = scenes[id]; if (!S || state.cur === id) return;
    if (S.overlay && state.base !== S.base) go(S.base);
    const prev = state.cur;
    if (prev && scenes[prev] && scenes[prev].leave) scenes[prev].leave(id);
    Object.entries(scenes).forEach(([k, s]) => {
      if (k === id) return;
      if (S.overlay) { if (s.overlay) s.el.classList.remove('on'); } else s.el.classList.remove('on');
    });
    if (!S.overlay) state.base = id;
    S.el.classList.add('on'); state.cur = id; state.timer = null; state.musicManual = null;
    updateMusic();
    $$('#toolbar button')[0] && $$('#toolbar button')[0].classList.toggle('off', !Snd.music.playing());
    S.enter && S.enter(prev);
  }
  function updateMusic() {
    const S = scenes[state.cur];
    if (S && S.music) Snd.music.on(); else Snd.music.off();
    syncTools();
  }
  const ids = ORDER.map(o => o[0]);
  function next() { const i = ids.indexOf(state.cur); if (i < ids.length - 1) go(ids[i + 1]); }
  function prevScene() { const i = ids.indexOf(state.cur); if (i > 0) go(ids[i - 1]); }

  /* ======================= 1 开始页 ======================= */
  (function () {
    const el = addScene('start', '', `<img class="back" src="assets/img/cover.jpg" alt=""><div class="cover"><img src="assets/img/cover.jpg" alt="《雨后的线索：校园小侦探》"><button id="startHit" aria-label="开始调查"></button></div><div id="startTip">老师小提示：按 <b>F</b> 全屏　按 <b>J</b> 打开跳转菜单　→ ← 切换环节</div>`);
    petalsLayer(16, el);
    $('#startHit', el).addEventListener('click', () => { Snd.init(); Voice.init(); Snd.sfx.click(); Snd.sfx.sparkle(); go('desk'); });
    scenes.start = { el, key(e) { if (e.key === 'Enter' || e.key === ' ') { $('#startHit').click(); return true; } } };
  })();

  /* ======================= 2 书桌 ======================= */
  (function () {
    const el = deskScene('desk', `<div class="hit glow" id="nbHit" style="left:31.2%;top:44%;width:36.3%;height:49%"></div><div class="label-tag" style="left:790px;top:560px;font-size:44px">点一点，翻开侦探笔记 📖</div>`);
    const layer = $('.board-layer', el);
    $('#nbHit').addEventListener('click', () => { Snd.sfx.page(); go('notebook'); });
    scenes.desk = { el, enter() { renderBoard(layer); } };
  })();

  /* ======================= 3 笔记本·案件前情 ======================= */
  (function () {
    const el = addScene('notebook', '', `<img class="bg" src="assets/img/notebook.jpg" alt="">
      <div class="nb-arrow" id="nbL" style="left:32px;top:972px"></div><div class="nb-arrow pulse" id="nbR" style="left:1790px;top:972px"></div>
      <div class="label-tag" id="nbTip" style="left:1380px;top:890px">翻到下一页 ➜</div>
      <div class="p2" style="display:none"><div style="position:absolute;left:1002px;top:420px;width:344px;height:340px;background:linear-gradient(90deg,#faf2de,#fbf4e2);border-radius:8px"></div>
      <div class="page2"><h3>出发！</h3><p>先去现场看看，<br>找出线索吧。</p><button class="btn go pulse" id="goScene" style="font-size:34px;padding:16px 26px">前往现场 🔍</button></div></div>`);
    let page = 0;
    const p2 = $('.p2', el), tip = $('#nbTip', el);
    function turn() {
      if (page === 1) return; page = 1;
      peel(el, { left: 977, top: 337, width: 418, height: 633 }, () => { p2.style.display = 'block'; tip.style.display = 'none'; });
    }
    function back() { if (page === 0) { go('desk'); return; } page = 0; Snd.sfx.page(); p2.style.display = 'none'; tip.style.display = ''; }
    $('#nbR', el).addEventListener('click', turn); $('#nbL', el).addEventListener('click', back);
    $('#goScene', el).addEventListener('click', () => { Snd.sfx.whoosh(); go('scene'); });
    scenes.notebook = { el, enter() { page = 0; p2.style.display = 'none'; tip.style.display = ''; },
      key(e) { if (e.key === 'ArrowRight') { if (page === 0) turn(); else go('scene'); return true; } if (e.key === 'ArrowLeft') { back(); return true; } } };
  })();

  /* ======================= 4 现场搜证 ======================= */
  (function () {
    const sx = 1920 / IW, sy = 1080 / IH;
    const hots = CFG.clues.map((c, i) => { const r = c.hot.r * sx; return `<div class="hot" data-i="${i}" style="left:${c.hot.x * sx - r}px;top:${c.hot.y * sy - r}px;width:${r * 2}px;height:${r * 2}px"><span class="ok">✔</span></div>`; }).join('');
    const el = addScene('scene', '', `<img class="bg" src="assets/img/scene.jpg" alt="">${hots}
      <div class="hud"><span>线索</span><span id="hudN">0 / 4</span>${CFG.clues.map(() => '<div class="slot"></div>').join('')}</div>
      <button class="btn sm hintBtn" id="hintBtn">💡 提示</button>
      <div class="detail" id="detail"><div class="dcard"><div class="tape"></div><h2></h2><div class="dmedia"></div><div class="q"></div><button class="btn go dclose">收好线索 ✔</button></div></div>`);
    el.style.cursor = Art.cursorMagnifier();
    const det = $('#detail', el), slots = $$('.hud .slot', el);
    function updateHud() {
      $('#hudN', el).textContent = state.found.size + ' / 4';
      CFG.clues.forEach((c, i) => { const f = state.found.has(c.id); slots[i].className = 'slot' + (f ? ' full' : ''); slots[i].style.cssText = f ? crop(c.crop || c.cropA, 84 / 68) : ''; $$('.hot', el)[i].classList.toggle('done', f); });
    }
    function open(i) {
      const c = CFG.clues[i], d = $('.dmedia', det);
      $('h2', det).textContent = `线索${NUM[i]}　${c.name}`;
      if (c.id === 'hair') d.innerHTML = `<div class="lens" style="${crop(c.crop, 1)}">${Art.hairOverlay()}</div>`;
      else if (c.id === 'prints') d.innerHTML = `<div class="dpic sm" style="${crop(c.cropA, 4 / 3)}"><div class="cap">脚印 A</div></div><div class="vs">VS</div><div class="dpic sm" style="${crop(c.cropB, 4 / 3)}"><div class="cap">脚印 B</div></div>`;
      else if (c.id === 'dew') d.innerHTML = `<div class="dpic" style="${crop(c.crop, 4 / 3)}">${Art.dropOverlay()}</div>`;
      else d.innerHTML = `<div class="dpic" style="${crop(c.crop, 4 / 3)}"></div>`;
      $('.q', det).innerHTML = '<div style="font-size:34px;color:#8a6a4e;font-family:var(--disp)">想一想，问一问：</div>' + c.ask.map(a => `<span>${a}</span>`).join('');
      const isNew = !state.found.has(c.id);
      state.found.add(c.id); det.classList.add('on'); Snd.sfx.ding(); if (isNew) setTimeout(Snd.sfx.pin, 400);
      updateHud(); const sl = slots[i]; sl.classList.add('pop');
    }
    function close() {
      if (!det.classList.contains('on')) return; det.classList.remove('on'); Snd.sfx.click();
      if (state.found.size >= CFG.clues.length) setTimeout(() => { if (state.cur === 'scene') go('call1'); }, 700);
    }
    $$('.hot', el).forEach(hh => hh.addEventListener('click', () => open(+hh.dataset.i)));
    $('.dclose', det).addEventListener('click', close);
    det.addEventListener('click', e => { if (e.target === det) close(); });
    $('#hintBtn', el).addEventListener('click', () => { $$('.hot', el).forEach(x => { if (!x.classList.contains('done')) x.classList.add('hint'); }); setTimeout(() => $$('.hot', el).forEach(x => x.classList.remove('hint')), 2600); Snd.sfx.sparkle(); });
    scenes.scene = { el, enter() { updateHud(); },
      key(e) { if (e.key === 'Escape' && det.classList.contains('on')) { close(); return true; } if (e.key === 'Enter' && det.classList.contains('on')) { close(); return true; } if (e.key === 'h' || e.key === 'H') { $('#hintBtn', el).click(); return true; } } };
  })();

  /* ======================= 白奶奶通话 ======================= */
  function makeCall(key, base, outgoing) {
    const conf = CFG.grandma[key];
    const el = addScene(key, 'overlay', `<div class="callwin"><div class="cw-top"><div class="rec"><i></i><span>白奶奶　视频通话</span></div><div class="ctime">00:00</div></div>
      <div class="cw-body"><div class="sub"></div><img class="gimg ring" src="assets/img/grandma.png" alt="白奶奶"><div class="react" style="right:140px;top:200px"></div>
      <div class="ringbox"><div class="rtxt">${conf.ring}</div><div class="callbtns"><button class="cbtn acc" title="接听">📞</button></div></div></div></div>
      <div class="ctrlHint">数字键 1–9 播放台词　H 隐藏/显示按钮</div><div class="ctrl" style="display:none"></div>`);
    const ui = { sub: $('.sub', el), img: $('.gimg', el), react: $('.react', el) };
    const ctrl = $('.ctrl', el), hint = $('.ctrlHint', el), rb = $('.ringbox', el), ct = $('.ctime', el);
    let live = false, t0 = 0, iv = null, autoT = null;
    const lines = conf.lines;
    ctrl.innerHTML = lines.map((l, i) => `<div class="lb" data-i="${i}"><b>${i + 1}</b>${l.k}</div>`).join('') +
      (key === 'call1' ? '<div class="lb hang" data-act="hang"><b>0</b>📵 挂断</div>' : '<div class="lb act" data-act="map"><b>0</b>🗺 打开校园地图</div>');
    function connect() {
      if (live) return; live = true; Snd.sfx.ringStop(); Snd.sfx.click();
      rb.style.display = 'none'; ui.img.className = 'gimg idle'; ctrl.style.display = 'flex'; t0 = Date.now();
      iv = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); ct.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 500);
      setTimeout(() => live && sayIn(ui, conf.intro), 700);
    }
    function finish() {
      stopSay(ui); Snd.sfx.hang();
      if (key === 'call1') { state.boardLevel = Math.max(state.boardLevel, 4); go('group'); } else { go('map'); }
    }
    function act(a) { if (a === 'hang' || a === 'map') finish(); }
    $('.cbtn', el).addEventListener('click', connect);
    ctrl.addEventListener('click', e => { const b = e.target.closest('.lb'); if (!b) return; if (b.dataset.act) act(b.dataset.act); else sayIn(ui, lines[+b.dataset.i]); });
    scenes[key] = { el, overlay: true, base,
      enter() {
        live = false; ct.textContent = '00:00'; rb.style.display = ''; ctrl.style.display = 'none'; ui.sub.classList.remove('on');
        ui.img.className = 'gimg ring'; Snd.sfx.ringStart(outgoing);
        clearTimeout(autoT); if (outgoing) autoT = setTimeout(() => { if (state.cur === key) connect(); }, 3400);
      },
      leave() { clearTimeout(autoT); clearInterval(iv); live = false; Snd.sfx.ringStop(); stopSay(ui); },
      key(e) {
        if (!live && (e.key === 'Enter' || e.key === ' ')) { connect(); return true; }
        if (e.key === 'h' || e.key === 'H') { ctrl.classList.toggle('hide'); hint.style.display = ctrl.classList.contains('hide') ? 'none' : ''; return true; }
        if (!live) return false;
        if (/^[1-9]$/.test(e.key) && lines[+e.key - 1]) { sayIn(ui, lines[+e.key - 1]); return true; }
        if (e.key === '0') { act(key === 'call1' ? 'hang' : 'map'); return true; }
        if (e.key === 'ArrowRight') { act(key === 'call1' ? 'hang' : 'map'); return true; }
        return false;
      }
    };
  }
  makeCall('call1', 'scene', false);

  /* ======================= 6 小组讨论 + 监控 ======================= */
  (function () {
    const el = deskScene('group', `<div class="compHit glow" id="compHit">${Art.computer()}</div><div class="label-tag" style="left:1260px;top:440px">点开电脑，查看校园监控 📺</div>
      <div class="ribbon" style="left:30px;top:150px;font-size:38px;padding:8px 40px">小组讨论</div>
      <button class="btn hold" id="holdEnd"><div class="fillbar"></div><span>长按　结束讨论 ▶</span></button>
      <div class="cctv" id="cctv"><div class="monitor"><div class="screen"><div class="grid"></div><div class="big"><div class="fr"></div><div class="hudc"></div><div class="tipz">点一下画面可以放大，再点一下恢复</div><button class="btn sm back">↩ 返回监控墙</button></div></div>
      <div class="mbar"><div style="display:flex;gap:14px;align-items:center"><span class="led"></span><span class="nm">校园监控</span></div><div class="ctm" id="ctm">08:00</div><button class="btn sm stop" id="cctvClose">关闭监控 ✖</button></div></div></div>`);
    const layer = $('.board-layer', el), cctv = $('#cctv', el), grid = $('.grid', el), big = $('.big', el), fr = $('.big .fr', el);
    const timerHost = document.createElement('div'); el.appendChild(timerHost);
    let tm = null, zoomed = false;
    CFG.gridOrder.forEach((camIdx, pos) => {
      const c = CFG.cams[camIdx], no = String(pos + 1).padStart(2, '0');
      const cell = h(`<div class="cell" data-i="${camIdx}" data-pos="${no}"><div class="fr">${camFrame(camIdx)}</div><div class="tint"></div><div class="hudc"><span>CAM ${no}</span><span>${c.time}</span></div><div class="rec2"><i></i>REC</div></div>`);
      cell.addEventListener('click', () => openBig(camIdx, no)); grid.appendChild(cell);
    });
    function openBig(camIdx, no) {
      Snd.sfx.stat(); zoomed = false; fr.style.transform = ''; fr.style.cursor = 'zoom-in';
      fr.innerHTML = camFrame(camIdx); $('.hudc', big).innerHTML = `<span>CAM ${no}</span><span>${CFG.cams[camIdx].time}</span>`; big.classList.add('on');
    }
    function closeBig() { big.classList.remove('on'); Snd.sfx.click(); }
    function setOrigin(e) { const r = big.getBoundingClientRect(); fr.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`; }
    fr.addEventListener('click', e => { zoomed = !zoomed; if (zoomed) { setOrigin(e); fr.style.transform = 'scale(2.3)'; fr.style.cursor = 'zoom-out'; } else { fr.style.transform = ''; fr.style.cursor = 'zoom-in'; } Snd.sfx.click(); });
    fr.addEventListener('mousemove', e => { if (zoomed) setOrigin(e); });
    $('.big .back', el).addEventListener('click', closeBig);
    let ctmIv = null;
    function openCCTV() { cctv.classList.add('on'); Snd.sfx.stat(); clearInterval(ctmIv); ctmIv = setInterval(() => { const t = $('.tm', timerHost); if (t) $('#ctm', el).textContent = t.textContent; }, 300); }
    function closeCCTV() { big.classList.remove('on'); cctv.classList.remove('on'); clearInterval(ctmIv); Snd.sfx.click(); }
    $('#compHit', el).addEventListener('click', openCCTV); $('#cctvClose', el).addEventListener('click', closeCCTV);
    holdBtn($('#holdEnd', el), 900, () => { Snd.sfx.click(); go('meeting'); });
    scenes.group = { el, music: true,
      enter() { state.boardLevel = Math.max(state.boardLevel, 4); renderBoard(layer); if (!tm) tm = makeTimer(timerHost, CFG.timers.group, true); state.timer = tm; cctv.classList.remove('on'); big.classList.remove('on'); },
      leave() { state.boardLevel = 7; },
      key(e) { if (e.key === 'Escape') { if (big.classList.contains('on')) closeBig(); else closeCCTV(); return true; } return timerKey(e); } };
  })();

  /* ======================= 7 推理会议 ======================= */
  (function () {
    const el = addScene('meeting', '', `<img class="room" src="assets/img/desk.jpg" alt="">
      <div class="ribbon" style="left:50px;top:36px;font-size:40px;padding:10px 40px">推理会议</div>
      <div class="cork"><svg class="str" viewBox="0 0 1246 756"></svg></div>
      <div class="scrollSpr" id="scrSpr" title="点开语言支架">${Art.scrollSprite()}</div><div class="label-tag" style="left:1470px;top:770px;font-size:30px">点开卷轴　语言支架</div>
      <div class="scrollPanel" id="scrPanel"><button class="scClose">✕</button><h3>语言支架</h3></div>
      <button class="btn go" id="meetEnd" style="position:absolute;left:50px;bottom:22px;z-index:40;font-size:32px;padding:14px 30px">结束推理会议 ▶</button>
      <div class="lightbox" id="lbx"><div class="lc"><div class="lp"></div><div class="lt"></div></div></div>`);
    const cork = $('.cork', el), svg = $('svg.str', el), timerHost = document.createElement('div'); el.appendChild(timerHost);
    const items = [];
    CFG.clues.forEach((c, i) => items.push({ t: `线索${NUM[i]}　${c.short}`, ph: (ar) => `<div class="ph" style="${crop(c.crop || c.cropA, ar)}"></div>`, big: `<div class="lp" style="${crop(c.crop || c.cropA, 4 / 3)}"></div>` }));
    CFG.boardCams.forEach((ci, i) => items.push({ t: `监控 ${CFG.cams[ci].time}`, ph: () => `<div class="ph">${camFrame(ci)}</div>`, big: `<div class="lp">${camFrame(ci)}</div>` }));
    const pos = [[34, 56, -2], [344, 40, 1.5], [654, 62, -1], [964, 46, 2], [190, 420, 1.5], [510, 436, -2], [830, 416, 1]];
    const pins = ['#ee86a0', '#7fa8d6', '#f0c75a', '#9ccb92', '#b79ad6', '#ee86a0', '#f0a05a'];
    const pts = pos.map(p => [p[0] + 145, p[1] + 2]);
    const order = [0, 1, 2, 3, 6, 5, 4, 0, 2, 5];
    let d = ''; order.forEach((k, i) => { const p = pts[k]; if (i === 0) d += `M${p[0]} ${p[1]}`; else { const q = pts[order[i - 1]]; d += ` Q${(p[0] + q[0]) / 2} ${Math.max(p[1], q[1]) + 70} ${p[0]} ${p[1]}`; } });
    svg.innerHTML = `<path d="${d}" fill="none" stroke="#d6493b" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;
    items.forEach((it, i) => {
      const c = h(`<div class="mcard" style="left:${pos[i][0]}px;top:${pos[i][1]}px;transform:rotate(${pos[i][2]}deg);--pc:${pins[i]}"><i class="pin"></i>${it.ph(4 / 3)}<div class="cp">${it.t}</div></div>`);
      c.style.transform = `rotate(${pos[i][2]}deg)`; c.dataset.r = pos[i][2];
      c.addEventListener('click', () => { const lb = $('#lbx', el); $('.lc', lb).innerHTML = it.big + `<div class="lt">${it.t}</div>`; lb.classList.add('on'); Snd.sfx.click(); });
      cork.appendChild(c);
    });
    $('#lbx', el).addEventListener('click', () => $('#lbx', el).classList.remove('on'));
    const cats = [['提出问题', '#cfe2f2', ['请问……？', '为什么……？', '这些线索说明了什么？']], ['表达推测', '#d5ebc4', ['我认为……，因为……']], ['表示同意', '#fbe7a6', ['我同意你的看法，因为……']], ['补充意见', '#f9d2a8', ['我想补充一点……']], ['提出质疑', '#f6c5cc', ['可是，我想知道……', '如果……，为什么……？']], ['礼貌回应', '#dccaf0', ['谢谢你的意见。', '不好意思，我有不同的看法。']]];
    const panel = $('#scrPanel', el);
    cats.forEach(c => { panel.appendChild(h(`<div class="cat" style="background:${c[1]}"><div class="ct">${c[0]}</div><div class="cs">${c[2].join('<br>')}</div></div>`)); });
    panel.addEventListener('click', e => {
      const cat = e.target.closest('.cat');
      if (e.target.closest('.scClose')) { panel.classList.remove('on'); $('#scrSpr', el).style.display = ''; Snd.sfx.page(); return; }
      if (!cat) return; const was = cat.classList.contains('sp'); $$('.cat', panel).forEach(x => x.classList.remove('sp'));
      if (!was) { cat.classList.add('sp'); panel.classList.add('spot'); } else panel.classList.remove('spot'); Snd.sfx.click();
    });
    $('#scrSpr', el).addEventListener('click', () => { Snd.sfx.page(); panel.classList.add('on'); $('#scrSpr', el).style.display = 'none'; });
    $('#meetEnd', el).addEventListener('click', () => { Snd.sfx.click(); go('deskPhone'); });
    let tm = null;
    scenes.meeting = { el, music: true,
      enter() { if (!tm) tm = makeTimer(timerHost, CFG.timers.meeting); state.timer = tm; panel.classList.remove('on'); $('#scrSpr', el).style.display = ''; },
      key(e) { if (e.key === 'Escape') { $('#lbx', el).classList.remove('on'); panel.classList.remove('on'); $('#scrSpr', el).style.display = ''; return true; } return timerKey(e); } };
  })();

  /* ======================= 8 回到书桌·手机 ======================= */
  (function () {
    const el = deskScene('deskPhone', `<div class="compHit glow" id="phHit" style="left:1290px;top:560px;width:230px;height:390px;transform:rotate(-8deg)">${Art.phone()}</div><div class="label-tag" style="left:1180px;top:480px">点手机，拨给白奶奶 📞</div>`);
    const layer = $('.board-layer', el);
    $('#phHit', el).addEventListener('click', () => { Snd.sfx.click(); go('call2'); });
    scenes.deskPhone = { el, enter() { state.boardLevel = 7; renderBoard(layer); } };
  })();
  makeCall('call2', 'deskPhone', true);

  /* ======================= 校园地图 ======================= */
  (function () {
    const MAP = Art.MAP, N = MAP.nodes;
    const el = addScene('map', '', `<div class="mapsvg" id="mapsvg">${Art.mapSVG()}<svg id="trail" viewBox="0 0 1920 1080" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><polyline fill="none" stroke="#e5604b" stroke-width="9" stroke-dasharray="4 18" stroke-linecap="round" points=""/></svg></div>
      <div class="mapTip">请告诉白奶奶：从花园出发，该往哪里走？</div>
      <div class="pip"><div class="sub"></div><div style="position:relative;width:230px;height:230px;flex:none;border:6px solid var(--ink);border-radius:30px 70px 30px 70px;background:radial-gradient(circle,#fff6dc,#efd9a8);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4)"><img class="gimg idle" src="assets/img/grandma.png" style="width:290px;bottom:-12px" alt=""><div class="react" style="right:10px;top:0;font-size:56px"></div></div></div>
      <div class="hole" id="hole" style="left:1800px;top:200px"></div><div class="holeBtn" id="holeBtn" style="left:1500px;top:290px">🔍 发现小洞口！点一点</div>
      <div class="ctrl" style="bottom:20px"></div>`);
    const mapEl = $('#mapsvg', el);
    Object.entries(N).forEach(([k, n]) => {
      if (!n.n) return;
      const nd = h(`<div class="node" data-k="${k}" style="left:${n.x}px;top:${n.y}px"></div>`); mapEl.appendChild(nd);
      mapEl.appendChild(h(`<div class="nlabel" style="left:${n.x}px;top:${n.y + 34}px">${n.n}</div>`));
    });
    const gm = h(`<div class="gmark"><div class="face"><img src="assets/img/grandma.png" alt=""></div></div>`); mapEl.appendChild(gm);
    const arrive = h('<div class="arrive"></div>'); mapEl.appendChild(arrive);
    const ui = { sub: $('.pip .sub', el), img: $('.pip .gimg', el), react: $('.pip .react', el) };
    const lines = CFG.grandma.map.lines, ctrl = $('.ctrl', el), trail = $('#trail polyline', el), holeBtn = $('#holeBtn', el), hole = $('#hole', el);
    ctrl.innerHTML = lines.map((l, i) => `<div class="lb" data-i="${i}"><b>${i + 1}</b>${l.k}</div>`).join('') + '<div class="lb act" data-act="reveal"><b>0</b>▶ 真相揭晓</div>';
    let at = 'G', walking = false, pts = [], raf = 0;
    function place(k) { gm.style.left = N[k].x + 'px'; gm.style.top = N[k].y + 'px'; }
    function path(a, b) {
      const adj = {}; MAP.edges.forEach(([x, y]) => { (adj[x] = adj[x] || []).push(y); (adj[y] = adj[y] || []).push(x); });
      const prev = { [a]: null }, q = [a];
      while (q.length) { const c = q.shift(); if (c === b) break; (adj[c] || []).forEach(n => { if (!(n in prev)) { prev[n] = c; q.push(n); } }); }
      const out = []; for (let c = b; c; c = prev[c]) out.unshift(c); return out;
    }
    function walk(to) {
      if (walking || to === at) return; const route = path(at, to); walking = true; arrive.classList.remove('on'); gm.classList.add('walk');
      let seg = 0, t = 0, p0 = N[route[0]], p1 = N[route[1]], dist = Math.hypot(p1.x - p0.x, p1.y - p0.y), last = performance.now(), stepT = 0;
      const frame = (now) => {
        const dt = (now - last) / 1000; last = now; t += dt * 420 / dist; stepT += dt;
        if (stepT > .28) { stepT = 0; Snd.sfx.step(); }
        if (t >= 1) {
          pts.push(`${p1.x},${p1.y}`); seg++;
          if (seg >= route.length - 1) { place(to); trail.setAttribute('points', pts.join(' ')); walking = false; gm.classList.remove('walk'); at = to; onArrive(to); return; }
          p0 = N[route[seg]]; p1 = N[route[seg + 1]]; dist = Math.hypot(p1.x - p0.x, p1.y - p0.y); t = 0;
        }
        const x = p0.x + (p1.x - p0.x) * t, y = p0.y + (p1.y - p0.y) * t;
        gm.style.left = x + 'px'; gm.style.top = y + 'px'; trail.setAttribute('points', pts.concat([`${x},${y}`]).join(' '));
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }
    function onArrive(k) {
      const n = N[k]; arrive.textContent = `我到${n.n}了！`; arrive.style.left = n.x + 'px'; arrive.style.top = (n.y + 34 + 52) + 'px'; arrive.classList.add('on'); Snd.sfx.sparkle();
      setTimeout(() => arrive.classList.remove('on'), 2600);
      if (k === 'W') { hole.classList.add('on'); holeBtn.classList.add('on'); }
    }
    function reveal() {
      Snd.sfx.whoosh(); mapEl.style.transition = 'transform 1.4s ease-in'; mapEl.style.transformOrigin = '1800px 200px'; mapEl.style.transform = 'scale(4)';
      setTimeout(() => { go('reveal'); }, 1300);
    }
    mapEl.addEventListener('click', e => { const nd = e.target.closest('.node'); if (nd) { Snd.sfx.click(); walk(nd.dataset.k); } });
    holeBtn.addEventListener('click', reveal);
    ctrl.addEventListener('click', e => { const b = e.target.closest('.lb'); if (!b) return; if (b.dataset.act) reveal(); else sayIn(ui, lines[+b.dataset.i]); });
    scenes.map = { el,
      enter() { cancelAnimationFrame(raf); walking = false; at = 'G'; pts = [`${N.G.x},${N.G.y}`]; trail.setAttribute('points', ''); place('G'); gm.classList.remove('walk'); arrive.classList.remove('on'); hole.classList.remove('on'); holeBtn.classList.remove('on'); mapEl.style.transition = 'none'; mapEl.style.transform = 'none'; ui.sub.classList.remove('on'); },
      leave() { cancelAnimationFrame(raf); stopSay(ui); },
      key(e) {
        if (/^[1-7]$/.test(e.key) && lines[+e.key - 1]) { sayIn(ui, lines[+e.key - 1]); return true; }
        if (e.key === '0') { reveal(); return true; }
        if (e.key === 'ArrowRight') { reveal(); return true; }
      } };
  })();

  /* ======================= 真相揭晓 ======================= */
  (function () {
    const el = addScene('reveal', '', `<video id="rvVideo" playsinline preload="auto"></video><div class="ph" id="rvPh" style="display:none"></div><div id="revealTitle"><span>真相揭晓时刻</span></div><div id="revealCap">原来是叔叔养的黑猫和橘猫！</div><button class="btn sm" id="revealSkip">跳过 ▶</button>`);
    const v = $('#rvVideo', el), ph = $('#rvPh', el), cap = $('#revealCap', el);
    let phT = [], usingPh = false, started = false;
    function finish() { if (state.cur === 'reveal') go('review'); }
    function startPlaceholder() {
      if (usingPh) return; usingPh = true; v.style.display = 'none'; ph.style.display = 'block'; ph.innerHTML = Art.revealPlaceholder();
      const wall = $('#rv-wall', ph);
      wall.style.transformOrigin = '960px 540px';
      wall.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(4.5)', opacity: 1, offset: .55 }, { transform: 'scale(6)', opacity: 0 }], { duration: 6500, fill: 'forwards', easing: 'ease-in-out' });
      Snd.sfx.whoosh(); phT.push(setTimeout(() => { cap.style.opacity = 1; Snd.sfx.ding(); }, 7000)); phT.push(setTimeout(finish, 12500));
    }
    v.addEventListener('ended', finish);
    v.addEventListener('error', startPlaceholder);
    $('#revealSkip', el).addEventListener('click', finish);
    scenes.reveal = { el,
      enter() {
        usingPh = false; phT.forEach(clearTimeout); phT = []; cap.style.opacity = 0; ph.style.display = 'none'; v.style.display = 'block';
        v.src = CFG.revealVideo; v.currentTime = 0; v.volume = 1;
        const pr = v.play(); if (pr && pr.catch) pr.catch(() => { if (v.error || v.networkState === 3) startPlaceholder(); });
        phT.push(setTimeout(() => { if (v.readyState === 0 && !usingPh) startPlaceholder(); }, 2500));
      },
      leave() { phT.forEach(clearTimeout); try { v.pause(); } catch (e) {} },
      key(e) { if (e.key === ' ') { if (!usingPh) { v.paused ? v.play() : v.pause(); } return true; } if (e.key === 'Escape') { finish(); return true; } }
    };
  })();

  /* ======================= 9 笔记本回顾 ======================= */
  (function () {
    const el = addScene('review', '', `<div class="deskL" style="position:absolute;inset:0"><img class="bg" src="assets/img/desk.jpg" alt=""><div class="board-layer"></div><div class="hit glow" id="rvOpen" style="left:31.2%;top:44%;width:36.3%;height:49%"></div></div>
      <div class="nbL" style="position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .6s"><img class="bg" src="assets/img/notebook_blank.jpg" alt="">
        <div class="nbpage L"></div><div class="nbpage R"></div><div class="stamp" id="stamp">破案<br>成功</div><div class="confetti" id="conf"></div>
        <div class="nb-arrow" id="rvL" style="left:32px;top:972px"></div><div class="nb-arrow" id="rvR" style="left:1790px;top:972px"></div></div>`);
    const deskL = $('.deskL', el), nbL = $('.nbL', el), L = $('.nbpage.L', el), R = $('.nbpage.R', el), stamp = $('#stamp', el), conf = $('#conf', el);
    const layer = $('.board-layer', el);
    const pol = (inner, title, w, rot) => `<div class="polaroid" style="width:${w}px;transform:rotate(${rot || -2}deg)"><div class="pp">${inner}</div><div class="pt">${title}</div></div>`;
    const spreads = [];
    CFG.clues.forEach((c, i) => {
      spreads.push({
        L: c.id === 'prints'
          ? `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:-10px">${pol(`<div style="position:absolute;inset:0;${crop(c.cropA, 4 / 3)}"></div>`, '脚印 A', 250, -3)}${pol(`<div style="position:absolute;inset:0;${crop(c.cropB, 4 / 3)}"></div>`, '脚印 B', 250, 2)}</div>`
          : `<div style="display:flex;flex-direction:column;align-items:center;margin-top:30px">${pol(`<div style="position:absolute;inset:0;${crop(c.crop, 4 / 3)}"></div>`, `线索${NUM[i]}　${c.short}`, 320, -2)}</div>`,
        R: `<div class="sticker">已破解 ✔</div><div class="hd">我们的发现</div><div class="tx">${c.truth}</div>`
      });
    });
    spreads.push({ L: `<div style="margin-top:36px">${pol(Art.miniRoute(), '监控里的路线', 330, -2)}</div>`, R: `<div class="hd">足迹路线</div><div class="tx">花园 → 走廊 → 小卖部 → 图书馆 → 体育馆旁的小路</div>` });
    spreads.push({ L: `<div style="margin-top:36px">${pol(Art.truthIllustration(), '真相大白', 330, 2)}</div>`, R: `<div class="hd">真相</div><div class="tx">叔叔养的黑猫和橘猫，溜进花园偷吃了百日菊！</div>` });
    spreads.push({ L: `<div class="hd" style="font-size:54px;margin-top:70px;text-align:center">恭喜你们！</div><div class="tx" style="text-align:center;margin-top:30px">小侦探们<br>成功破案啦！<br>你们会提问、会推理、<br>也会礼貌地交流。</div>`, R: `<div class="tx" style="margin-top:318px;font-size:30px">了不起的小侦探！</div>`, stamp: true });
    let i = 0, open = false, busy = false;
    function fill(n) { L.innerHTML = spreads[n].L; R.innerHTML = spreads[n].R; stamp.classList.remove('on'); stamp.style.opacity = 0; conf.innerHTML = ''; }
    function after(n) {
      if (spreads[n].stamp) setTimeout(() => { if (state.cur !== 'review' || i !== n) return; stamp.style.opacity = ''; stamp.classList.add('on'); Snd.sfx.stamp(); setTimeout(() => { Snd.sfx.ding(); petalsLayer(30, conf); }, 450); }, 800);
    }
    function turn(dir) {
      if (!open || busy) return; const n = i + dir;
      if (n < 0) return;
      if (n >= spreads.length) { busy = true; peel(nbL, { left: 977, top: 337, width: 418, height: 633 }, () => {}); setTimeout(() => { busy = false; showAlarm(); }, 700); return; }
      busy = true;
      if (dir > 0) peel(nbL, { left: 977, top: 337, width: 418, height: 633 }, () => { i = n; fill(i); }); else { Snd.sfx.page(); i = n; fill(i); }
      setTimeout(() => { busy = false; after(n); }, dir > 0 ? 900 : 100);
    }
    function openBook() {
      if (open) return; open = true; Snd.sfx.page(); i = 0; fill(0);
      nbL.style.visibility = 'visible'; nbL.style.opacity = 1; setTimeout(() => { deskL.style.visibility = 'hidden'; }, 650);
    }
    $('#rvOpen', el).addEventListener('click', openBook);
    $('#rvR', el).addEventListener('click', () => turn(1)); $('#rvL', el).addEventListener('click', () => turn(-1));
    let openT = 0;
    scenes.review = { el,
      enter() { open = false; busy = false; i = 0; deskL.style.visibility = 'visible'; nbL.style.opacity = 0; nbL.style.visibility = 'hidden'; renderBoard(layer); clearTimeout(openT); openT = setTimeout(() => { if (state.cur === 'review') openBook(); }, 1800); },
      leave() { clearTimeout(openT); },
      key(e) { if (e.key === 'ArrowRight') { if (!open) openBook(); else turn(1); return true; } if (e.key === 'ArrowLeft') { turn(-1); return true; } }
    };
  })();

  /* ---------- 警报（新案件） ---------- */
  const alarm = h(`<div id="alarm"><svg viewBox="0 0 420 380"><path d="M210 18 L400 350 H20z" fill="#ffd23f" stroke="#c0392b" stroke-width="22" stroke-linejoin="round"/><rect x="195" y="120" width="30" height="130" rx="15" fill="#c0392b"/><circle cx="210" cy="298" r="19" fill="#c0392b"/></svg><h2>${CFG.newCase.title}</h2><div class="acase">${CFG.newCase.text}</div><button class="btn sm" id="alarmClose">收起 ✔</button></div>`);
  stage.appendChild(alarm);
  function showAlarm() { alarm.classList.add('on'); Snd.sfx.alarm(3); }
  function hideAlarm() { alarm.classList.remove('on'); Snd.sfx.alarmStop(); }
  $('#alarmClose', alarm).addEventListener('click', hideAlarm);

  /* ---------- 工具条、跳转菜单 ---------- */
  const tb = h(`<div id="toolbar"><button id="tMus" title="音乐 (M)">🎵</button><button id="tSfx" title="音效">🔊</button><button id="tFs" title="全屏 (F)">⛶</button><button id="tMenu" title="跳转菜单 (J)">🧭</button></div>`);
  stage.appendChild(tb);
  function syncTools() { $('#tMus').classList.toggle('off', !Snd.music.playing()); $('#tSfx').classList.toggle('off', !Snd.sfxEnabled()); }
  function toggleMusic() { Snd.init(); if (Snd.music.playing()) Snd.music.off(); else Snd.music.on(); setTimeout(syncTools, 50); }
  function toggleFS() { const d = document.documentElement; if (!document.fullscreenElement) { (d.requestFullscreen || d.webkitRequestFullscreen || function () { }).call(d); } else document.exitFullscreen(); }
  $('#tMus').addEventListener('click', toggleMusic);
  $('#tSfx').addEventListener('click', () => { Snd.init(); Snd.setSfx(!Snd.sfxEnabled()); syncTools(); });
  $('#tFs').addEventListener('click', toggleFS);
  const menu = h(`<div id="menu"><div class="mbox"><h2>跳转到……（老师专用）</h2><div class="mgrid"></div><div class="keys"><kbd>→</kbd><kbd>←</kbd> 下一步 / 上一步　<kbd>空格</kbd> 计时器开始/暂停　<kbd>+</kbd><kbd>-</kbd> 计时器加减 1 分钟<br><kbd>1</kbd>–<kbd>9</kbd> 白奶奶台词　<kbd>0</kbd> 挂断 / 打开地图 / 真相揭晓　<kbd>H</kbd> 隐藏按钮　<kbd>M</kbd> 音乐　<kbd>F</kbd> 全屏　<kbd>J</kbd> 本菜单　<kbd>Esc</kbd> 关闭弹窗</div><div style="margin-top:14px;display:flex;gap:14px"><button class="btn sm stop" id="mReset">重新开始（清空线索进度）</button><button class="btn sm" id="mClose">关闭</button></div></div></div>`);
  stage.appendChild(menu);
  const mg = $('.mgrid', menu);
  ORDER.forEach(([id, name]) => { const b = document.createElement('button'); b.textContent = name; b.dataset.id = id; mg.appendChild(b); });
  mg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; closeMenu(); hideAlarm(); const ti = ids.indexOf(b.dataset.id); if (ti > ids.indexOf('scene')) { CFG.clues.forEach(c => state.found.add(c.id)); state.boardLevel = Math.max(state.boardLevel, ti > ids.indexOf('group') ? 7 : 4); } go(b.dataset.id); });
  function openMenu() { $$('button', mg).forEach(b => b.classList.toggle('cur', b.dataset.id === state.cur)); menu.classList.add('on'); }
  function closeMenu() { menu.classList.remove('on'); }
  $('#mClose', menu).addEventListener('click', closeMenu); $('#mReset', menu).addEventListener('click', () => location.reload()); $('#tMenu').addEventListener('click', openMenu);

  /* ---------- 键盘 ---------- */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    Snd.init(); const k = e.key;
    if (menu.classList.contains('on')) { if (k === 'Escape' || k === 'j' || k === 'J') closeMenu(); return; }
    if (alarm.classList.contains('on')) { if (k === 'Escape' || k === 'Enter' || k === ' ') { hideAlarm(); e.preventDefault(); } return; }
    if (k === 'j' || k === 'J') { openMenu(); return; }
    if (k === 'f' || k === 'F') { toggleFS(); return; }
    if (k === 'm' || k === 'M') { toggleMusic(); return; }
    const S = scenes[state.cur];
    if (S && S.key && S.key(e)) { e.preventDefault(); return; }
    if (k === 'ArrowRight') { e.preventDefault(); next(); } else if (k === 'ArrowLeft') { e.preventDefault(); prevScene(); }
  });
  document.addEventListener('pointerdown', () => Snd.init(), { once: true });

  /* ---------- 缩放到窗口 ---------- */
  function fit() { const vp = $('#viewport'), s = Math.min(vp.clientWidth / 1920, vp.clientHeight / 1080); stage.style.transform = `translate(-50%,-50%) scale(${s})`; }
  window.addEventListener('resize', fit); fit();

  Voice.init();
  go('start');
  window.__go = go; window.__state = state; window.__ids = ids;
})();
