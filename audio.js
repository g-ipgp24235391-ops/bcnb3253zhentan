/* 音效与轻音乐：全部用浏览器 WebAudio 现场合成，不需要任何音频文件，也没有版权问题 */
window.Snd = (function () {
  let ctx, master, sfx, mus, delay, sfxOn = true, musicWanted = false, musTimer = null, ringTimer = null;
  let nextBar = 0, barIdx = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    mus.connect(lp); lp.connect(master);
    delay = ctx.createDelay(1); delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    delay.connect(fb); fb.connect(delay); delay.connect(lp);
  }

  function tone(f, t0, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const a = o.attack || 0.006, v = o.gain == null ? 0.2 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(o.dest || sfx);
    if (o.echo) g.connect(delay);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function bell(f, t0, dur, v, dest, echo) {
    tone(f, t0, dur, { gain: v, dest, echo });
    tone(f * 2.01, t0, dur * 0.6, { gain: v * 0.35, dest, echo });
    tone(f * 3.98, t0, dur * 0.25, { gain: v * 0.12, dest, echo });
  }
  function noise(t0, dur, o) {
    o = o || {};
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f0 || 1500, t0);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
    f.Q.value = o.q || 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.15, t0 + (o.attack || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfx);
    s.start(t0);
  }
  function now() { return ctx.currentTime + 0.01; }
  function ok() { return ctx && sfxOn; }

  const S = {
    init,
    click() { if (!ok()) return; const t = now(); bell(784, t, 0.25, 0.12); },
    pop() { if (!ok()) return; const t = now(); tone(420, t, 0.14, { to: 140, gain: 0.3 }); noise(t, 0.05, { f0: 3000, gain: 0.08 }); },
    page() { if (!ok()) return; const t = now(); noise(t, 0.45, { f0: 900, f1: 3200, q: 0.6, gain: 0.16, attack: 0.12 }); },
    ding() { if (!ok()) return; const t = now(); [784, 988, 1319].forEach((f, i) => bell(f, t + i * 0.11, 0.7, 0.14)); },
    whoosh() { if (!ok()) return; const t = now(); noise(t, 0.5, { f0: 300, f1: 2400, q: 0.5, gain: 0.12, attack: 0.2 }); },
    static() { if (!ok()) return; const t = now(); noise(t, 0.6, { type: 'highpass', f0: 1500, gain: 0.16, attack: 0.01 }); tone(60, t, 0.3, { gain: 0.08 }); },
    step() { if (!ok()) return; const t = now(); tone(180, t, 0.06, { to: 90, gain: 0.12 }); },
    thud() { if (!ok()) return; const t = now(); tone(130, t, 0.35, { to: 45, gain: 0.55 }); noise(t, 0.1, { type: 'lowpass', f0: 600, gain: 0.3 }); },
    stamp() { if (!ok()) return; this.thud(); const t = now() + 0.05; [523, 659, 784, 1047].forEach((f, i) => bell(f, t + 0.15 + i * 0.09, 0.9, 0.12)); },
    timeup() { if (!ok()) return; const t = now(); [880, 698, 587, 880].forEach((f, i) => bell(f, t + i * 0.28, 1.2, 0.15)); },
    buzz() { if (!ok()) return; const t = now(); [0, 0.2, 0.4].forEach((d) => { tone(95, t + d, 0.15, { type: 'sawtooth', gain: 0.1 }); tone(190, t + d, 0.15, { type: 'square', gain: 0.03 }); }); },
    hang() { if (!ok()) return; const t = now(); tone(520, t, 0.16, { gain: 0.16 }); tone(390, t + 0.18, 0.3, { gain: 0.16 }); },
    ringOnce() {
      if (!ok()) return; const t = now();
      [1047, 1319, 1568, 1319, 1047, 1319, 1568, 1319].forEach((f, i) => bell(f, t + i * 0.15, 0.4, 0.11));
    },
    ring(on) {
      clearInterval(ringTimer); ringTimer = null;
      if (on && ctx) { S.ringOnce(); ringTimer = setInterval(S.ringOnce, 1900); }
    },
    alarm(sec) {
      if (!ok()) return; sec = sec || 3.2; const t = now();
      const osc = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = 760;
      lfo.frequency.value = 1.6; lg.gain.value = 190; lfo.connect(lg); lg.connect(osc.frequency);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.13, t + 0.08);
      g.gain.setValueAtTime(0.13, t + sec - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
      osc.connect(f); f.connect(g); g.connect(sfx); osc.start(t); lfo.start(t); osc.stop(t + sec + 0.1); lfo.stop(t + sec + 0.1);
    },
    setSfx(v) { sfxOn = v; if (!v) S.ring(false); },
    isSfx() { return sfxOn; },

    /* ---------- 轻音乐：音乐盒琶音 + 柔和和弦垫底 ---------- */
    setMusic(on) {
      musicWanted = on; if (!ctx) return;
      const t = ctx.currentTime;
      mus.gain.cancelScheduledValues(t); mus.gain.setValueAtTime(mus.gain.value, t);
      mus.gain.linearRampToValueAtTime(on ? 0.5 : 0, t + (on ? 2.0 : 1.0));
      if (on && !musTimer) { nextBar = ctx.currentTime + 0.1; musTimer = setInterval(schedule, 120); }
      if (!on && musTimer) { const id = musTimer; musTimer = null; setTimeout(() => clearInterval(id), 1200); }
    },
    isMusic() { return musicWanted; }
  };

  const CH = [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 52]]; // C△7  Am7  F△7  G6
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const BAR = 3.4;
  function schedule() {
    if (!ctx || !musicWanted) return;
    while (nextBar < ctx.currentTime + 0.8) {
      const ch = CH[barIdx % 4], t = nextBar;
      ch.forEach((m, i) => tone(mf(m), t + i * 0.02, BAR * 1.05, { gain: 0.045, attack: 0.9, dest: mus }));
      const pat = [0, 1, 2, 3, 2, 1, 2, 3];
      for (let i = 0; i < 8; i++) {
        if (Math.random() < 0.2) continue;
        const m = ch[pat[i] % 4] + 24;
        tone(mf(m), t + i * (BAR / 8), 1.3, { gain: 0.07, dest: mus, echo: true });
      }
      if (barIdx % 2 === 1 && Math.random() < 0.8) {
        const pent = [72, 74, 76, 79, 81, 84];
        tone(mf(pent[Math.floor(Math.random() * pent.length)]), t + BAR * 0.5, 1.6, { gain: 0.06, dest: mus, echo: true, type: 'triangle' });
      }
      nextBar += BAR; barIdx++;
    }
  }
  return S;
})();
