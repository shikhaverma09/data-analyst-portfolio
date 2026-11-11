/* Interactive Sales Performance Dashboard (vanilla SVG, no libraries).
   Data is illustrative sample data generated deterministically below. */
(() => {
  const dash = document.getElementById('dash');
  if (!dash) return;

  const NS = 'http://www.w3.org/2000/svg';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const REGIONS = ['North', 'South', 'East', 'West'];
  const CATS = ['Technology', 'Furniture', 'Office Supplies'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sample data (seeded so it is identical on every load) ---------- */
  let seed = 20250101;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const regionW = { North: 1.1, South: 0.92, East: 0.8, West: 1.22 };
  const catW = { Technology: 1.3, Furniture: 1.0, 'Office Supplies': 0.78 };
  const margin = { Technology: 0.18, Furniture: 0.07, 'Office Supplies': 0.14 };
  const season = [0.78, 0.74, 0.92, 0.88, 0.95, 0.9, 0.86, 0.94, 1.05, 1.12, 1.32, 1.4];
  const DATA = [];
  MONTHS.forEach((m, mi) => REGIONS.forEach(r => CATS.forEach(c => {
    const sales = 42 * regionW[r] * catW[c] * season[mi] * (0.88 + rand() * 0.24) * (1 + mi * 0.012);
    let mg = margin[c] * (0.7 + rand() * 0.6);
    if (r === 'East' && c === 'Furniture') mg = -0.04 + rand() * 0.05; // a loss-making segment worth flagging
    DATA.push({ m: mi, region: r, cat: c, sales, profit: sales * mg, orders: Math.round(sales * (2.3 + rand() * 0.6)) });
  })));

  /* ---------- State ---------- */
  const state = { region: 'All', cat: 'All', metric: 'sales' };
  const metricName = () => (state.metric === 'sales' ? 'Sales' : 'Profit');
  const fmtK = v => `₹${Math.round(v).toLocaleString('en-IN')}K`;
  const fmtK1 = v => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}K`;
  const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);
  const filt = ({ region = state.region, cat = state.cat } = {}) =>
    DATA.filter(d => (region === 'All' || d.region === region) && (cat === 'All' || d.cat === cat));

  /* ---------- Helpers ---------- */
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const niceTicks = (lo, hi, count = 4) => {
    if (hi === lo) hi = lo + 1;
    const raw = (hi - lo) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => s >= raw);
    const t0 = Math.floor(lo / step) * step;
    const t1 = Math.ceil(hi / step) * step;
    const ticks = [];
    for (let t = t0; t <= t1 + step / 2; t += step) ticks.push(+t.toFixed(6));
    return ticks;
  };
  const shortK = v => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}M` : `${Math.round(v)}K`);
  // Bars: 4px rounded data-end, square at the baseline
  const vBar = (x, w, b, e) => {
    const r = Math.min(4, w / 2, Math.abs(b - e)); const s = e < b ? 1 : -1;
    return `M${x},${b}V${e + s * r}Q${x},${e} ${x + r},${e}H${x + w - r}Q${x + w},${e} ${x + w},${e + s * r}V${b}Z`;
  };
  const hBar = (y, h, b, e) => {
    const r = Math.min(4, h / 2, Math.abs(b - e)); const s = e > b ? -1 : 1;
    return `M${b},${y}H${e + s * r}Q${e},${y} ${e},${y + r}V${y + h - r}Q${e},${y + h} ${e + s * r},${y + h}H${b}Z`;
  };
  const tween = (from, to, fn, dur = 450) => {
    if (reduceMotion || !from) { fn(to); return; }
    const t0 = performance.now();
    const step = t => {
      const p = Math.max(0, Math.min(1, (t - t0) / dur));
      const e = 1 - Math.pow(1 - p, 3);
      fn(to.map((v, i) => (from[i] ?? 0) + (v - (from[i] ?? 0)) * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Tooltip ---------- */
  const tip = document.getElementById('tooltip');
  const showTip = (clientX, clientY, head, value, key) => {
    tip.replaceChildren();
    const h = document.createElement('div'); h.className = 'tt-head'; h.textContent = head;
    const b = document.createElement('b'); b.textContent = value;
    const k = document.createElement('div'); k.className = 'tt-key'; k.textContent = key;
    tip.append(h, b, k);
    tip.hidden = false;
    const box = dash.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    const x = Math.max(half + 4, Math.min(box.width - half - 4, clientX - box.left));
    let y = clientY - box.top;
    if (y - tip.offsetHeight - 14 < 0) y += tip.offsetHeight + 30;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  };
  const hideTip = () => { tip.hidden = true; };

  /* ---------- Trend chart (area + line, crosshair) ---------- */
  const trend = (() => {
    const host = document.getElementById('trendChart');
    let svg, W, H = 220, M = { t: 12, r: 12, b: 26, l: 46 }, gGrid, area, line, cross, dot, hit, xLabels, prev, cur, idx = -1;
    const x = i => M.l + (i * (W - M.l - M.r)) / 11;
    let y = () => 0;
    const build = () => {
      W = Math.max(280, host.clientWidth);
      H = W < 420 ? 190 : 220;
      host.replaceChildren();
      svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', tabindex: 0, 'aria-label': 'Monthly trend chart. Use left and right arrow keys to read each month.' }, host);
      gGrid = el('g', {}, svg);
      area = el('path', { class: 'area' }, svg);
      line = el('path', { class: 'line' }, svg);
      cross = el('line', { class: 'cross', y1: M.t, y2: H - M.b, visibility: 'hidden' }, svg);
      dot = el('circle', { class: 'dot', r: 4.5, visibility: 'hidden' }, svg);
      xLabels = el('g', {}, svg);
      const every = W < 480 ? 2 : 1;
      MONTHS.forEach((m, i) => {
        if (i % every) return;
        const t = el('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }, xLabels); t.textContent = m;
      });
      hit = el('rect', { x: M.l - 10, y: M.t, width: W - M.l - M.r + 20, height: H - M.t - M.b, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', e => {
        const pt = svg.getBoundingClientRect();
        const px = ((e.clientX - pt.left) / pt.width) * W;
        focus(Math.round(((px - M.l) / (W - M.l - M.r)) * 11), e.clientX);
      });
      hit.addEventListener('pointerleave', blur);
      svg.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          focus(Math.max(0, Math.min(11, (idx < 0 ? 0 : idx) + (e.key === 'ArrowRight' ? 1 : -1))));
        }
      });
      svg.addEventListener('focus', () => focus(idx < 0 ? 11 : idx));
      svg.addEventListener('blur', blur);
    };
    const draw = vals => {
      cur = vals;
      const lo = Math.min(0, ...vals), hi = Math.max(...vals);
      const ticks = niceTicks(lo, hi * 1.05, 4);
      const d0 = ticks[0], d1 = ticks[ticks.length - 1];
      y = v => M.t + (1 - (v - d0) / (d1 - d0)) * (H - M.t - M.b);
      gGrid.replaceChildren();
      ticks.forEach(t => {
        el('line', { class: t === 0 ? 'base' : 'grid', x1: M.l, x2: W - M.r, y1: y(t), y2: y(t) }, gGrid);
        const lbl = el('text', { x: M.l - 8, y: y(t) + 4, 'text-anchor': 'end' }, gGrid); lbl.textContent = shortK(t);
      });
      const pts = vals.map((v, i) => `${x(i)},${y(v)}`);
      line.setAttribute('d', `M${pts.join('L')}`);
      area.setAttribute('d', `M${x(0)},${y(0)}L${pts.join('L')}L${x(11)},${y(0)}Z`);
      if (idx >= 0) place(idx);
    };
    const place = i => {
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
      dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(cur[i]));
    };
    const focus = (i, clientX) => {
      i = Math.max(0, Math.min(11, i)); idx = i;
      place(i);
      cross.setAttribute('visibility', 'visible'); dot.setAttribute('visibility', 'visible');
      const r = dot.getBoundingClientRect();
      showTip(clientX ?? r.left + r.width / 2, r.top, `${MONTHS[i]} 2025`, fmtK1(cur[i]), metricName());
    };
    const blur = () => { idx = -1; cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); hideTip(); };
    return {
      update(vals, animate = true) {
        if (!svg) build();
        tween(animate ? prev : null, vals, draw);
        prev = vals;
      },
      rebuild() { svg = null; build(); draw(prev); },
    };
  })();

  /* ---------- Bar chart factory (vertical or horizontal), click to cross-filter ---------- */
  const barChart = (hostId, keys, orient, onPick) => {
    const host = document.getElementById(hostId);
    let svg, W, H, M, gGrid, bars = [], hits = [], vlabels = [], prev, cur, selected = 'All';
    const build = () => {
      W = Math.max(240, host.clientWidth);
      if (orient === 'v') { H = 200; M = { t: 18, r: 8, b: 26, l: 40 }; }
      else { H = 24 + keys.length * 44; M = { t: 8, r: 58, b: 8, l: 104 }; }
      host.replaceChildren(); bars = []; hits = []; vlabels = [];
      svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, host);
      gGrid = el('g', {}, svg);
      keys.forEach((k, i) => {
        const g = el('g', {}, svg);
        const hitR = el('rect', { class: 'hit', tabindex: 0, role: 'button', 'aria-label': k }, g);
        const bar = el('path', { class: 'bar' }, g);
        const vl = el('text', { class: 'lbl', 'text-anchor': orient === 'v' ? 'middle' : 'start' }, g);
        const kl = el('text', { 'text-anchor': orient === 'v' ? 'middle' : 'end' }, g); kl.textContent = k;
        kl.dataset.key = k;
        const enter = e => {
          bar.classList.add('is-hover');
          const total = cur.reduce((a, b) => a + b, 0);
          const share = total ? ` · ${Math.round((cur[i] / total) * 100)}% of total` : '';
          const r = bar.getBoundingClientRect();
          showTip(e?.clientX ?? r.left + r.width / 2, e?.clientY ?? r.top, k, fmtK1(cur[i]), metricName() + share);
        };
        const leave = () => { bar.classList.remove('is-hover'); hideTip(); };
        hitR.addEventListener('pointermove', enter);
        hitR.addEventListener('pointerleave', leave);
        hitR.addEventListener('focus', () => enter());
        hitR.addEventListener('blur', leave);
        hitR.addEventListener('click', () => onPick(selected === k ? 'All' : k));
        hitR.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(selected === k ? 'All' : k); } });
        bars.push(bar); hits.push(hitR); vlabels.push({ vl, kl });
      });
    };
    const draw = vals => {
      cur = vals;
      const lo = Math.min(0, ...vals), hi = Math.max(...vals);
      const ticks = niceTicks(lo, hi * 1.08, orient === 'v' ? 4 : 3);
      const d0 = ticks[0], d1 = ticks[ticks.length - 1];
      gGrid.replaceChildren();
      const n = keys.length;
      if (orient === 'v') {
        const s = v => M.t + (1 - (v - d0) / (d1 - d0)) * (H - M.t - M.b);
        ticks.forEach(t => {
          el('line', { class: t === 0 ? 'base' : 'grid', x1: M.l, x2: W - M.r, y1: s(t), y2: s(t) }, gGrid);
          const l = el('text', { x: M.l - 8, y: s(t) + 4, 'text-anchor': 'end' }, gGrid); l.textContent = shortK(t);
        });
        const band = (W - M.l - M.r) / n, bw = Math.min(56, band * 0.56);
        vals.forEach((v, i) => {
          const cx = M.l + band * i + band / 2;
          bars[i].setAttribute('d', vBar(cx - bw / 2, bw, s(0), s(v)));
          Object.entries({ x: M.l + band * i + 2, y: M.t, width: band - 4, height: H - M.t - M.b }).forEach(([a, b]) => hits[i].setAttribute(a, b));
          const { vl, kl } = vlabels[i];
          vl.setAttribute('x', cx); vl.setAttribute('y', v >= 0 ? s(v) - 6 : s(v) + 14); vl.textContent = shortK(v);
          kl.setAttribute('x', cx); kl.setAttribute('y', H - 8);
        });
      } else {
        const s = v => M.l + ((v - d0) / (d1 - d0)) * (W - M.l - M.r);
        ticks.forEach(t => {
          // every bar carries a direct value label, so only the zero baseline is drawn here
          if (t === 0) el('line', { class: 'base', y1: M.t, y2: H - M.b, x1: s(t), x2: s(t) }, gGrid);
        });
        const band = (H - M.t - M.b) / n, bh = Math.min(24, band * 0.6);
        vals.forEach((v, i) => {
          const cy = M.t + band * i + band / 2;
          bars[i].setAttribute('d', hBar(cy - bh / 2, bh, s(0), s(v)));
          Object.entries({ x: 0, y: M.t + band * i + 1, width: W, height: band - 2 }).forEach(([a, b]) => hits[i].setAttribute(a, b));
          const { vl, kl } = vlabels[i];
          vl.setAttribute('x', Math.max(s(0), s(v)) + 6); vl.setAttribute('y', cy + 4); vl.textContent = shortK(v);
          kl.setAttribute('x', M.l - 10); kl.setAttribute('y', cy + 4);
        });
      }
      bars.forEach((b, i) => b.style.opacity = selected === 'All' || selected === keys[i] ? 1 : 0.35);
    };
    return {
      update(vals, sel, animate = true) {
        if (!svg) build();
        selected = sel;
        hits.forEach((h, i) => h.setAttribute('aria-pressed', String(sel === keys[i])));
        tween(animate ? prev : null, vals, draw);
        prev = vals;
      },
      rebuild() { svg = null; build(); draw(prev); },
    };
  };

  /* ---------- Controls ---------- */
  const setSeg = (groupId, attr, value) => {
    document.querySelectorAll(`#${groupId} button`).forEach(b => {
      const on = b.dataset[attr] === value;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', String(on));
    });
  };
  const pickRegion = r => { state.region = r; setSeg('regionFilter', 'region', r); render(); };
  const pickCat = c => { state.cat = c; document.getElementById('catFilter').value = c; render(); };

  document.getElementById('regionFilter').addEventListener('click', e => {
    const b = e.target.closest('button'); if (b) pickRegion(b.dataset.region);
  });
  document.getElementById('metricFilter').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.metric = b.dataset.metric; setSeg('metricFilter', 'metric', state.metric); render();
  });
  document.getElementById('catFilter').addEventListener('change', e => pickCat(e.target.value));

  const regionChart = barChart('regionChart', REGIONS, 'v', pickRegion);
  const catChart = barChart('catChart', CATS, 'h', pickCat);

  /* ---------- KPI tiles ---------- */
  const kpiPrev = {};
  const setKpi = (id, val, fmt) => {
    const node = document.getElementById(id);
    tween(kpiPrev[id] != null ? [kpiPrev[id]] : null, [val], ([v]) => { node.textContent = fmt(v); }, 500);
    kpiPrev[id] = val;
  };

  /* ---------- Table view ---------- */
  const tableBox = document.getElementById('dataTable');
  const chartsBox = document.getElementById('charts');
  const renderTable = rows => {
    const table = document.createElement('table');
    const thead = table.createTHead().insertRow();
    ['Month', 'Sales (₹K)', 'Profit (₹K)', 'Margin', 'Orders'].forEach(h => {
      const th = document.createElement('th'); th.textContent = h; thead.appendChild(th);
    });
    const tb = table.createTBody();
    const addRow = (target, cells) => { const tr = target.insertRow(); cells.forEach(c => { tr.insertCell().textContent = c; }); };
    MONTHS.forEach((m, i) => {
      const r = rows.filter(d => d.m === i);
      const s = sum(r, 'sales'), p = sum(r, 'profit');
      addRow(tb, [m, s.toFixed(1), p.toFixed(1), `${((p / s) * 100).toFixed(1)}%`, sum(r, 'orders').toLocaleString('en-IN')]);
    });
    const s = sum(rows, 'sales'), p = sum(rows, 'profit');
    addRow(table.createTFoot(), ['Total', s.toFixed(1), p.toFixed(1), `${((p / s) * 100).toFixed(1)}%`, sum(rows, 'orders').toLocaleString('en-IN')]);
    tableBox.replaceChildren(table);
  };
  const tableBtn = document.getElementById('tableToggle');
  tableBtn.addEventListener('click', () => {
    const on = tableBtn.getAttribute('aria-pressed') !== 'true';
    tableBtn.setAttribute('aria-pressed', String(on));
    tableBtn.querySelector('span').textContent = on ? 'Chart view' : 'Table view';
    tableBox.hidden = !on; chartsBox.hidden = on;
    if (on) renderTable(filt()); else { trend.rebuild(); regionChart.rebuild(); catChart.rebuild(); }
  });

  /* ---------- Insight text (built with text nodes) ---------- */
  const insightEl = document.getElementById('insight');
  const writeInsight = parts => {
    insightEl.replaceChildren();
    parts.forEach(p => {
      if (typeof p === 'string') insightEl.append(p);
      else { const b = document.createElement('b'); b.textContent = p.b; insightEl.append(b); }
    });
  };

  /* ---------- Render ---------- */
  let first = true;
  function render() {
    const rows = filt();
    const k = state.metric;
    const monthly = MONTHS.map((_, i) => sum(rows.filter(d => d.m === i), k));
    const byRegion = REGIONS.map(r => sum(filt({ region: r }), k)); // cross-filter: ignores region selection
    const byCat = CATS.map(c => sum(filt({ cat: c }), k));          // cross-filter: ignores category selection

    const s = sum(rows, 'sales'), p = sum(rows, 'profit');
    setKpi('kSales', s, fmtK);
    setKpi('kProfit', p, fmtK);
    setKpi('kMargin', s ? (p / s) * 100 : 0, v => `${v.toFixed(1)}%`);
    setKpi('kOrders', sum(rows, 'orders'), v => Math.round(v).toLocaleString('en-IN'));

    const name = metricName();
    document.getElementById('trendTitle').textContent = `Monthly ${name.toLowerCase()}`;
    document.getElementById('regionTitle').textContent = `${name} by region`;
    document.getElementById('catTitle').textContent = `${name} by category`;

    if (chartsBox.hidden) renderTable(rows);
    else {
      chartsBox.style.opacity = 1;
      trend.update(monthly, !first);
      regionChart.update(byRegion, state.region, !first);
      catChart.update(byCat, state.cat, !first);
    }

    // Insight
    const peak = monthly.indexOf(Math.max(...monthly));
    const q4 = monthly.slice(9).reduce((a, b) => a + b, 0) / monthly.reduce((a, b) => a + b, 0);
    const parts = [`Insight: `, { b: `${MONTHS[peak]}` }, ` is the peak month for ${name.toLowerCase()}, and Q4 drives `, { b: `${Math.round(q4 * 100)}%` }, ` of the year. `];
    const losers = [];
    REGIONS.forEach(r => CATS.forEach(c => {
      if ((state.region === 'All' || state.region === r) && (state.cat === 'All' || state.cat === c)) {
        const seg = DATA.filter(d => d.region === r && d.cat === c);
        const sp = sum(seg, 'profit') / sum(seg, 'sales');
        if (sp < 0.02) losers.push(`${c} in ${r}`);
      }
    }));
    if (losers.length) parts.push(`⚠ `, { b: losers.join(', ') }, ` is barely profitable — worth reviewing discounts and pricing.`);
    else {
      const best = CATS.map(c => { const r = filt({ cat: c }); return [c, sum(r, 'profit') / (sum(r, 'sales') || 1)]; }).sort((a, b) => b[1] - a[1])[0];
      parts.push({ b: best[0] }, ` has the healthiest margin at ${(best[1] * 100).toFixed(1)}%.`);
    }
    writeInsight(parts);
    first = false;
  }

  /* Render lazily when the dashboard approaches the viewport */
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { render(); io.disconnect(); }
  }, { rootMargin: '200px' });
  io.observe(dash);

  /* Re-layout on resize (debounced) */
  let rt, lastW = dash.clientWidth;
  new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (first || chartsBox.hidden || dash.clientWidth === lastW) return;
      lastW = dash.clientWidth;
      trend.rebuild(); regionChart.rebuild(); catChart.rebuild();
    }, 120);
  }).observe(dash);
})();
