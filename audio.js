/* 全部音效与轻音乐都由浏览器即时合成，不需要任何音频文件，也没有版权问题 */
window.Snd = (function () {
  let ctx, master, sfxG, musG, delayIn, sfxOn = true, musOn = true, musicWanted = false;
  let sched = null, nextT = 0, bar = 0, ringT = null, sirenNodes = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxG = ctx.createGain(); sfxG.gain.value = 0.7; sfxG.connect(master);
    musG = ctx.createGain(); musG.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    musG.connect(lp); lp.connect(master);
    // 柔和回声
    delayIn = ctx.createGain(); delayIn.gain.value = 0.35;
    const d = ctx.createDelay(1.0); d.delayTime.value = 0.38;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    delayIn.connect(d); d.connect(fb); fb.connect(d); d.connect(lp);
  }

  function tone(f, t, dur, o) {
    if (!ctx) return;
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const a = o.attack || 0.006, pk = o.gain == null ? 0.2 : o.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(pk, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.dest || sfxG);
    if (o.echo) { const e = ctx.createGain(); e.gain.value = o.echo; g.connect(e); e.connect(delayIn); }
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(t, dur, o) {
    if (!ctx) return;
    o = o || {};
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f0 || 1500, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    f.Q.value = o.q || 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.gain || 0.2, t + (o.attack || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxG);
    s.start(t); s.stop(t + dur + 0.05);
  }
  const now = () => ctx.currentTime + 0.01;
  const ok = () => ctx && sfxOn;

  const sfx = {
    click() { if (!ok()) return; const t = now(); tone(740, t, .14, { gain: .14, echo: .1 }); tone(1110, t + .05, .12, { gain: .07 }); },
    ding() { if (!ok()) return; const t = now(); [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * .11, .5, { gain: .13, echo: .25 })); },
    pin() { if (!ok()) return; const t = now(); tone(340, t, .12, { gain: .22, slide: 110 }); noise(t, .05, { f0: 3000, gain: .08 }); },
    page() { if (!ok()) return; const t = now(); noise(t, .45, { f0: 900, f1: 3400, q: .6, gain: .16, attack: .12 }); },
    whoosh() { if (!ok()) return; const t = now(); noise(t, .5, { f0: 400, f1: 2500, q: .5, gain: .1, attack: .2 }); },
    hang() { if (!ok()) return; const t = now(); tone(520, t, .2, { gain: .15 }); tone(390, t + .18, .3, { gain: .15 }); },
    stamp() { if (!ok()) return; const t = now(); tone(130, t, .35, { gain: .5, slide: 45 }); noise(t, .12, { f0: 700, type: 'lowpass', gain: .3 }); },
    timeup() { if (!ok()) return; const t = now(); [1047, 784, 659, 523].forEach((f, i) => tone(f, t + i * .28, .9, { gain: .15, echo: .3 })); },
    stat() { if (!ok()) return; const t = now(); noise(t, .55, { f0: 4000, type: 'highpass', gain: .12, attack: .01 }); tone(60, t, .5, { gain: .08 }); },
    step() { if (!ok()) return; const t = now(); tone(210, t, .06, { gain: .06, type: 'triangle' }); },
    sparkle() { if (!ok()) return; const t = now(); [1319, 1760, 2093].forEach((f, i) => tone(f, t + i * .07, .3, { gain: .06, echo: .2 })); },
    ringStart(outgoing) {
      if (!ctx) return; this.ringStop();
      const play = () => {
        if (!sfxOn) return; const t = now();
        if (outgoing) { tone(440, t, .9, { gain: .08 }); tone(480, t, .9, { gain: .08 }); }
        else [1046, 1318, 1568, 1318, 1046, 1318, 1568, 1318].forEach((f, i) => tone(f, t + i * .14, .35, { gain: .12, echo: .2, type: 'triangle' }));
      };
      play(); ringT = setInterval(play, outgoing ? 2600 : 2200);
    },
    ringStop() { if (ringT) { clearInterval(ringT); ringT = null; } },
    alarm(sec) {
      if (!ctx || !sfxOn) return; this.alarmStop();
      const osc = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      osc.type = 'sawtooth'; osc.frequency.value = 780;
      lfo.frequency.value = 1.6; lg.gain.value = 170; lfo.connect(lg); lg.connect(osc.frequency);
      const t = now(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.11, t + .1);
      g.gain.setValueAtTime(.11, t + sec - .3); g.gain.linearRampToValueAtTime(0.0001, t + sec);
      osc.connect(lp); lp.connect(g); g.connect(sfxG); osc.start(t); lfo.start(t); osc.stop(t + sec + .1); lfo.stop(t + sec + .1);
      sirenNodes = [osc, lfo];
    },
    alarmStop() { if (sirenNodes) { try { sirenNodes.forEach(n => n.stop()); } catch (e) {} sirenNodes = null; } }
  };

  /* ---------- 轻音乐：音乐盒 + 柔和和弦（C 大调，Cmaj7–Am7–Fmaj7–G6） ---------- */
  const CH = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 64]];
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  const PENT = [72, 74, 76, 79, 81, 84];
  function scheduler() {
    if (!ctx) return;
    const spb = 60 / 72;
    while (nextT < ctx.currentTime + 0.6) {
      const ch = CH[bar % 4], beat = spb;
      if (musOn) {
        ch.forEach((m, i) => tone(mf(m - (i === 0 ? 12 : 0)), nextT + i * .03, beat * 3.8, { gain: .045, attack: .6, dest: musG }));
        for (let i = 0; i < 8; i++) {
          if (Math.random() < .22) continue;
          const m = ch[(i * 3 + (Math.random() * 2 | 0)) % 4] + 24;
          tone(mf(m), nextT + i * beat / 2, 1.3, { gain: .07, type: 'triangle', dest: musG, echo: .5 });
        }
        if (bar % 2 === 1 && Math.random() < .8) {
          const m = PENT[Math.random() * PENT.length | 0];
          tone(mf(m), nextT + beat * 2, 1.8, { gain: .08, type: 'sine', dest: musG, echo: .6 });
        }
      }
      nextT += beat * 4; bar++;
    }
  }
  function fade(to, sec) {
    if (!ctx) return; const t = ctx.currentTime;
    musG.gain.cancelScheduledValues(t); musG.gain.setValueAtTime(musG.gain.value, t);
    musG.gain.linearRampToValueAtTime(to, t + sec);
  }
  const music = {
    on() { init(); if (!ctx) return; musicWanted = true; if (!sched) { nextT = ctx.currentTime + .1; bar = 0; sched = setInterval(scheduler, 150); } fade(.9, 1.8); },
    off() { musicWanted = false; if (!ctx) return; fade(0, 1.2); setTimeout(() => { if (!musicWanted && sched) { clearInterval(sched); sched = null; } }, 1600); },
    playing() { return musicWanted; }
  };

  return {
    init, sfx, music,
    setSfx(v) { sfxOn = v; if (!v) { sfx.ringStop(); sfx.alarmStop(); } },
    sfxEnabled() { return sfxOn; },
    setMusicEnabled(v) { musOn = v; },
    ctxReady() { return !!ctx; }
  };
})();
