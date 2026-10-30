/* 同风格占位绘图（SVG 手绘水彩感）。之后拿到你的正式图可以直接替换。 */
window.Art = (function () {
  const C = { ink: '#7a5a44', sky: '#d3e8ec', grass: '#aacb8a', grass2: '#8db56f', path: '#ead7b0', path2: '#d9c299', wall: '#f4dec6', wall2: '#e8c9aa', roof: '#d98b7e', roof2: '#b9a3d4', water: '#bcdce9', petal: '#ee86a0', petal2: '#f5a964', wood: '#b98a56', stone: '#b5a79a', stone2: '#9a8c80', paper: '#fbf3e0' };
  const o = (w) => `stroke="${C.ink}" stroke-width="${w || 2.4}" stroke-linejoin="round" stroke-linecap="round"`;

  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <filter id="wc" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0.5"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="3"/><feColorMatrix type="matrix" values="0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .35  0 0 0 -1.6 1.15"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
  </defs></svg>`;

  /* ---------- 小零件 ---------- */
  const petal = (x, y, r, c) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="5" transform="rotate(${r} ${x} ${y})" fill="${c || C.petal}" ${o(1.4)} opacity=".95"/>`;
  const petals = (a) => a.map((p, i) => petal(p[0], p[1], p[2] || (i * 47) % 180, i % 3 === 2 ? C.petal2 : C.petal)).join('');
  const paw = (x, y, r, s) => `<g transform="translate(${x} ${y}) rotate(${r || 0}) scale(${s || 1})" fill="#8a6b52" opacity=".62"><ellipse cx="0" cy="4" rx="8" ry="6.5"/><circle cx="-9" cy="-6" r="3.4"/><circle cx="-3" cy="-11" r="3.4"/><circle cx="4" cy="-11" r="3.4"/><circle cx="10" cy="-5" r="3.4"/></g>`;
  const shoe = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r || 0})" fill="#8a6b52" opacity=".55"><path d="M-9 -22 q9 -6 18 0 q4 12 0 24 q-9 4 -18 0 q-4 -12 0 -24z"/><path d="M-8 8 q8 -3 16 0 q2 8 -1 14 q-7 3 -14 0 q-3 -6 -1 -14z"/></g>`;
  const puddle = (x, y, w) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * .28}" fill="${C.water}" opacity=".85"/><ellipse cx="${x - w * .25}" cy="${y - 2}" rx="${w * .3}" ry="${w * .07}" fill="#fff" opacity=".7"/>`;
  const tree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><rect x="-8" y="-6" width="16" height="64" rx="6" fill="#a98262" ${o()}/><circle cx="0" cy="-42" r="50" fill="#8fbb7a" ${o()}/><circle cx="-32" cy="-16" r="32" fill="#a6cc8a" opacity=".92"/><circle cx="32" cy="-18" r="34" fill="#7fae6c" opacity=".92"/><circle cx="-8" cy="-60" r="22" fill="#b7d79a" opacity=".8"/></g>`;
  const bush = (x, y, w) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="${w}" ry="${w * .55}" fill="#86b46f" ${o()}/><ellipse cx="${-w * .35}" cy="${-w * .1}" rx="${w * .5}" ry="${w * .35}" fill="#a2cb86" opacity=".9"/><circle cx="${w * .3}" cy="${-w * .15}" r="4" fill="${C.petal}"/><circle cx="${-w * .2}" cy="${-w * .22}" r="3.5" fill="#f7c76a"/></g>`;
  const win = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#c9e3ee" ${o(2)}/><path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" ${o(1.6)}/><path d="M${x + 6} ${y + h - 8}l${w * .3} -${h * .3}" stroke="#fff" stroke-width="3" opacity=".7"/>`;
  const sky = () => `<rect width="640" height="480" fill="url(#sk)"/>`;
  const skyDef = `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe6ee"/><stop offset=".6" stop-color="#f3efdc"/><stop offset="1" stop-color="#f3efdc"/></linearGradient></defs>`;
  const frame = (inner) => `<svg viewBox="0 0 640 480" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${skyDef}<g filter="url(#wc)">${sky()}${inner}</g><rect width="640" height="480" filter="url(#grain)" opacity=".35" style="mix-blend-mode:multiply"/></svg>`;
  const ground = (y, c) => `<rect x="-10" y="${y}" width="660" height="${480 - y + 10}" fill="${c || C.grass}"/><path d="M0 ${y + 6}q80 -12 160 0t160 0t160 0t160 0" fill="none" stroke="#fff" opacity=".25" stroke-width="6"/>`;

  /* ---------- 九个监控画面 ---------- */
  const CAMS = {
    corridor() {
      let tiles = ''; for (let i = -6; i <= 6; i++) tiles += `<path d="M${320 + i * 30} 330L${320 + i * 140} 480" stroke="${C.path2}" stroke-width="2" fill="none"/>`;
      let pil = ''; for (let i = 0; i < 6; i++) pil += `<rect x="${20 + i * 118}" y="70" width="34" height="270" rx="6" fill="#f7e8d2" ${o()}/>`;
      let wins = ''; for (let i = 0; i < 5; i++) wins += win(74 + i * 118, 120, 70, 100);
      return frame(`<rect y="60" width="640" height="280" fill="${C.wall}"/><rect y="36" width="640" height="40" fill="${C.roof}" ${o()}/>${wins}${pil}<rect y="330" width="640" height="160" fill="${C.path}"/>${tiles}<path d="M0 340H640" ${o()}/>${petals([[120, 400], [200, 372], [310, 420], [420, 385], [520, 440], [590, 360]])}${paw(250, 395, -10)}${paw(285, 372, 5, .8)}${paw(330, 352, -5, .7)}`);
    },
    canteen() {
      let st = ''; for (let i = 0; i < 8; i++) st += `<path d="M${130 + i * 50} 200 l-6 40 h50z" fill="${i % 2 ? '#fff' : C.petal}" ${o(1.6)}/>`;
      return frame(`${ground(330, C.path)}<rect x="0" y="330" width="640" height="150" fill="${C.path}"/>${tree(70, 330, .9)}<rect x="130" y="130" width="400" height="200" fill="${C.wall2}" ${o()}/><rect x="110" y="110" width="440" height="34" rx="6" fill="${C.roof2}" ${o()}/>${st}<rect x="150" y="250" width="360" height="40" fill="#c99a6b" ${o()}/><g>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${170 + i * 56}" y="${222}" width="22" height="30" rx="5" fill="${['#f3a6b5', '#a9d3a0', '#ffd27a', '#9fc5e8', '#d6b6e6', '#f3a6b5'][i]}" ${o(1.4)}/>`).join('')}</g><rect x="560" y="260" width="40" height="70" rx="8" fill="#9db5a3" ${o()}/><rect x="40" y="300" width="80" height="14" fill="${C.wood}" ${o()}/>${petals([[200, 390], [300, 420], [380, 380], [470, 440], [530, 400]])}${shoe(240, 405, 80)}${shoe(285, 395, 80)}${paw(420, 395, 90)}`);
    },
    library() {
      let books = ''; ['#e08a96', '#8fb7d6', '#f2c36b', '#9ccb92'].forEach((c, i) => books += `<rect x="${278 + i * 18}" y="${150 - (i % 2) * 6}" width="14" height="${46 + (i % 2) * 6}" rx="2" fill="${c}" ${o(1.4)}/>`);
      return frame(`${ground(360, C.grass)}<rect x="120" y="70" width="400" height="290" fill="${C.wall}" ${o()}/><path d="M100 80 L320 20 L540 80z" fill="${C.roof}" ${o()}/>${[0, 1, 2].map(i => `<path d="M${150 + i * 110} 280 v-110 a38 38 0 0 1 76 0 v110z" fill="#c9e3ee" ${o(2)}/>`).join('')}<rect x="270" y="130" width="100" height="80" rx="40" fill="#fff6dd" ${o(2)}/>${books}<rect x="290" y="290" width="60" height="70" fill="#a98262" ${o()}/><path d="M250 360h140l20 30H230z" fill="${C.stone}" ${o()}/><path d="M210 390h220l24 40H186z" fill="#c9bdb0" ${o()}/>${tree(560, 380, .9)}${petals([[300, 440], [350, 410], [255, 410], [400, 455]])}${shoe(320, 425, 0)}${shoe(350, 408, 5)}`);
    },
    court() {
      return frame(`${ground(300, C.grass2)}<path d="M60 460 L180 300 H520 L620 460z" fill="#9fc2d6" ${o()}/><path d="M180 300 L120 460 M520 300 L560 460 M90 460 H600 M150 380 H540" stroke="#fff" stroke-width="4" fill="none"/><ellipse cx="340" cy="380" rx="48" ry="16" fill="none" stroke="#fff" stroke-width="4"/><rect x="505" y="110" width="12" height="200" fill="#8a8f99" ${o()}/><rect x="470" y="96" width="76" height="50" rx="4" fill="#fff" ${o()}/><rect x="494" y="120" width="30" height="20" fill="none" stroke="#e5604b" stroke-width="3"/><ellipse cx="509" cy="148" rx="20" ry="6" fill="none" stroke="#e5833b" stroke-width="4"/><g transform="translate(120 410)"><circle r="20" fill="#f0a05a" ${o()}/><path d="M-20 0h40M0 -20v40" ${o(1.6)}/></g>${tree(40, 300, .8)}${petals([[260, 420], [330, 440], [420, 410], [300, 390]])}${paw(380, 395, 70, .8)}${paw(410, 405, 75, .8)}`);
    },
    flag() {
      return frame(`${ground(240, C.grass)}<ellipse cx="320" cy="400" rx="260" ry="62" fill="${C.path}" ${o()}/><ellipse cx="320" cy="385" rx="120" ry="30" fill="${C.stone}" ${o()}/><rect x="314" y="40" width="9" height="350" fill="#b8bfc9" ${o()}/><path d="M323 50 q60 -20 110 0 q-40 22 -110 20z" fill="${C.petal}" ${o()}/>${tree(70, 250, .8)}${tree(580, 250, .85)}${puddle(160, 430, 60)}${puddle(480, 440, 70)}${petals([[210, 410], [260, 440], [400, 420]])}${shoe(350, 445, 10)}${shoe(385, 430, 10)}`);
    },
    track() {
      return frame(`${ground(130, C.grass)}<ellipse cx="320" cy="330" rx="330" ry="130" fill="#e6a590" ${o()}/><ellipse cx="320" cy="330" rx="270" ry="96" fill="none" stroke="#fff" stroke-width="3"/><ellipse cx="320" cy="330" rx="220" ry="72" fill="#a8cc8b" ${o()}/><path d="M270 300v-44M370 300v-44M262 256h116" ${o(3)} fill="none"/>${tree(60, 160, .8)}${tree(590, 150, .8)}<g filter="url(#soft)" opacity=".9"><ellipse cx="230" cy="420" rx="26" ry="14" fill="#2f2b36"/><ellipse cx="300" cy="430" rx="26" ry="14" fill="#f0a24f"/></g><path d="M170 424h34M330 434h34M190 438h24" stroke="#fff" stroke-width="3" opacity=".6"/>${petals([[400, 440], [450, 420]])}`);
    },
    gym() {
      return frame(`${ground(290, C.path)}<rect x="-10" y="290" width="660" height="200" fill="${C.path}"/><path d="M-10 290 q220 -190 440 0z" fill="#b9c8d8" ${o()}/><rect x="-10" y="170" width="440" height="190" fill="#e7ddd0" ${o()}/><path d="M-10 160 q220 -150 440 0" fill="none" ${o()}/><rect x="120" y="240" width="130" height="120" rx="10" fill="#6f7f93" ${o()}/><path d="M185 240v120" ${o()}/><g transform="translate(330 250)"><rect x="-4" y="0" width="8" height="110" fill="#8a8f99" ${o(1.8)}/><rect x="-34" y="-20" width="68" height="40" rx="4" fill="#fff" ${o(1.8)}/><ellipse cx="0" cy="26" rx="16" ry="5" fill="none" stroke="#e5833b" stroke-width="4"/></g><g transform="translate(40 380)"><rect width="90" height="38" rx="8" fill="#9db5a3" ${o()}/>${[0, 1, 2, 3].map(i => `<circle cx="${14 + i * 21}" cy="-6" r="10" fill="${['#f0a05a', '#f3a6b5', '#ffd27a', '#9fc5e8'][i]}" ${o(1.4)}/>`).join('')}</g><g transform="translate(480 395)" ${o(2.4)} fill="none"><path d="M0 0v-34h50v34M10 -34v34M40 -34v34"/></g><path d="M440 290 q60 100 120 190" stroke="${C.path2}" stroke-width="40" fill="none" opacity=".8"/>${petals([[470, 360], [510, 420], [560, 460]])}${paw(500, 380, 60, .8)}`);
    },
    lane() {
      let st = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) st += `<rect x="${380 + c * 44 + (r % 2) * 20}" y="${60 + r * 60}" width="46" height="34" rx="12" fill="${(r + c) % 2 ? C.stone : '#c6b9ac'}" ${o(1.6)}/>`;
      return frame(`${ground(200, C.grass)}<rect x="-10" y="60" width="300" height="350" fill="#e7ddd0" ${o()}/><rect x="40" y="110" width="90" height="70" rx="6" fill="#c9e3ee" ${o()}/><path d="M-10 60h300" ${o(3)}/><rect x="350" y="40" width="300" height="290" fill="#c4b6a8" ${o()}/>${st}${bush(420, 340, 70)}${bush(600, 350, 60)}<path d="M290 480 L320 240 L350 240 L470 480z" fill="${C.path}" ${o()}/>${petals([[370, 400], [400, 350], [345, 300]])}${paw(380, 440, 5)}${paw(350, 400, -5, .9)}${paw(335, 360, 0, .8)}${shoe(400, 455, 8)}${shoe(372, 425, 8)}`);
    },
    garden() { return null; }
  };

  /* ---------- 白奶奶面板背景小插画、道具 ---------- */
  function computer() {
    return `<svg viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg"><g filter="url(#wc)">
    <rect x="40" y="10" width="320" height="250" rx="34" fill="#efe4cf" ${o(3)}/><rect x="62" y="32" width="276" height="196" rx="22" fill="#5f9a93" ${o(3)}/>
    <g class="mini">${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${78 + c * 86}" y="${48 + r * 58}" width="78" height="50" rx="5" fill="${['#9fc9bd', '#b8d6c8', '#86b5aa'][(r + c) % 3]}" opacity=".9"/>`).join('')).join('')}</g>
    <path d="M76 52 q60 -14 120 -6" stroke="#fff" stroke-width="6" opacity=".35" fill="none"/>
    <circle cx="320" cy="244" r="6" fill="#e58a8a" ${o(1.5)}/><rect x="100" y="238" width="90" height="8" rx="4" fill="#d8c8aa"/>
    <path d="M150 262h100l16 30H134z" fill="#e3d5bb" ${o(3)}/><rect x="60" y="296" width="280" height="50" rx="14" fill="#efe4cf" ${o(3)}/>
    ${Array.from({ length: 3 }).map((_, r) => Array.from({ length: 12 }).map((__, c) => `<rect x="${76 + c * 20}" y="${304 + r * 13}" width="15" height="9" rx="2.5" fill="#fff9ec" stroke="#b7a68b" stroke-width="1"/>`).join('')).join('')}
    </g></svg>`;
  }
  function phone() {
    return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg"><g filter="url(#wc)">
    <rect x="24" y="8" width="152" height="324" rx="30" fill="#8fb7d6" ${o(3.2)}/><rect x="36" y="30" width="128" height="268" rx="16" fill="#fff8e6" ${o(2)}/>
    <circle cx="100" cy="120" r="46" fill="#f6e9d1" ${o(2)}/><image href="assets/img/grandma.png" x="52" y="72" width="96" height="96" clip-path="circle(48px at 48px 48px)" style="mix-blend-mode:multiply"/>
    <text x="100" y="206" text-anchor="middle" font-size="22" fill="#7a5a44" font-family="ZCOOL KuaiLe, sans-serif">白奶奶</text>
    <circle cx="100" cy="258" r="22" fill="#7fc48a" ${o(2)}/><path d="M91 262q4 -14 9 -14t9 14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" transform="rotate(135 100 258)"/>
    <rect x="86" y="14" width="28" height="6" rx="3" fill="#6d94b5"/></g></svg>`;
  }
  function scrollSprite() {
    return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><g filter="url(#wc)">
    <rect x="48" y="20" width="104" height="250" rx="28" fill="#f4e4bd" ${o(3)}/><path d="M60 40q40 -10 80 0M60 250q40 10 80 0" stroke="#d9c188" stroke-width="3" fill="none"/>
    <rect x="30" y="8" width="140" height="26" rx="13" fill="#b98a56" ${o(3)}/><rect x="30" y="256" width="140" height="26" rx="13" fill="#b98a56" ${o(3)}/>
    <rect x="48" y="128" width="104" height="22" fill="#e98c9a" ${o(2)}/><path d="M100 150v36l-12 -10 -12 10 0 -36" fill="#e98c9a" ${o(2)}/>
    <text x="100" y="92" text-anchor="middle" font-size="30" fill="#7a5a44" font-family="ZCOOL KuaiLe, sans-serif">语言</text><text x="100" y="126" text-anchor="middle" font-size="30" fill="#7a5a44" font-family="ZCOOL KuaiLe, sans-serif">支架</text></g></svg>`;
  }

  /* ---------- 猫与叔叔 ---------- */
  function cat(x, y, s, color, stripes) {
    const dk = color === 'black';
    const body = dk ? '#3d3943' : '#f2a65a', ear = dk ? '#e8a2b0' : '#f7c9a0';
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M60 60 q60 -10 50 -60" stroke="${body}" stroke-width="16" fill="none" stroke-linecap="round"/><ellipse cx="10" cy="40" rx="62" ry="46" fill="${body}" ${o(3)}/>${stripes ? '<path d="M-20 4v18M-4 0v22M12 0v22" stroke="#d98233" stroke-width="5" stroke-linecap="round"/>' : ''}<circle cx="-40" cy="-22" r="40" fill="${body}" ${o(3)}/><path d="M-72 -44l8 -34 24 20z M-26 -52l22 -26 6 36z" fill="${body}" ${o(3)}/><path d="M-64 -50l3 -14 10 8z M-22 -56l9 -10 2 14z" fill="${ear}"/><ellipse cx="-54" cy="-24" rx="6" ry="8" fill="#fff6c8"/><ellipse cx="-30" cy="-24" rx="6" ry="8" fill="#fff6c8"/><ellipse cx="-54" cy="-23" rx="2.6" ry="6" fill="#222"/><ellipse cx="-30" cy="-23" rx="2.6" ry="6" fill="#222"/><path d="M-46 -8 l6 5 6 -5" stroke="#e8a2b0" stroke-width="3" fill="none"/><path d="M-70 -10h-22M-68 -2l-20 6M12 -10h22M10 -2l20 6" stroke="${dk ? '#d9d4de' : '#fff'}" stroke-width="2" opacity=".8"/></g>`;
  }
  function uncle(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-44" y="60" width="88" height="130" rx="30" fill="#8fb7d6" ${o(3)}/><rect x="-36" y="180" width="30" height="80" rx="10" fill="#7d6b8f" ${o(3)}/><rect x="6" y="180" width="30" height="80" rx="10" fill="#7d6b8f" ${o(3)}/><circle cx="0" cy="20" r="46" fill="#f4cba6" ${o(3)}/><path d="M-46 12 q46 -64 92 0 q-46 -20 -92 0z" fill="#e0956a" ${o(3)}/><rect x="-56" y="8" width="112" height="12" rx="6" fill="#e0956a" ${o(3)}/><circle cx="-16" cy="26" r="4" fill="#4a3a30"/><circle cx="16" cy="26" r="4" fill="#4a3a30"/><path d="M-14 44 q14 12 28 0" stroke="#a45b4a" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="-30" cy="38" r="8" fill="#f0a0a0" opacity=".6"/><circle cx="30" cy="38" r="8" fill="#f0a0a0" opacity=".6"/><path d="M-44 90 q-30 30 -20 70" stroke="#f4cba6" stroke-width="20" fill="none" stroke-linecap="round"/></g>`;
  }
  function truthIllustration(w, h) {
    return `<svg viewBox="0 0 640 480" width="${w || '100%'}" height="${h || '100%'}" xmlns="http://www.w3.org/2000/svg"><g filter="url(#wc)"><rect width="640" height="480" fill="#d3e8ec"/><rect y="300" width="640" height="180" fill="#aacb8a"/>${tree(60, 280, .9)}${tree(590, 270, .9)}${uncle(320, 110, .95)}${cat(150, 360, .8, 'black')}${cat(520, 360, .8, 'orange', true)}${petals([[250, 430], [400, 440]])}<ellipse cx="320" cy="400" rx="60" ry="10" fill="#6a8a58" opacity=".2"/></g><rect width="640" height="480" filter="url(#grain)" opacity=".3" style="mix-blend-mode:multiply"/></svg>`;
  }
  /* 揭晓动画占位（正式动画 mp4 到位后会自动取代） */
  function revealPlaceholder() {
    let st = ''; for (let r = 0; r < 9; r++) for (let c = 0; c < 15; c++) st += `<rect x="${c * 136 + (r % 2) * 68 - 40}" y="${r * 126 - 20}" width="138" height="110" rx="34" fill="${(r * 3 + c * 5) % 3 ? '#b8aa9d' : '#a99b8e'}" stroke="#7a6a5c" stroke-width="3"/>`;
    return `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><g filter="url(#wc)">
    <g id="rv-inside"><rect width="1920" height="1080" fill="#d3e8ec"/><rect y="640" width="1920" height="440" fill="#aacb8a"/>${tree(250, 700, 2)}${tree(1700, 690, 2)}${uncle(960, 240, 2.4)}${cat(560, 900, 1.9, 'black')}${cat(1400, 900, 1.9, 'orange', true)}</g>
    <g id="rv-wall" style="transform-origin:960px 540px">${st}<ellipse cx="960" cy="560" rx="180" ry="150" fill="#2c2420" stroke="#5b4a3d" stroke-width="10"/>${bush(520, 900, 200)}${bush(1420, 940, 220)}</g></g></svg>`;
  }

  /* ---------- 校园地图（俯视）---------- */
  const MAP = {
    nodes: {
      G: { x: 250, y: 840, n: '花园' }, n1: { x: 430, y: 740 }, A: { x: 430, y: 600, n: '教学楼' },
      C: { x: 820, y: 600, n: '小卖部' }, L: { x: 1120, y: 600, n: '图书馆' },
      F: { x: 820, y: 800, n: '升旗台' }, B: { x: 1120, y: 800, n: '篮球场' }, T: { x: 1420, y: 850, n: '操场' },
      Y: { x: 1560, y: 600, n: '体育馆' }, P: { x: 1760, y: 470, n: '体育馆旁小路' }, W: { x: 1760, y: 250, n: '石墙' }
    },
    edges: [['G', 'n1'], ['n1', 'A'], ['A', 'C'], ['C', 'L'], ['L', 'Y'], ['C', 'F'], ['F', 'B'], ['B', 'T'], ['L', 'B'], ['T', 'Y'], ['Y', 'P'], ['P', 'W']]
  };
  function mapSVG() {
    const N = MAP.nodes;
    const road = MAP.edges.map(([a, b]) => `<path d="M${N[a].x} ${N[a].y}L${N[b].x} ${N[b].y}" stroke="${C.path}" stroke-width="74" stroke-linecap="round"/>`).join('');
    const roadIn = MAP.edges.map(([a, b]) => `<path d="M${N[a].x} ${N[a].y}L${N[b].x} ${N[b].y}" stroke="#f6e8c8" stroke-width="56" stroke-linecap="round"/>`).join('');
    const bld = (x, y, w, h, rc, label) => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${C.wall}" ${o(4)}/><rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h * .42}" rx="12" fill="${rc}" ${o(4)}/>${Array.from({ length: Math.floor(w / 90) }).map((_, i) => `<rect x="${x + 26 + i * 80}" y="${y + h * .5}" width="42" height="${h * .3}" rx="6" fill="#c9e3ee" ${o(2.5)}/>`).join('')}</g>`;
    let stones = ''; for (let i = 0; i < 9; i++) stones += `<ellipse cx="${1650 + i * 30}" cy="${196 + (i % 2) * 6}" rx="22" ry="17" fill="${i % 2 ? C.stone : '#c6b9ac'}" ${o(3)}/>`;
    const trees = [[120, 180], [300, 200], [560, 180], [100, 520], [1000, 960], [700, 990], [1880, 700], [1860, 980], [560, 880], [1280, 700], [1750, 760], [980, 170]].map(([x, y]) => tree(x, y, .85)).join('');
    const lab = Object.values(N).filter(n => n.n).map(n => n).length;
    return `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><g filter="url(#wc)">
    <rect width="1920" height="1080" fill="#bcd9a0"/><circle cx="300" cy="900" r="230" fill="#a9cd8d" opacity=".7"/><circle cx="1500" cy="200" r="300" fill="#c7e0ac" opacity=".7"/>
    ${road}${roadIn}
    <ellipse cx="1420" cy="850" rx="300" ry="118" fill="#e6a590" ${o(4)}/><ellipse cx="1420" cy="850" rx="220" ry="70" fill="#a8cc8b" ${o(4)}/>
    <rect x="1030" y="740" width="180" height="120" rx="10" fill="#9fc2d6" ${o(4)}/><path d="M1030 800h180M1120 740v120" stroke="#fff" stroke-width="4"/>
    <ellipse cx="820" cy="790" rx="100" ry="70" fill="#d8cbb0" ${o(4)}/><circle cx="820" cy="790" r="12" fill="#b8bfc9"/>
    <g transform="translate(130 750)"><ellipse cx="120" cy="90" rx="140" ry="100" fill="#8a6a4e" opacity=".85" ${o(4)}/>${Array.from({ length: 12 }).map((_, i) => { const a = i * .52; return `<circle cx="${120 + Math.cos(a) * 80 + (i % 3) * 10}" cy="${90 + Math.sin(a) * 52}" r="14" fill="${['#ee86a0', '#f5a964', '#c8a2d8', '#f0c75a'][i % 4]}" ${o(2)}/>`; }).join('')}</g>
    ${bld(180, 330, 520, 160, C.roof)}${bld(740, 440, 160, 90, C.roof2)}${bld(1020, 380, 200, 120, '#e4b66f')}
    <g><rect x="1400" y="330" width="320" height="190" rx="30" fill="#e7ddd0" ${o(4)}/><path d="M1380 340q180 -140 360 0z" fill="#b9c8d8" ${o(4)}/><rect x="1500" y="420" width="120" height="100" rx="12" fill="#6f7f93" ${o(3)}/></g>
    <rect x="1620" y="170" width="290" height="60" rx="10" fill="#cfc3b6" opacity=".9" ${o(3)}/>${stones}
    ${trees}
    </g><rect width="1920" height="1080" filter="url(#grain)" opacity=".28" style="mix-blend-mode:multiply"/></svg>`;
  }
  function miniRoute() {
    const N = MAP.nodes, route = ['G', 'n1', 'A', 'C', 'L', 'Y', 'P', 'W'];
    const pts = route.map(k => `${N[k].x / 3 + 0},${N[k].y / 3}`).join(' ');
    return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg"><rect width="640" height="360" fill="#e3f0cf"/><g transform="scale(1)">${MAP.edges.map(([a, b]) => `<path d="M${N[a].x / 3} ${N[a].y / 3}L${N[b].x / 3} ${N[b].y / 3}" stroke="#ead7b0" stroke-width="22" stroke-linecap="round"/>`).join('')}<polyline points="${pts}" fill="none" stroke="#e5604b" stroke-width="5" stroke-dasharray="3 12" stroke-linecap="round"/>${Object.values(N).filter(n => n.n).map(n => `<circle cx="${n.x / 3}" cy="${n.y / 3}" r="7" fill="#fff" stroke="#7a5a44" stroke-width="2.5"/><text x="${n.x / 3}" y="${n.y / 3 - 12}" text-anchor="middle" font-size="17" fill="#6b4c38" font-family="ZCOOL KuaiLe, sans-serif">${n.n}</text>`).join('')}</g></svg>`;
  }

  /* ---------- 线索细节上的叠加图 ---------- */
  function hairOverlay() {
    const s = (d, c, w) => `<path d="${d}" stroke="${c}" stroke-width="${w || 5}" fill="none" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%"><g filter="url(#wc)">
    ${s('M60 120 q60 -40 120 -10', '#2e2a33', 7)}${s('M80 150 q70 -30 130 -4', '#2e2a33', 6)}${s('M70 190 q50 -30 110 -6', '#3d3943', 6)}
    ${s('M190 260 q70 -50 140 -14', '#f0a24f', 8)}${s('M210 290 q60 -34 120 -4', '#f2b36d', 6)}${s('M180 230 q50 -30 110 -8', '#e8923c', 6)}</g></svg>`;
  }
  function dropOverlay() {
    const dr = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" class="drop"><path d="M0 -18 q14 18 0 30 q-14 -12 0 -30z" fill="#cfeaf5" stroke="#8fc3d8" stroke-width="2" opacity=".92"/><ellipse cx="-3" cy="2" rx="3" ry="6" fill="#fff" opacity=".85"/></g>`;
    return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%">${[[70, 90, 1.1], [150, 170, 1.4], [240, 70, 1], [300, 200, 1.2], [110, 240, .9], [200, 140, .8], [330, 110, .8]].map(a => dr(...a)).join('')}</svg>`;
  }

  function cam(id) { return CAMS[id] ? CAMS[id]() : null; }
  function cursorMagnifier() {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><circle cx='22' cy='22' r='15' fill='rgba(200,230,245,.55)' stroke='#d9a441' stroke-width='5'/><path d='M33 33 L50 50' stroke='#8a4b2b' stroke-width='7' stroke-linecap='round'/><path d='M13 17 q4 -7 11 -7' stroke='#fff' stroke-width='3' fill='none' stroke-linecap='round'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 22 22, zoom-in`;
  }

  return { C, DEFS, MAP, cam, computer, phone, scrollSprite, cat, uncle, truthIllustration, revealPlaceholder, mapSVG, miniRoute, hairOverlay, dropOverlay, cursorMagnifier, petal, tree };
})();
