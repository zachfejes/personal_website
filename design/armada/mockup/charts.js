// Chart and decoration helpers for the round-4 mock (scratch only).
(function () {
  const S = window.SHIPS;
  const ols = (P) => {
    const n = P.length, mx = P.reduce((a, p) => a + p[0], 0) / n, my = P.reduce((a, p) => a + p[1], 0) / n;
    const m = P.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / P.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
    return [m, my - m * mx];
  };
  const [pb, pi] = ols(S.map((s) => [Math.log10(s.x), Math.log10(s.y)]));
  const [la, lb] = ols(S.map((s) => [Math.log(s.x), s.y]));
  window.POWER = (x) => 10 ** pi * x ** pb;
  window.LOGFIT = (x) => la * Math.log(x) + lb;

  const fmt = (v) => v.toLocaleString('en', { maximumFractionDigits: 2 });

  /**
   * One scatter chart, drawn in the sheet's line language.
   * o: { w, h, m, kind, x:{min,max,ticks,title}, y:{...}, points, fits:[{f,color,dash}], ref, planned, hl, labels, c:{line,text,muted,acc,bg}, font, id }
   */
  window.plot = function (o) {
    const { w, h, m, c } = o;
    const sc = (ax, a, b) => o.kind === 'log'
      ? (v) => a + ((Math.log10(v) - Math.log10(ax.min)) / (Math.log10(ax.max) - Math.log10(ax.min))) * (b - a)
      : (v) => a + ((v - ax.min) / (ax.max - ax.min)) * (b - a);
    const X = sc(o.x, m.l, w - m.r), Y = sc(o.y, h - m.b, m.t);
    const fs = o.fontSize || 12;
    let g = `<defs><clipPath id="clip${o.id}"><rect x="${m.l}" y="${m.t}" width="${w - m.l - m.r}" height="${h - m.t - m.b}"/></clipPath></defs>`;
    for (const t of o.x.ticks) g += `<line x1="${X(t)}" x2="${X(t)}" y1="${m.t}" y2="${h - m.b}" stroke="${c.line}" stroke-dasharray="2 4"/><text x="${X(t)}" y="${h - m.b + 20}" fill="${c.muted}" font-size="${fs}" text-anchor="middle" font-family="Mono">${fmt(t)}</text>`;
    for (const t of o.y.ticks) g += `<line x1="${m.l}" x2="${w - m.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="${c.line}" stroke-dasharray="2 4"/><text x="${m.l - 10}" y="${Y(t) + 4}" fill="${c.muted}" font-size="${fs}" text-anchor="end" font-family="Mono">${fmt(t)}</text>`;
    g += `<line x1="${m.l}" x2="${w - m.r}" y1="${h - m.b}" y2="${h - m.b}" stroke="${c.muted}" stroke-opacity=".6"/>`;
    const title = (a) => { const notes = [a.unit, o.kind === 'log' && !o.short ? 'LOG SCALE' : null].filter(Boolean); return notes.length ? `${a.title} (${notes.join(', ')})` : a.title; };
    g += `<text x="${(m.l + w - m.r) / 2}" y="${h - 6}" fill="${c.muted}" font-size="${fs - 1}" letter-spacing="2" text-anchor="middle" font-family="Mono">${title(o.x)}</text>`;
    g += `<text transform="translate(${m.l - (o.yTitleGap || 46)} ${(m.t + h - m.b) / 2}) rotate(-90)" fill="${c.muted}" font-size="${fs - 1}" letter-spacing="2" text-anchor="middle" font-family="Mono">${title(o.y)}</text>`;
    let clip = '';
    if (o.ref != null) clip += `<line x1="${m.l}" x2="${w - m.r}" y1="${Y(o.ref)}" y2="${Y(o.ref)}" stroke="${c.text}" stroke-opacity=".55" stroke-dasharray="5 5"/>`;
    for (const f of o.fits || []) {
      let d = '', on = false;
      for (let i = 0; i <= 160; i++) {
        const v = o.x.min * (o.x.max / o.x.min) ** (i / 160), y = f.f(v);
        if (y > 0) { d += `${on ? 'L' : 'M'}${X(v).toFixed(1)} ${Y(y).toFixed(1)}`; on = true; } else on = false;
      }
      clip += `<path d="${d}" fill="none" stroke="${f.color}" stroke-width="${f.width || 1.6}" ${f.dash ? `stroke-dasharray="${f.dash}"` : ''}/>`;
    }
    for (const p of o.points) clip += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${o.r || 4}" fill="none" stroke="${c.text}" stroke-width="1.2"/>`;
    for (const p of o.planned || []) clip += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${(o.r || 4) + 1.5}" fill="${c.acc}" fill-opacity=".25" stroke="${c.acc}" stroke-width="1.2"/>`;
    g += `<g clip-path="url(#clip${o.id})">${clip}</g>`;
    for (const [name, dx, dy] of o.labels || []) {
      const p = [...o.points, ...(o.planned || [])].find((q) => q.n === name);
      const px = X(p.x), py = Y(p.y);
      g += `<line x1="${px}" y1="${py}" x2="${px + dx}" y2="${py + dy}" stroke="${c.muted}"/><circle cx="${px}" cy="${py}" r="8" fill="none" stroke="${c.muted}"/>`;
      g += `<text x="${px + dx + (dx < 0 ? -6 : 6)}" y="${py + dy + 4}" fill="${c.text}" font-size="${fs}" text-anchor="${dx < 0 ? 'end' : 'start'}" font-family="Mono">${name.toUpperCase()} · ${fmt(p.x)} M → ${fmt(+p.y.toFixed(1))}${o.yUnit ?? ' MM'}</text>`;
    }
    if (o.hl) {
      const p = o.hl, px = X(p.x), py = Y(p.y), bw = o.hl.w || 210;
      g += `<line x1="${px}" y1="${py}" x2="${px}" y2="${h - m.b}" stroke="${c.acc}" stroke-dasharray="2 3"/><line x1="${m.l}" y1="${py}" x2="${px}" y2="${py}" stroke="${c.acc}" stroke-dasharray="2 3"/>`;
      g += `<circle cx="${px}" cy="${py}" r="5" fill="${c.acc}"/><circle cx="${px}" cy="${py}" r="11" fill="none" stroke="${c.acc}"/>`;
      const bx = p.left ? px - bw - 14 : px + 14, by = p.below ? py + 16 : py - 66;
      g += `<g transform="translate(${bx} ${by})"><rect width="${bw}" height="50" fill="${c.bg}" stroke="${c.line}" stroke-dasharray="3 3"/><text x="10" y="20" fill="${c.text}" font-family="Mono" font-size="11" font-weight="600" letter-spacing="1">${p.n.toUpperCase()}</text><text x="10" y="38" fill="${c.muted}" font-family="Mono" font-size="11">${fmt(p.x)} m → <tspan fill="${c.acc}">${p.yText || fmt(+p.y.toFixed(1)) + ' mm'}</tspan></text></g>`;
    }
    return `<svg style="overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
  };

  /** Wireframe globe cap: limb, lat/long lines, gauge ticks. Returns SVG markup for a strip of width w. */
  window.globe = function ({ w, h, top, R, c, tickStep = 2 }) {
    const cx = w / 2, cy = top + R, tilt = 0.32;
    const P = (lat, lon) => { const x = R * Math.cos(lat) * Math.sin(lon), y = R * Math.sin(lat), z = R * Math.cos(lat) * Math.cos(lon);
      return [cx + x, cy - (y * Math.cos(tilt) - z * Math.sin(tilt)), y * Math.sin(tilt) + z * Math.cos(tilt)]; };
    const seg = (pts) => { let d = '', on = false; for (const [x, y, z] of pts) { if (z > 0 && y < h) { d += `${on ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; on = true; } else on = false; } return d; };
    let s = `<defs><linearGradient id="gfill" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${h}"><stop offset=".2" stop-color="${c.bg2}" stop-opacity=".9"/><stop offset="1" stop-color="${c.bg2}" stop-opacity="0"/></linearGradient>
      <linearGradient id="gfade" gradientUnits="userSpaceOnUse" x1="0" y1="${top + (h - top) * 0.45}" x2="0" y2="${h}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="gmask"><rect width="${w}" height="${h}" fill="url(#gfade)"/></mask></defs>`;
    let g = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#gfill)"/>`;
    for (let la = 30; la <= 85; la += 5) { const pts = []; for (let lo = -180; lo <= 180; lo += 1.5) pts.push(P(la * Math.PI / 180, lo * Math.PI / 180)); g += `<path d="${seg(pts)}" fill="none" stroke="${c.line}"/>`; }
    for (let lo = -180; lo < 180; lo += 10) { const pts = []; for (let la = 15; la <= 90; la += 1) pts.push(P(la * Math.PI / 180, lo * Math.PI / 180)); g += `<path d="${seg(pts)}" fill="none" stroke="${c.line}"/>`; }
    s += `<g mask="url(#gmask)">${g}</g>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${c.text}" stroke-opacity=".7"/><circle cx="${cx}" cy="${cy}" r="${R + 10}" fill="none" stroke="${c.line}" stroke-dasharray="2 5"/>`;
    const span = Math.asin(Math.min(1, (w / 2) / R)) * 180 / Math.PI;
    for (let a = -Math.floor(span); a <= span; a += tickStep) { const t = (a - 90) * Math.PI / 180, big = a % 10 === 0, r2 = R + (big ? 20 : 11);
      s += `<line x1="${cx + (R + 5) * Math.cos(t)}" y1="${cy + (R + 5) * Math.sin(t)}" x2="${cx + r2 * Math.cos(t)}" y2="${cy + r2 * Math.sin(t)}" stroke="${c.muted}"/>`; }
    return s;
  };
})();
