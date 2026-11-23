/* shell.js — workspace router, merged overview and cross-ledger dossier. */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const money = n => 'Tk ' + Math.round(n || 0).toLocaleString('en-IN');
  const num = n => (n || 0).toLocaleString('en-IN');
  const tb = n => {
    n = n || 0;
    if (n >= 10000000) return 'Tk ' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000) return 'Tk ' + (n / 100000).toFixed(2) + ' L';
    if (n >= 1000) return 'Tk ' + (n / 1000).toFixed(0) + 'k';
    return 'Tk ' + n.toLocaleString('en-IN');
  };
  const pct = (a, b) => b ? (a / b * 100) : 0;
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const TITLES = {
    overview: ['Unified fleet overview', 'Two ledgers. One device truth.'],
    lookup:   ['Cross-ledger lookup', 'One serial. Both evidence trails.'],
    devices:  ['NSpector workspace', 'Device ledger & reasoning.'],
    imei:     ['AMAYA workspace', 'IMEI Control Center.'],
    sources:  ['Provenance', 'Data sources & methodology.']
  };

  const STATE_ORDER = ['Sold Delivered', 'Stock Transfer', 'Service', 'Return', 'Bad Bin', 'Pending Hold', 'Unknown'];

  let overview = null;
  let sources = null;
  let current = 'overview';
  let lookupSeq = 0;
  let suggestSeq = 0;
  let suggestIndex = -1;
  let suggestRows = [];
  let suggestInput = null;

  // Electron's main window uses contextIsolation — never touch Node globals here.
  // The desktop build exposes a tiny, audited bridge via preload.js.
  const desktop = !!(window.amayaShell && window.amayaShell.isDesktop);

  async function api(p, o) {
    const r = await fetch(p, o);
    if (!r.ok) {
      let detail = '';
      try { const j = await r.json(); if (j.error) detail = ' · ' + j.error; } catch (e) {}
      throw new Error('HTTP ' + r.status + detail);
    }
    return r.json();
  }

  function toast(msg, type) {
    const t = $('#toast');
    t.textContent = msg;
    if (type) t.dataset.type = type; else delete t.dataset.type;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), type === 'error' ? 4200 : 2800);
  }
  window.SuiteToast = toast;

  // ---------------------------------------------------------------- router
  function showWorkspace(name, fromHistory) {
    if (!TITLES[name]) name = 'overview';
    current = name;
    hideSuggestions();
    $$('#railnav button').forEach(b => {
      const on = b.dataset.ws === name;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $$('.workspace').forEach(w => w.classList.toggle('active', w.dataset.ws === name));
    const [eyebrow, title] = TITLES[name];
    $('#ws-eyebrow').textContent = eyebrow;
    $('#ws-title').textContent = title;
    document.title = title + ' · AMAYA × NSpector';
    document.body.classList.toggle('ws-imei-active', name === 'imei');
    if (!fromHistory) {
      const target = '#' + name;
      try { if (location.hash !== target) history.pushState({ ws:name }, '', target); } catch (e) {}
    }
    window.scrollTo({ top:0, behavior:'auto' });
    if (name === 'overview') loadOverview();
    if (name === 'lookup') setTimeout(() => $('#lookup-q').focus(), 40);
    if (name === 'devices' && window.NSpectorUI) window.NSpectorUI.refreshAll();
    if (name === 'imei') renderAmaWorkspace();
    if (name === 'sources') loadSources();
  }

  window.addEventListener('popstate', () => {
    const h = (location.hash || '').replace('#', '');
    showWorkspace(TITLES[h] ? h : 'overview', true);
  });

  $$('#railnav button').forEach(b => b.addEventListener('click', () => showWorkspace(b.dataset.ws)));
  $('.rail-brand').addEventListener('click', () => showWorkspace('overview'));

  document.addEventListener('click', e => {
    const go = e.target.closest('[data-goto]');
    if (go) { showWorkspace(go.dataset.goto); return; }
    const look = e.target.closest('[data-serial]');
    if (look && !look.classList.contains('suggest-item')) { e.preventDefault(); openLookup(look.dataset.serial); }
  });

  // ---------------------------------------------------------------- global search
  $('#global-search').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#gs-q').value.trim();
    if (!q) return;
    openLookup(suggestRows[suggestIndex] ? suggestRows[suggestIndex].serial : q);
  });

  function openLookup(serial) {
    hideSuggestions();
    showWorkspace('lookup');
    $('#lookup-q').value = serial || '';
    if (serial) runLookup(serial);
  }

  // ---------------------------------------------------------------- typeahead
  function suggestBox(input) {
    return input.id === 'gs-q' ? $('#gs-suggest') : $('#lk-suggest');
  }

  function suggestKeys(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!suggestRows.length) return;
      e.preventDefault();
      suggestIndex += (e.key === 'ArrowDown' ? 1 : -1);
      if (suggestIndex < 0) suggestIndex = suggestRows.length - 1;
      if (suggestIndex >= suggestRows.length) suggestIndex = 0;
      paintSuggestions(suggestInput);
    } else if (e.key === 'Enter' && suggestIndex >= 0 && suggestRows[suggestIndex]) {
      e.preventDefault();
      openLookup(suggestRows[suggestIndex].serial);
    } else if (e.key === 'Escape') {
      if (suggestInput && !suggestBox(suggestInput).hidden) { e.stopPropagation(); hideSuggestions(); }
      else { e.target.value = ''; e.target.blur(); }
    }
  }

  function hideSuggestions() {
    ['#gs-suggest', '#lk-suggest'].forEach(s => {
      const box = $(s);
      if (box) { box.hidden = true; box.innerHTML = ''; }
    });
    ['#gs-q', '#lookup-q'].forEach(s => {
      const el = $(s);
      if (el) {
        el.setAttribute('aria-expanded', 'false');
        el.removeAttribute('aria-activedescendant');
      }
    });
    suggestRows = []; suggestIndex = -1; suggestInput = null;
  }

  function paintSuggestions(input) {
    const box = suggestBox(input);
    if (!box || !suggestRows.length) { hideSuggestions(); return; }
    const prefix = input.id === 'gs-q' ? 'gs' : 'lk';
    box.innerHTML =
      '<div class="suggest-head"><span>Matching devices</span><em>' + suggestRows.length + ' found</em></div>' +
      suggestRows.map((r, i) => `
        <button type="button" id="${prefix}-opt-${i}" class="suggest-item ${i === suggestIndex ? 'active' : ''}"
                role="option" aria-selected="${i === suggestIndex}" data-serial="${esc(r.serial)}"
                data-presence="${r.inNs && r.inAmaya ? 'both' : r.inNs ? 'nspector' : 'amaya'}">
          <i class="src-dot ${r.inNs && r.inAmaya ? 'both' : r.inNs ? 'nspector' : 'amaya'}"></i>
          <span class="s-body"><b>${esc(r.serial)}</b><small>${esc(r.family || (r.amaya && r.amaya.product) || (r.inAmaya ? 'AMAYA asset' : 'NSpector dispatch'))}</small></span>
          <em>${r.inNs && r.inAmaya ? 'both' : r.inNs ? 'NS' : 'AM'}</em>
        </button>`).join('');
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (suggestIndex >= 0) input.setAttribute('aria-activedescendant', prefix + '-opt-' + suggestIndex);
    else input.removeAttribute('aria-activedescendant');
  }

  async function runSuggestions(input) {
    const q = input.value.trim();
    if (q.length < 3) { hideSuggestions(); return; }
    const seq = ++suggestSeq;
    suggestInput = input;
    try {
      const data = await api('/api/combo/search?q=' + encodeURIComponent(q) + '&limit=8');
      if (seq !== suggestSeq || document.activeElement !== input) return;
      suggestRows = data.rows || [];
      suggestIndex = suggestRows.length ? 0 : -1;
      const box = suggestBox(input);
      if (!suggestRows.length) {
        box.innerHTML = '<div class="suggest-empty"><b>No devices found</b>Try a different IMEI or serial.</div>';
        box.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        input.removeAttribute('aria-activedescendant');
      } else paintSuggestions(input);
    } catch (e) { /* typing must never surface a disruptive error */ }
  }

  function bindSuggest(input) {
    input.addEventListener('input', () => {
      clearTimeout(input._suggestTimer);
      input._suggestTimer = setTimeout(() => runSuggestions(input), 140);
    });
    input.addEventListener('focus', () => { if (input.value.trim().length >= 3) runSuggestions(input); });
    input.addEventListener('blur', () => setTimeout(() => {
      if (document.activeElement !== input && !suggestBox(input).contains(document.activeElement)) hideSuggestions();
    }, 180));
    input.addEventListener('keydown', suggestKeys);
  }
  bindSuggest($('#gs-q'));
  bindSuggest($('#lookup-q'));
  document.addEventListener('click', e => {
    const item = e.target.closest('.suggest-item[data-serial]');
    if (item) { e.preventDefault(); openLookup(item.dataset.serial); return; }
    if (!e.target.closest('.suggest') && !e.target.closest('#global-search') && !e.target.closest('.lookup-form')) hideSuggestions();
  });

  // ---------------------------------------------------------------- keyboard
  function keyboard(e) {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const global = $('#gs-q');
      global.focus(); global.select();
      return;
    }
    if (e.key === '?' && !typing) { e.preventDefault(); openShortcuts(); return; }
    if (e.key === '/' && !typing) {
      e.preventDefault(); showWorkspace('lookup'); $('#lookup-q').focus(); return;
    }
    if (e.key === 'Escape') {
      const sheet = $('#sheet');
      if (sheet.classList.contains('open')) {
        if (window.NSpectorUI && window.NSpectorUI.closeFindingSheet) window.NSpectorUI.closeFindingSheet();
        else sheet.classList.remove('open');
        return;
      }
      const dlg = $('#shortcuts');
      if (dlg && dlg.open) { closeShortcuts(); return; }
    }
    if (!typing && !meta && /^[1-5]$/.test(e.key)) {
      e.preventDefault();
      showWorkspace(['overview', 'lookup', 'devices', 'imei', 'sources'][Number(e.key) - 1]);
    }
  }
  document.addEventListener('keydown', keyboard);

  function openShortcuts() {
    const dlg = $('#shortcuts');
    if (!dlg) return;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }
  function closeShortcuts() {
    const dlg = $('#shortcuts');
    if (dlg && typeof dlg.close === 'function') dlg.close();
    else if (dlg) dlg.removeAttribute('open');
  }
  $('#shortcuts-btn').addEventListener('click', openShortcuts);
  $('#shortcuts-close').addEventListener('click', closeShortcuts);
  $('#shortcuts').addEventListener('click', e => { if (e.target.id === 'shortcuts') closeShortcuts(); });

  // ---------------------------------------------------------------- overview
  async function loadOverview(force) {
    if (overview && !force) return renderOverview();
    try {
      overview = await api('/api/combo/overview');
    } catch (e) {
      $('#ov-kpis').innerHTML = `<div class="kpi error">Overview data unavailable<span>${esc(e.message)}</span>
        <button class="retry-btn" id="ov-retry">Try again</button></div>`;
      ['#ov-recon-body', '#ov-amaya-body', '#ov-ns-body', '#ov-critical-body', '#ov-sources-body'].forEach(sel => {
        const el = $(sel);
        if (el) el.innerHTML = '<p class="hint">Waiting for a successful overview load.</p>';
      });
      const retry = $('#ov-retry');
      if (retry) retry.addEventListener('click', () => { retry.disabled = true; loadOverview(true); });
      return;
    }
    renderOverview();
  }

  function renderOverview() {
    const d = overview;
    if (!d) return;
    const ns = d.ns || {}, st = ns.stats || {}, ex = ns.exposure || {};
    const a = d.amaya || {};
    const ov = d.overlap || {};

    const pctBoth = ov.union ? (ov.both / ov.union * 100) : 0;
    $('#ov-lede').innerHTML =
      `The NSpector dispatch ledger and the AMAYA IMEI Control Center now answer the same question together: ` +
      `<b>${num(ov.both)} IMEIs appear in both</b> — ${num(ov.union)} distinct devices across ${num(st.dispatches)} ` +
      `dispatch records and ${num(a.events)} workbook occurrences.`;

    const orb = $('#ov-orb');
    orb.style.setProperty('--p', pctBoth.toFixed(1) + '%');
    $('#ov-match-pct').textContent = pctBoth.toFixed(1) + '%';

    const kpis = [
      ['Distinct devices', num(ov.union), 'union of both ledgers', 'merged', ''],
      ['Matched in both', num(ov.both), `${num(ov.nsOnly)} NSpector-only · ${num(ov.amayaOnly)} AMAYA-only`, 'both', ''],
      ['NSpector findings', num(st.openFindings), `${num(st.findings)} total · ${tb(ex.open_total)} open exposure`, 'nspector', 'crit'],
      ['AMAYA conflicts', num(a.conflicts), `${num(a.repeatIds)} repeat IDs · ${num(a.reviewQueue)} in review queue`, 'amaya', 'warn'],
      ['NSpector serials', num(st.uniqueSerials), `${num(st.dispatches)} dispatch rows · ${num(st.dealers)} dealers`, 'nspector', ''],
      ['AMAYA assets', num(a.assets), `${num(a.events)} events · ${Object.keys(a.sources || {}).length} workbooks`, 'amaya', 'acc']
    ];
    $('#ov-kpis').innerHTML = kpis.map(([label, value, sub, source, tone]) => `
      <div class="kpi ${tone}">
        <div class="kpi-top"><span>${esc(label)}</span><i class="src-dot ${source}"></i></div>
        <strong>${value}</strong>
        <small>${esc(sub)}</small>
      </div>`).join('');

    // reconciliation
    const rows = [
      ['Both ledgers', ov.both, 'both', 'match'],
      ['NSpector only', ov.nsOnly, 'nspector', 'ns'],
      ['AMAYA only', ov.amayaOnly, 'amaya', 'amaya']
    ];
    const max = Math.max(1, ov.both || 0, ov.nsOnly || 0, ov.amayaOnly || 0);
    $('#ov-recon-body').innerHTML = `
      <div class="split-list">
        ${rows.map(([label, n, cls, kind]) => `
          <div class="split-row">
            <span class="split-lab"><i class="src-dot ${cls}"></i>${esc(label)}</span>
            <span class="split-track"><i class="${kind}" style="width:${(n / max * 100).toFixed(1)}%"></i></span>
            <b>${num(n)}</b>
          </div>`).join('')}
      </div>
      <div class="overlap-sample">
        <span class="eyebrow">Sample exact matches</span>
        <div class="chip-row">
          ${(ov.sample || []).map(s => `<button class="mono-chip" data-serial="${esc(s)}">${esc(s)}</button>`).join('') ||
            '<span class="hint">No exact matches in this snapshot.</span>'}
        </div>
      </div>`;

    // amaya panel
    const sc = a.stateCounts || {};
    const maxState = Math.max(1, ...Object.values(sc));
    $('#ov-amaya-body').innerHTML = `
      <div class="mini-bars">
        ${STATE_ORDER.filter(k => sc[k] != null).map(k => `
          <div class="mini-bar">
            <span>${esc(k)}</span>
            <i><b class="state-${slug(k)}" style="width:${(sc[k] / maxState * 100).toFixed(1)}%"></b></i>
            <em>${num(sc[k])}</em>
          </div>`).join('')}
      </div>
      <div class="mini-meta">
        <span>Snapshot <b>${esc(a.dataVersion || '—')}</b></span>
        <span>Built <b>${esc((a.builtAt || '').slice(0, 10) || '—')}</b></span>
      </div>
      <button class="wide-btn" data-goto="imei">Open IMEI Control Center →</button>`;

    // ns panel
    const byKind = (ns.byKind || []).slice(0, 5);
    const maxKind = Math.max(1, ...byKind.map(x => x.n));
    $('#ov-ns-body').innerHTML = `
      <div class="mini-bars">
        ${byKind.map(x => `
          <div class="mini-bar">
            <span>${esc(KIND_LABEL(x.kind))}</span>
            <i><b class="ns" style="width:${(x.n / maxKind * 100).toFixed(1)}%"></b></i>
            <em>${num(x.n)}</em>
          </div>`).join('')}
      </div>
      <div class="mini-meta">
        <span>Dispatches <b>${num(st.dispatches)}</b></span>
        <span>Returns <b>${num(st.returns)}</b></span>
        <span>Dealers <b>${num(st.dealers)}</b></span>
      </div>
      <button class="wide-btn" data-goto="devices">Open device ledger →</button>`;

    // critical
    const list = ns.topCritical || [];
    $('#ov-critical-body').innerHTML = list.length ? list.map(f => `
      <div class="critical-row" data-id="${f.id}" role="button" tabindex="0">
        <span class="sev-mark ${esc(f.severity)}"></span>
        <div class="critical-copy">
          <b>${esc(f.title)}</b>
          <span>${esc(f.serial || f.dealer || f.family || '')}${f.value_at_risk ? ' · ' + money(f.value_at_risk) : ''}</span>
        </div>
        <em>${num(f.score)}</em>
      </div>`).join('') : '<p class="hint">No open critical or high findings.</p>';

    // sources strip
    const srcCards = [
      ['NSpector', num(st.dispatches) + ' dispatch rows', 'SQLite ingest of 7 CSV / TXT exports', 'nspector', 'devices'],
      ['AMAYA Control Center', num(a.assets) + ' assets · ' + num(a.events) + ' events', 'Generated from ' + (a.generatedFrom || 'imei_deduplicated_ledger.xlsx'), 'amaya', 'imei'],
      ['Merged index', num(ov.both) + ' exact matches', 'Full IMEI equality, no fuzzy matching', 'both', 'lookup']
    ];
    $('#ov-sources-body').innerHTML = srcCards.map(([title, big, sub, cls, go]) => `
      <button class="source-card" data-goto="${go}">
        <span class="src-dot ${cls}"></span>
        <b>${esc(title)}</b>
        <strong>${esc(big)}</strong>
        <small>${esc(sub)}</small>
      </button>`).join('');
  }

  function KIND_LABEL(k) {
    return ({
      duplicate_cross: 'Two dealers',
      duplicate_multi: 'Three+ dealers',
      orphan_return: 'Never dispatched',
      imei_lock: 'IMEI lock / mismatch',
      no_serial_return: 'Return, no serial',
      luhn_invalid: 'Invalid check digit',
      tac_conflict: 'Prefix conflict'
    })[k] || k;
  }

  // critical rows open the same sheet NSpector uses
  document.addEventListener('click', e => {
    const row = e.target.closest('.critical-row[data-id]');
    if (!row) return;
    if (window.NSpectorUI) window.NSpectorUI.openFinding(Number(row.dataset.id));
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest && e.target.closest('.critical-row[data-id]');
    if (!row) return;
    e.preventDefault();
    if (window.NSpectorUI) window.NSpectorUI.openFinding(Number(row.dataset.id));
  });

  // ---------------------------------------------------------------- lookup / dossier
  $('#lookup-form').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#lookup-q').value.trim();
    if (!q) return;
    hideSuggestions();
    runLookup(q);
  });
  document.addEventListener('click', e => {
    const chip = e.target.closest('#lookup-try .chipbtn');
    if (!chip) return;
    $('#lookup-q').value = chip.dataset.s;
    runLookup(chip.dataset.s);
  });

  async function runLookup(serial) {
    const out = $('#lookup-out');
    const seq = ++lookupSeq;
    out.innerHTML = `<div class="panel glass"><div class="inline-load"><i></i><span>Reading both ledgers for ${esc(serial)}…</span></div></div>`;
    let d;
    try { d = await api('/api/combo/asset/' + encodeURIComponent(serial)); }
    catch (err) {
      if (seq === lookupSeq) out.innerHTML = `<div class="panel glass"><h3>Lookup failed</h3><p class="hint">${esc(err.message)}</p></div>`;
      return;
    }
    if (seq !== lookupSeq) return;
    renderDossier(d);
  }

  function presenceChip(p) {
    if (p === 'both') return '<span class="presence both">In both ledgers</span>';
    if (p === 'nspector') return '<span class="presence nspector">NSpector only</span>';
    if (p === 'amaya') return '<span class="presence amaya">AMAYA only</span>';
    return '<span class="presence none">Not found</span>';
  }

  function renderDossier(d) {
    const out = $('#lookup-out');
    const ns = d.ns || {};
    const a = d.amaya;
    const serial = d.serial;
    if (d.presence === 'none') {
      out.innerHTML = `
        <div class="panel glass empty-dossier">
          <div class="empty-glyph">∅</div>
          <h3>${esc(serial)} is not in either ledger</h3>
          <p class="hint">No dispatch, return, finding, asset or movement event carries this serial. Check for a typo, or note that the unit may predate both snapshots.</p>
          <div class="empty-actions">
            <button data-goto="devices">Open NSpector inspector</button>
            <button data-goto="imei">Search the Control Center</button>
          </div>
        </div>`;
      return;
    }

    const f0 = (ns.dispatches || [])[0];
    const price = ns.price;
    const nsFound = d.presence === 'both' || d.presence === 'nspector';
    const amFound = d.presence === 'both' || d.presence === 'amaya';

    const header = `
      <div class="dossier-head panel glass">
        <div class="dossier-id">
          <span class="eyebrow">Device dossier</span>
          <h2 class="mono">${esc(serial)}</h2>
          <div class="cmeta">
            ${presenceChip(d.presence)}
            ${f0 ? `<span class="tag">${esc(f0.family || f0.sku || '')}</span>` : ''}
            ${(a && a.product) ? `<span class="tag acc">${esc(a.product)}</span>` : ''}
            ${ns.luhn === true ? '<span class="tag ok">check digit valid</span>' :
              ns.luhn === false ? '<span class="tag crit">check digit invalid</span>' : ''}
            ${ns.tac ? `<span class="tag mono">TAC ${esc(ns.tac)}</span>` : ''}
            ${(a && a.state) ? `<span class="tag state-tag state-${slug(a.state)}">${esc(a.state)}</span>` : ''}
            ${(a && a.conflict) ? '<span class="tag crit">AMAYA conflict</span>' : ''}
            ${(a && a.repeat) ? '<span class="tag high">repeat ID</span>' : ''}
          </div>
        </div>
        <div class="dossier-actions">
          ${nsFound ? `<button data-ns-inspect="${esc(serial)}">Open in NSpector inspector</button>` : ''}
          ${amFound ? `<button class="primary" data-copy="${esc(serial)}">Copy for Control Center</button>` : ''}
        </div>
      </div>`;

    out.innerHTML = header + `
      <div class="dossier-grid">
        <div class="dossier-col">
          <div class="col-head"><span class="src-dot nspector"></span><div><b>NSpector</b><small>Custody, returns & reasoning</small></div></div>
          ${nsFound ? nsColumn(ns) : emptyCol('Not present in the NSpector dispatch ledger or returns.')}
        </div>
        <div class="dossier-col">
          <div class="col-head"><span class="src-dot amaya"></span><div><b>AMAYA IMEI Control Center</b><small>Workbook occurrences & lifecycle</small></div></div>
          ${amFound ? amayaColumn(a) : emptyCol('Not present in the AMAYA asset snapshot.')}
        </div>
      </div>`;

    // delegated actions
    out.querySelectorAll('[data-ns-inspect]').forEach(b => b.addEventListener('click', () => {
      const s = b.dataset.nsInspect;
      showWorkspace('devices');
      window.NSpectorUI.activateTab('inspect');
      $('#ins-q').value = s;
      window.NSpectorUI.inspect(s);
    }));
    out.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
      const s = b.dataset.copy;
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(s); copied = true;
        }
      } catch (e) { /* insecure context or denied permission */ }
      showWorkspace('imei');
      if (window.SuiteOpenControlCenter) window.SuiteOpenControlCenter(true);
      toast(copied
        ? 'Serial copied — paste it into the Control Center search.'
        : 'Control Center opened — copy the serial above to continue.',
        copied ? 'success' : 'warn');
    }));
  }

  function emptyCol(msg) {
    return `<div class="panel glass col-empty"><p class="hint">${esc(msg)}</p></div>`;
  }

  function nsColumn(ns) {
    const disp = ns.dispatches || [];
    const rets = ns.returns || [];
    const finds = ns.findings || [];
    const dx = ns.diagnosis;
    let html = '';

    html += `<div class="panel glass">
      <div class="panel-top"><h3>Ledger summary</h3><span class="count-pill">${num(disp.length)} dispatch · ${num(rets.length)} return</span></div>
      <dl class="kv">
        <dt>Serial kind</dt><dd>${esc(ns.serialKind || '—')}</dd>
        <dt>Check digit</dt><dd>${ns.luhn === true ? 'Valid' : ns.luhn === false ? 'Invalid' : 'Not applicable'}</dd>
        <dt>TAC</dt><dd class="mono">${esc(ns.tac || '—')}</dd>
        ${ns.price ? `<dt>Observed price</dt><dd>${money(ns.price.typical)} <span class="dim">(${money(ns.price.min)}–${money(ns.price.max)}, ${ns.price.samples}×)</span></dd>` : ''}
        ${ns.relatedCount ? `<dt>Blast radius</dt><dd>${num(ns.relatedCount)} other serials shared these dealers</dd>` : ''}
      </dl>
    </div>`;

    if (disp.length) {
      html += `<div class="panel glass">
        <div class="panel-top"><h3>Dispatch trail</h3><span class="count-pill">${num(disp.length)} stops</span></div>
        <div class="trail">${disp.map((x, i) => `
          <div class="trail-step">
            <span class="trail-when">${esc((x.date || '').toString() || 'undated')}</span>
            <span class="trail-dot"></span>
            <div class="trail-copy">
              <b>${esc(x.party || 'Unknown dealer')}</b>
              <span>${esc(x.wing || '—')} wing · ${esc(x.family || x.sku || '')} · ${esc(x.source || '')}</span>
            </div>
          </div>`).join('')}</div>
      </div>`;
    }

    if (dx) {
      html += `<div class="panel glass">
        <div class="panel-top"><h3>Reasoning</h3><span class="count-pill ${esc(dx.confidence)}">${esc(dx.confidence)} confidence</span></div>
        <div class="callout bad"><b>Diagnosis</b>${esc(dx.diagnosis || '')}</div>
        ${(dx.evidence || []).length ? `<div class="ev">${dx.evidence.map(e => `
          <div class="evrow ${esc(e.weight)}"><span class="k">${esc(e.label)}</span><span class="d">${esc(e.detail)}</span></div>`).join('')}</div>` : ''}
        ${(dx.nextActions || []).length ? `<h4 class="mini-h">Do this next</h4><ol class="actionlist">${dx.nextActions.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
      </div>`;
    }

    if (rets.length) {
      html += `<div class="panel glass">
        <div class="panel-top"><h3>Returns</h3><span class="count-pill">${num(rets.length)}</span></div>
        <div class="trail">${rets.map(r => `
          <div class="trail-step">
            <span class="trail-when">${esc(r.rdate || '—')}</span>
            <span class="trail-dot ret"></span>
            <div class="trail-copy"><b>${esc(r.reason || '')}</b>
              <span>${esc(r.merchant || '')} · ${money(r.price)}</span></div>
          </div>`).join('')}</div>
      </div>`;
    }

    if (finds.length) {
      html += `<div class="panel glass">
        <div class="panel-top"><h3>Findings on this serial</h3><span class="count-pill">${num(finds.length)}</span></div>
        <div class="mini-findings">${finds.map(f => `
          <div class="mini-finding sev-${esc(f.severity)}">
            <b>${esc(f.title)}</b>
            <span>${esc(f.severity)} · ${esc(f.status)}${f.value_at_risk ? ' · ' + money(f.value_at_risk) : ''}</span>
          </div>`).join('')}</div>
      </div>`;
    }

    return html;
  }

  function amayaColumn(a) {
    let html = `<div class="panel glass">
      <div class="panel-top"><h3>Asset ledger</h3><span class="count-pill">${num(a.occurrences)} occurrences</span></div>
      <dl class="kv">
        <dt>Product</dt><dd>${esc(a.product || 'Not recorded')}</dd>
        <dt>Terminal state</dt><dd><span class="state-chip state-${slug(a.state)}">${esc(a.state)}</span></dd>
        <dt>Date range</dt><dd>${esc(a.first || 'undated')} → ${esc(a.last || 'undated')}</dd>
        <dt>Workbook tabs</dt><dd>${num(a.tabs)}</dd>
        <dt>Flags</dt><dd>${a.conflict ? 'Conflict' : 'No conflict'}${a.repeat ? ' · repeat ID' : ''}</dd>
        ${a.evidenceTab ? `<dt>Evidence citation</dt><dd>${esc(a.evidenceTab)} · row ${num(a.evidenceRow)}</dd>` : ''}
      </dl>
      <div class="state-strip">${(a.states || []).map(s => `<span class="state-chip state-${slug(s)}">${esc(s)}</span>`).join('')}</div>
    </div>`;

    const ev = a.events || [];
    html += `<div class="panel glass">
      <div class="panel-top"><h3>Movement evidence</h3><span class="count-pill">${num(ev.length)} events</span></div>
      ${ev.length ? `<div class="amaya-trail">${ev.map(e => `
        <div class="amaya-event${e.undated ? ' undated' : ''}">
          <div class="ae-date">${esc(e.date || 'undated')}</div>
          <div class="ae-body">
            <div class="ae-head">
              <b class="mono">${esc(e.tab || '—')}</b>
              <span class="ae-row">row ${num(e.row)}</span>
              ${e.source ? (e.sourceUrl
                ? `<a class="ae-src" href="${esc(e.sourceUrl)}" target="_blank" rel="noreferrer">${esc(e.source)}</a>`
                : `<span class="ae-src">${esc(e.source)}</span>`) : ''}
            </div>
            ${e.product ? `<div class="ae-product">${esc(e.product)}</div>` : ''}
            <div class="state-strip">${(e.states || []).map(s => `<span class="state-chip state-${slug(s)}">${esc(s)}</span>`).join('')}</div>
          </div>
        </div>`).join('')}</div>` : '<p class="hint">No movement events recorded for this asset.</p>'}
    </div>`;

    if (a.occurrences >= 3 || a.conflict || a.repeat) {
      html += `<div class="panel glass">
        <div class="interpretation">
          <b>What this means</b>
          <p>${a.conflict
            ? 'The source workbooks disagree about this device. Treat the AMAYA review queue entry as the authoritative follow-up.'
            : a.repeat
            ? 'This serial repeats across workbook occurrences. Compare the earliest and latest state before accepting the terminal state.'
            : 'The device appears across multiple workbook occurrences. The timeline above is the evidence trail; the ledger state is the conclusion.'}</p>
        </div>
      </div>`;
    }
    return html;
  }

  // ---------------------------------------------------------------- AMAYA workspace
  const AMA_PATH = '/amaya-imei-control-center/';

  function openControlCenter(silent) {
    if (desktop && window.amayaShell.openControlCenter) {
      Promise.resolve(window.amayaShell.openControlCenter())
        .then(ok => { if (!silent) toast(ok ? 'Control Center opened in its own window' : 'Could not open the Control Center', ok ? 'success' : 'error'); })
        .catch(() => { if (!silent) toast('Could not open the Control Center', 'error'); });
    } else {
      const w = window.open(AMA_PATH, '_blank');
      if (w) { try { w.opener = null; } catch (e) {} }
      if (!silent) toast(w ? 'Control Center opened in a new tab' : 'Allow pop-ups to open the Control Center', w ? 'success' : 'warn');
    }
  }
  window.SuiteOpenControlCenter = openControlCenter;
  $$('.open-ama').forEach(b => b.addEventListener('click', () => openControlCenter()));
  $('#frame-reload').addEventListener('click', () => {
    if (desktop && window.amayaShell.reloadControlCenter) {
      Promise.resolve(window.amayaShell.reloadControlCenter())
        .then(() => toast('Control Center window reloaded'));
    } else {
      overview = null;
      renderAmaWorkspace();
      toast('Snapshot metrics refreshed');
    }
  });

  function renderAmaWorkspace() {
    if (overview && overview.amaya) return paintAma(overview.amaya);
    api('/api/combo/overview').then(d => {
      overview = d;
      paintAma(d.amaya || {});
    }).catch(e => {
      $('#frame-note').textContent = 'Snapshot unavailable';
      $('#ama-review').textContent = 'Metrics could not be loaded.';
      $('#ama-states').innerHTML = '';
      $('#ama-snapshot-note').textContent = '';
      $('#ama-stats').innerHTML = `<div class="kpi error">Snapshot unavailable<span>${esc(e.message)}</span>
        <button class="retry-btn" id="ama-retry">Try again</button></div>`;
      const r = $('#ama-retry');
      if (r) r.addEventListener('click', () => { overview = null; renderAmaWorkspace(); });
    });
  }

  function paintAma(a) {
    const d = a.derived || {};
    $('#frame-note').textContent = num(a.assets) + ' assets · ' + num(a.events) + ' movement events';

    const cards = [
      ['⚡', 'Unique Assets', a.assets, 'one-row deduplicated ledger'],
      ['↩', 'Repeated IDs', a.repeatIds, 'present in 2+ source tabs'],
      ['⇄', 'Movement Conflicts', a.conflicts, 'states disagree across evidence'],
      ['◷', 'No Terminal State', d.assetsWithoutTerminalState, 'of the ledger cannot be resolved']
    ];
    $('#ama-stats').innerHTML = cards.map(([icon, label, value, sub]) => `
      <div class="stat-card">
        <div class="icon" aria-hidden="true">${icon}</div>
        <div class="label">${esc(label)}</div>
        <div class="value">${num(value)}</div>
        <div class="sub">${esc(sub)}</div>
      </div>`).join('');

    $('#ama-review').innerHTML =
      `<span><b>${num(d.assetsWithoutTerminalState || 0)}</b> outside the review queue</span>` +
      `<span><b>${num(a.emptyTabs || 0)}</b> empty tabs</span>` +
      `<span><b>${num(a.reviewQueue || 0)}</b> flagged for review</span>`;

    const entries = Object.entries(a.stateCounts || {}).sort((x, y) => y[1] - x[1]);
    const total = a.assets || 1;
    $('#ama-states').innerHTML = entries.map(([name, count], i) => `
      <div class="kpi ${i === 0 ? 'lead' : ''}">
        <div class="num">${num(count)}</div>
        <div class="label">${esc(name)}</div>
        <div class="pct">${pct(count, total).toFixed(1)}%</div>
      </div>`).join('') || '<p class="hint">No state data in this snapshot.</p>';

    $('#ama-snapshot-note').textContent =
      'Snapshot ' + (a.dataVersion || '—') + ' · built ' + ((a.builtAt || '').slice(0, 10) || '—') +
      ' · source ' + (a.generatedFrom || '—');
  }

  // ---------------------------------------------------------------- sources
  async function loadSources(force) {
    if (sources && !force) return renderSources();
    try { sources = await api('/api/combo/sources'); }
    catch (e) {
      $('#sources-out').innerHTML = `<div class="panel glass"><h3>Source inventory unavailable</h3><p class="hint">${esc(e.message)}</p></div>`;
      return;
    }
    renderSources();
  }

  function renderSources() {
    const d = sources;
    if (!d) return;
    const a = d.amaya || {};
    const srcEntries = Object.entries(a.sources || {});
    $('#src-data-version').textContent = 'Snapshot ' + (a.dataVersion || '—') + ' · built ' + ((a.builtAt || '').slice(0, 10) || '—');
    $('#sources-out').innerHTML = `
      <div class="src-grid">
        <div class="panel glass">
          <div class="panel-top"><h3>NSpector ingest</h3><span class="count-pill">${num((d.files || []).length)} files</span></div>
          <p class="hint">Copied to the app's user-data folder on first run, ingested into SQLite, then analysed by the findings engine. Edits stay local.</p>
          <div class="file-list">
            ${(d.files || []).map(f => `
              <div class="file-row">
                <b class="mono">${esc(f.name)}</b>
                <span>${(f.bytes / 1024).toFixed(0)} KB · ${esc(f.modified.slice(0, 10))}</span>
              </div>`).join('') || '<p class="hint">No source files found.</p>'}
          </div>
        </div>
        <div class="panel glass">
          <div class="panel-top"><h3>AMAYA snapshot</h3><span class="count-pill">v${esc(a.dataVersion || '—')}</span></div>
          <p class="hint">Generated from <b>${esc(a.generatedFrom || '—')}</b> on ${esc((a.builtAt || '').slice(0, 10) || '—')}. The Control Center is served unmodified from this snapshot.</p>
          <div class="src-grid-inner">
            <div class="mini-stat"><b>${num(a.assets)}</b><span>assets</span></div>
            <div class="mini-stat"><b>${num(a.events)}</b><span>events</span></div>
            <div class="mini-stat"><b>${num(a.conflicts)}</b><span>conflicts</span></div>
            <div class="mini-stat"><b>${num(a.repeatIds)}</b><span>repeat IDs</span></div>
          </div>
        </div>
      </div>

      <div class="panel glass">
        <h3>Source workbooks</h3>
        <p class="hint">The AMAYA snapshot cites four workbooks. Links open in your browser; the app itself never calls out to them.</p>
        <div class="workbook-grid">
          ${srcEntries.map(([key, s]) => `
            <a class="workbook-card" href="${esc(s.url)}" target="_blank" rel="noreferrer">
              <span class="book-index">${esc(key)}</span>
              <b>${esc(s.name)}</b>
              <small>Open source workbook →</small>
            </a>`).join('')}
        </div>
      </div>

      <div class="panel glass">
        <h3>Methodology notes</h3>
        <div class="method-grid">
          <div class="method-card"><b>Exact matching only</b><p>An IMEI is "matched" when the same 15-character string exists in both ledgers. There is no fuzzy, phonetic or TAC-prefix matching in the reconciliation count.</p></div>
          <div class="method-card"><b>Values are observed</b><p>NSpector exposure uses prices logged on your own return records. AMAYA states come from the workbook snapshot's resolved column.</p></div>
          <div class="method-card"><b>Findings are reporting items</b><p>A duplicate is usually an unclosed return, not theft. The owner and status on a finding are what make it actionable.</p></div>
          <div class="method-card"><b>Offline by design</b><p>Fonts, snapshots and code are bundled. The desktop app serves everything from localhost on your machine.</p></div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- boot
  const rv = $('#rail-version');
  if (rv) rv.textContent = desktop
    ? 'v1.0.0 · offline · local engine'
    : 'v1.0.0 · live web instance';

  // Let the NSpector sync action invalidate the merged caches too.
  window.SuiteRefresh = function () {
    overview = null; sources = null;
    loadOverview(true);
    if (current === 'sources') loadSources(true);
    if (current === 'imei') renderAmaWorkspace();
  };

  const initial = (location.hash || '').replace('#', '');
  showWorkspace(TITLES[initial] ? initial : 'overview');
})();
