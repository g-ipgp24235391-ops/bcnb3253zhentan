/* 占位绘图：用代码画的水彩风小插图（监控 9 格、校园地图、桌面道具、揭晓占位）。
   你有正式的图片后，可以直接替换。 */
window.Art = (function () {
  const C = { ink: '#7a5a44', sky: '#cfe5ea', grass: '#aacb8a', grass2: '#8db56f', path: '#e7d3ac', path2: '#d6bd93',
    wall: '#f3dcc3', wall2: '#e8c8a9', roof: '#d98b7e', roof2: '#a9a0cf', water: '#b9dbe8', petal: '#f08fa6', petal2: '#f6b06b',
    wood: '#b98a56', stone: '#b4a79a', stone2: '#9c8f84' };
  const o = (w) => `stroke="${C.ink}" stroke-width="${w || 2.4}" stroke-linejoin="round" stroke-linecap="round"`;

  function wrap(inner, vb) {
    vb = vb || '0 0 640 480';
    const [, , w, h] = vb.split(' ');
    return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#wc)">${inner}</g>
      <rect width="${w}" height="${h}" fill="#fff" filter="url(#grain)" opacity=".42" style="mix-blend-mode:multiply"/></svg>`;
  }
  const sky = (h) => `<defs><linearGradient id="sk${h}" x1="0" y1="0" x2="0" y2="${h / 480}"><stop offset="0" stop-color="#bcdde6"/><stop offset="1" stop-color="#f2f1dc"/></linearGradient></defs><rect width="640" height="480" fill="url(#sk${h})"/>`;
  const ground = (y, c1, c2) => `<rect y="${y}" width="640" height="${480 - y}" fill="${c1 || C.grass}"/><ellipse cx="160" cy="${y + 40}" rx="200" ry="26" fill="${c2 || C.grass2}" opacity=".45"/><ellipse cx="520" cy="${y + 90}" rx="190" ry="30" fill="${c2 || C.grass2}" opacity=".4"/>`;
  const tree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><rect x="-8" y="-6" width="16" height="64" rx="6" fill="#a27a56" ${o()}/><circle cx="0" cy="-42" r="50" fill="#8fbb7a" ${o()}/><circle cx="-32" cy="-16" r="32" fill="#a6cc8a" opacity=".92"/><circle cx="34" cy="-20" r="34" fill="#7fae6c" opacity=".92"/></g>`;
  const bush = (x, y, w) => `<g transform="translate(${x} ${y})"><ellipse rx="${w}" ry="${w * 0.55}" fill="#86b26f" ${o(2)}/><ellipse cx="${-w * 0.35}" cy="-${w * 0.2}" rx="${w * 0.5}" ry="${w * 0.35}" fill="#a2c887"/></g>`;
  const petal = (x, y, r, c) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="4.5" transform="rotate(${r} ${x} ${y})" fill="${c || C.petal}" stroke="#c8657e" stroke-width="1.2"/>`;
  const petals = (arr) => arr.map((p, i) => petal(p[0], p[1], p[2] || i * 40, i % 3 === 2 ? C.petal2 : C.petal)).join('');
  const paw = (x, y, r, s) => `<g transform="translate(${x} ${y}) rotate(${r || 0}) scale(${s || 1})" fill="#7b6a58" opacity=".7"><ellipse cx="0" cy="3" rx="7" ry="6"/><circle cx="-8" cy="-6" r="3.2"/><circle cx="-3" cy="-11" r="3.2"/><circle cx="3" cy="-11" r="3.2"/><circle cx="8" cy="-6" r="3.2"/></g>`;
  const shoe = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r || 0})" fill="#8b7662" opacity=".6"><path d="M-9 -20 Q0 -26 9 -20 Q11 -6 7 2 L-7 2 Q-11 -6 -9 -20Z"/><path d="M-7 8 Q0 5 7 8 Q8 20 0 22 Q-8 20 -7 8Z"/></g>`;
  const puddle = (x, y, w) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * 0.22}" fill="${C.water}" opacity=".85"/><ellipse cx="${x - w * 0.2}" cy="${y - 2}" rx="${w * 0.4}" ry="${w * 0.07}" fill="#fff" opacity=".6"/>`;
  const win = (x, y, w, h, arch) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${arch ? w / 2 : 4}" fill="#d4e9ee" ${o(2)}/><path d="M${x + w / 2} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}" ${o(1.6)} fill="none"/><rect x="${x + 4}" y="${y + 4}" width="${w * 0.25}" height="${h * 0.7}" fill="#fff" opacity=".35"/>`;
  const ball = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c || '#f0a259'}" ${o(1.8)}/><path d="M${x - r} ${y}H${x + r}M${x} ${y - r}V${y + r}" ${o(1.2)} fill="none"/>`;
  const cat = (x, y, s, col, stripe, flip) => `<g transform="translate(${x} ${y}) scale(${(flip ? -1 : 1) * s} ${s})">
      <path d="M-40 -6 Q-70 -20 -62 -48" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round"/>
      <ellipse cx="0" cy="0" rx="42" ry="26" fill="${col}" ${o(2)}/>${stripe ? '<path d="M-14 -22 q4 10 0 20 M0 -24 q4 10 0 22 M14 -22 q4 10 0 20" stroke="#c97a2e" stroke-width="4" fill="none" stroke-linecap="round"/>' : ''}
      <circle cx="38" cy="-20" r="22" fill="${col}" ${o(2)}/><path d="M22 -36 L26 -58 L40 -40Z M44 -40 L56 -58 L58 -34Z" fill="${col}" ${o(2)}/>
      <circle cx="31" cy="-22" r="3.4" fill="${stripe ? '#3a2a1c' : '#ffe27a'}"/><circle cx="46" cy="-22" r="3.4" fill="${stripe ? '#3a2a1c' : '#ffe27a'}"/>
      <path d="M38 -15 l-3 3 h6z" fill="#f2a1a8"/><path d="M52 -16 h14 M52 -12 l13 4 M24 -16 h-12 M24 -12 l-11 4" stroke="${stripe ? '#fff' : '#f4efe8'}" stroke-width="1.3" opacity=".8"/>
      <rect x="-26" y="18" width="12" height="20" rx="5" fill="${col}" ${o(2)}/><rect x="16" y="18" width="12" height="20" rx="5" fill="${col}" ${o(2)}/></g>`;

  /* ---------- 监控（用你画的水彩监控图；花园用现场图） ---------- */
  const CAM_IMG = { corridor: 'cam_corridor', shop: 'cam_shop', library: 'cam_library', court: 'cam_court', flag: 'cam_flag', track: 'cam_track', canteen: 'cam_canteen', lane: 'cam_lane' };
  const KEY = (id) => {
    if (id === 'garden') return `<div class="cam-garden" style="background-image:url(scene.jpg);background-size:150% auto;background-position:34% 38%"></div>`;
    return `<img class="cam-img" src="${CAM_IMG[id]}.jpg" alt="">`;
  };

  /* ---------- 校园地图（1920×1080，满屏） ---------- */
  const MAP_NODES = {
    G: { x: 260, y: 880, n: '花园' }, a: { x: 430, y: 740 }, A: { x: 430, y: 590, n: '教学楼' }, C: { x: 800, y: 600, n: '小卖部' },
    L: { x: 1150, y: 440, n: '图书馆' }, K: { x: 1440, y: 330, n: '食堂' },
    B: { x: 900, y: 790, n: '篮球场' }, F: { x: 1210, y: 840, n: '升旗台' }, T: { x: 1540, y: 885, n: '操场' },
    Y: { x: 1610, y: 750, n: '体育馆' }, P: { x: 1810, y: 560, n: '体育馆旁小路' }, W: { x: 1690, y: 340, n: '石墙' }
  };
  /* 雨靴脚印：…小卖部 → 图书馆 → 食堂（中断）　猫爪印：…小卖部 → 篮球场 → 升旗台 → 操场 → 体育馆 → 小路 → 石墙 */
  const MAP_EDGES = [['G', 'a'], ['a', 'A'], ['A', 'C'], ['C', 'L'], ['L', 'K'], ['C', 'B'], ['B', 'F'], ['F', 'T'], ['T', 'Y'], ['Y', 'P'], ['P', 'W']];
  const CAT_ROUTE = ['G', 'a', 'A', 'C', 'B', 'F', 'T', 'Y', 'P', 'W'], BOOT_ROUTE = ['A', 'C', 'L', 'K'];
  function map() {
    const N = MAP_NODES;
    const roads = MAP_EDGES.map(([a, b]) => `<line x1="${N[a].x}" y1="${N[a].y}" x2="${N[b].x}" y2="${N[b].y}"/>`).join('');
    const label = (k, dy) => { const w = Math.max(116, N[k].n.length * 28 + 36); return `<g transform="translate(${N[k].x} ${N[k].y + (dy || 0)})"><rect x="${-w / 2}" y="-22" width="${w}" height="40" rx="14" fill="#fff8e6" stroke="${C.ink}" stroke-width="2.2"/><text y="8" text-anchor="middle" font-size="26" fill="${C.ink}" font-family="'ZCOOL KuaiLe','KaiTi',serif">${N[k].n}</text></g>`; };
    const bld = (x, y, w, h, roof) => `<g><rect x="${x + 8}" y="${y + 10}" width="${w}" height="${h}" rx="12" fill="#6b4a2a" opacity=".16"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${roof}" ${o(3)}/><rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h * 0.3}" rx="8" fill="#fff" opacity=".28"/>${Array.from({ length: Math.floor(w / 70) }).map((_, i) => `<rect x="${x + 22 + i * 70}" y="${y + h - 42}" width="34" height="26" rx="5" fill="#d9ecef" ${o(1.8)}/>`).join('')}</g>`;
    const trees = [[120, 230], [180, 150], [640, 200], [900, 130], [1300, 600], [1000, 640], [640, 900], [1790, 840], [1860, 700], [90, 560], [560, 1010], [1050, 1020], [1700, 130], [1860, 960], [90, 760], [1280, 700], [760, 330]]
      .map(([x, y], i) => `<g transform="translate(${x} ${y}) scale(${0.65 + (i % 3) * 0.12})"><circle r="52" fill="#8fbb7a" ${o(2.6)}/><circle cx="-26" cy="14" r="30" fill="#a6cc8a" opacity=".9"/><circle cx="28" cy="10" r="32" fill="#7fae6c" opacity=".9"/></g>`).join('');
    const garden = `<g transform="translate(260 880)"><ellipse rx="170" ry="120" fill="#7a5a3a" ${o(3)}/><ellipse rx="150" ry="102" fill="#9b7650"/>${[[-70, -30], [-10, -50], [50, -20], [-40, 30], [30, 40], [80, 10], [-90, 20]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="13" fill="${['#f08fa6', '#f6b06b', '#b79ad9'][i % 3]}" ${o(1.6)}/>`).join('')}</g>`;
    const wall = `<g transform="translate(1770 215)">${Array.from({ length: 7 }).map((_, i) => `<rect x="${-150 + i * 46}" y="${(i % 2) * 14 - 14}" width="44" height="30" rx="9" fill="${i % 2 ? C.stone2 : '#c9beb2'}" ${o(2.4)}/>`).join('')}${Array.from({ length: 6 }).map((_, i) => `<rect x="${-128 + i * 46}" y="${((i + 1) % 2) * 14 + 6}" width="44" height="30" rx="9" fill="${i % 2 ? '#c9beb2' : C.stone2}" ${o(2.4)}/>`).join('')}</g>`;
    const gym = `<g transform="translate(435 320) scale(.75)"><path d="M1380 340 Q1560 240 1740 340 V520 H1380Z" fill="#e1e7ec" ${o(3.4)}/><path d="M1380 340 Q1560 240 1740 340 L1740 378 Q1560 282 1380 378Z" fill="${C.roof2}" ${o(3)}/><rect x="1520" y="430" width="80" height="90" rx="6" fill="#b78d62" ${o(2.4)}/><g transform="translate(1420 470)">${ball(0, 0, 14)}${ball(34, 2, 14, '#e88ca1')}</g></g>`;
    const seg = (route) => route.map((k) => N[k].x + ',' + N[k].y).join(' ');
    return `<svg viewBox="0 0 1920 1080" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><g filter="url(#wc)">
      <rect width="1920" height="1080" fill="#cfe3b4"/><ellipse cx="500" cy="300" rx="520" ry="260" fill="#bcd89c" opacity=".6"/><ellipse cx="1400" cy="900" rx="560" ry="240" fill="#bcd89c" opacity=".6"/>
      <g stroke="${C.path2}" stroke-width="86" stroke-linecap="round" stroke-linejoin="round" fill="none">${roads}</g>
      <g stroke="${C.path}" stroke-width="72" stroke-linecap="round" fill="none">${roads}</g>
      <ellipse cx="1540" cy="885" rx="250" ry="96" fill="#e6a590" ${o(3)}/><ellipse cx="1540" cy="885" rx="180" ry="56" fill="#9dc47f" ${o(2.4)}/>
      <rect x="780" y="730" width="240" height="120" rx="10" fill="#8fb3c9" ${o(3)}/><path d="M900 730V850M780 790H1020" stroke="#fff" stroke-width="3"/>
      <circle cx="1210" cy="840" r="62" fill="#e3d9cb" ${o(3)}/><rect x="1206" y="780" width="8" height="64" fill="#8b7662"/><path d="M1214 782 q30 -8 54 6 q-8 12 0 24 q-28 -12 -54 -4z" fill="#f2a1a8"/>
      ${trees}${garden}${bld(160, 330, 520, 190, '#e5b3a2')}${bld(690, 440, 220, 100, '#f0c99e')}${bld(1040, 250, 230, 110, '#b7aedb')}${bld(1330, 160, 250, 110, '#9fc9d6')}
      ${gym}${wall}
      <g fill="#8fbb7a"><ellipse cx="1620" cy="262" rx="60" ry="28" ${o(2)}/></g>
    </g>${Object.keys(N).filter((k) => N[k].n).map((k) => label(k, k === 'G' ? -150 : 68)).join('')}
      <rect width="1920" height="1080" fill="#fff" filter="url(#grain)" opacity=".4" style="mix-blend-mode:multiply"/></svg>`;
  }
  /* 回顾页小地图：猫爪印路线（红）＋ 雨靴脚印路线（蓝，在食堂中断） */
  function miniRoutes() {
    const N = MAP_NODES, seg = (route) => route.map((k) => N[k].x + ',' + N[k].y).join(' ');
    return `<svg viewBox="0 0 1920 1080" preserveAspectRatio="none"><polyline points="${seg(BOOT_ROUTE)}" fill="none" stroke="#5b87c9" stroke-width="16" stroke-dasharray="26 20" stroke-linecap="round"/><polyline points="${seg(CAT_ROUTE)}" fill="none" stroke="#e5575b" stroke-width="16" stroke-dasharray="30 22" stroke-linecap="round"/><g transform="translate(${N.K.x} ${N.K.y})"><circle r="46" fill="#fff8e6" stroke="#5b87c9" stroke-width="8"/><text y="26" text-anchor="middle" font-size="76" font-weight="700" fill="#5b87c9">?</text></g></svg>`;
  }

  /* ---------- 真相（占位）：叔叔 + 两只猫 ---------- */
  function uncle(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-44" y="40" width="88" height="130" rx="30" fill="#8fb6d9" ${o(3)}/><rect x="-34" y="160" width="26" height="70" rx="10" fill="#5f6f8a" ${o(3)}/><rect x="8" y="160" width="26" height="70" rx="10" fill="#5f6f8a" ${o(3)}/>
      <circle cx="0" cy="0" r="46" fill="#f2c9a5" ${o(3)}/><path d="M-48 -8 Q0 -70 48 -8 Q0 -26 -48 -8Z" fill="#6c8f6c" ${o(3)}/><path d="M-50 -6 h-28" stroke="#6c8f6c" stroke-width="12" stroke-linecap="round"/>
      <circle cx="-16" cy="4" r="4.5" fill="#3a2a1c"/><circle cx="16" cy="4" r="4.5" fill="#3a2a1c"/><path d="M-16 24 Q0 38 16 24" fill="none" stroke="#a5504a" stroke-width="4" stroke-linecap="round"/><circle cx="-30" cy="18" r="8" fill="#f2a1a8" opacity=".6"/><circle cx="30" cy="18" r="8" fill="#f2a1a8" opacity=".6"/>
      <path d="M44 70 q50 -20 60 -70" fill="none" stroke="#f2c9a5" stroke-width="20" stroke-linecap="round"/></g>`;
  }
  function truth() {
    return `<svg viewBox="0 0 640 480" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><g filter="url(#wc)">${sky(240)}${ground(240)}<rect x="0" y="330" width="640" height="150" fill="${C.path}"/>${uncle(250, 150, 0.72)}${cat(120, 400, 1.1, '#403a46', false, false)}${cat(470, 410, 1.15, '#f0a24f', true, true)}${petals([[330, 440], [370, 430], [210, 430]])}</g><rect width="640" height="480" fill="#fff" filter="url(#grain)" opacity=".4" style="mix-blend-mode:multiply"/></svg>`;
  }
  function revealPlaceholder() {
    const stones = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 13; c++) {
      const x = c * 160 - (r % 2) * 80, y = r * 124;
      stones.push(`<rect x="${x + 6}" y="${y + 6}" width="148" height="112" rx="26" fill="${(r + c) % 3 === 0 ? '#c9beb2' : (r + c) % 3 === 1 ? '#b4a79a' : '#a89b8e'}" stroke="#7a6a5a" stroke-width="4"/>`);
    }
    return `<div class="rv-ph"><svg class="rv-wall" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><g filter="url(#wc)">
        <rect width="1920" height="1080" fill="#9fc383"/>${stones.join('')}<ellipse cx="1030" cy="640" rx="104" ry="92" fill="#4b3d33" stroke="#6a5849" stroke-width="10"/><path d="M880 940 q40 -150 150 -120 q120 -40 160 130z" fill="#86b26f" stroke="#5d7f4a" stroke-width="4"/>
      </g><rect width="1920" height="1080" fill="#fff" filter="url(#grain)" opacity=".35" style="mix-blend-mode:multiply"/></svg>
      <div class="rv-view">${truth()}</div><div class="rv-cap">原来，是叔叔养的黑猫和橘猫！</div></div>`;
  }

  return { KEY, wrap, miniRoutes, map, truth, revealPlaceholder, MAP_NODES, MAP_EDGES, CAT_ROUTE, BOOT_ROUTE };
})();
