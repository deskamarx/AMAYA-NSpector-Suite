/* shell.js — workspace router, merged overview and cross-ledger dossier. */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const I = window.SuiteI18n;
  const t = (k, v) => I.t(k, v);
  const th = (k, v) => I.tHtml(k, v);
  const tx = v => I.tx(v);
  const money = n => I.money(n);
  const num = n => I.number(n);
  const tb = n => I.compact(n);
  const pct = (a, b) => b ? (a / b * 100) : 0;
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const TITLES = {
    overview: ['nav.overview', 'title.overview'],
    lookup:   ['lookup.eyebrow', 'title.lookup'],
    devices:  ['devices.eyebrow', 'title.devices'],
    imei:     ['imei.eyebrow', 'title.imei'],
    sources:  ['sources.eyebrow', 'title.sources']
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
  let lookupDossier = null;

  // Electron's main window uses contextIsolation — never touch Node globals here.
  // The desktop build exposes a tiny, audited bridge via preload.js.
  const desktop = !!(window.amayaShell && window.amayaShell.isDesktop);

  async function api(p, o) {
    const r = await fetch((window.SUITE_API_BASE || '') + p, o);
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
    const [eyebrowKey, titleKey] = TITLES[name];
    const title = t(titleKey);
    $('#ws-eyebrow').textContent = t(eyebrowKey);
    $('#ws-title').textContent = title;
    document.title = title + ' · ' + t('app.name');
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
      '<div class="suggest-head"><span>' + esc(t('search.matching')) + '</span><em>' + esc(t('search.found', { n: num(suggestRows.length) })) + '</em></div>' +
      suggestRows.map((r, i) => `
        <button type="button" id="${prefix}-opt-${i}" class="suggest-item ${i === suggestIndex ? 'active' : ''}"
                role="option" aria-selected="${i === suggestIndex}" data-serial="${esc(r.serial)}"
                data-presence="${r.inNs && r.inAmaya ? 'both' : r.inNs ? 'nspector' : 'amaya'}">
          <i class="src-dot ${r.inNs && r.inAmaya ? 'both' : r.inNs ? 'nspector' : 'amaya'}"></i>
          <span class="s-body"><b>${esc(r.serial)}</b><small>${esc(r.family || (r.amaya && r.amaya.product) || t(r.inAmaya ? 'search.amayaAsset' : 'search.nspectorDispatch'))}</small></span>
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
        box.innerHTML = '<div class="suggest-empty"><b>' + esc(t('search.noDevices')) + '</b>' + esc(t('search.noDevicesHint')) + '</div>';
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
      $('#ov-kpis').innerHTML = `<div class="kpi error">${esc(t('ov.unavailable'))}<span>${esc(e.message)}</span>
        <button class="retry-btn" id="ov-retry">${esc(t('ov.retry'))}</button></div>`;
      ['#ov-recon-body', '#ov-amaya-body', '#ov-ns-body', '#ov-critical-body', '#ov-sources-body'].forEach(sel => {
        const el = $(sel);
        if (el) el.innerHTML = '<p class="hint">' + esc(t('ov.waiting')) + '</p>';
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
    $('#ov-lede').innerHTML = th('overview.lede', {
      both: num(ov.both), union: num(ov.union),
      dispatches: num(st.dispatches), events: num(a.events)
    });

    const orb = $('#ov-orb');
    orb.style.setProperty('--p', pctBoth.toFixed(1) + '%');
    $('#ov-match-pct').textContent = pctBoth.toFixed(1) + '%';

    const kpis = [
      [t('kpi.distinct'), num(ov.union), t('kpi.distinctSub'), 'merged', '', 'lookup', 'tip.kpi.merged'],
      [t('kpi.matched'), num(ov.both), t('kpi.matchedSub', { ns:num(ov.nsOnly), am:num(ov.amayaOnly) }), 'both', '', 'lookup', 'tip.kpi.matched'],
      [t('kpi.findings'), num(st.openFindings), t('kpi.findingsSub', { total:num(st.findings), value:tb(ex.open_total) }), 'nspector', 'crit', 'devices', 'tip.kpi.findings'],
      [t('kpi.conflicts'), num(a.conflicts), t('kpi.conflictsSub', { repeat:num(a.repeatIds), review:num(a.reviewQueue) }), 'amaya', 'warn', 'imei', 'tip.kpi.conflicts'],
      [t('kpi.serials'), num(st.uniqueSerials), t('kpi.serialsSub', { disp:num(st.dispatches), dealers:num(st.dealers) }), 'nspector', '', 'devices', 'tip.kpi.serials'],
      [t('kpi.assets'), num(a.assets), t('kpi.assetsSub', { events:num(a.events), books:num(Object.keys(a.sources || {}).length) }), 'amaya', 'acc', 'imei', 'tip.kpi.assets']
    ];
    $('#ov-kpis').innerHTML = kpis.map(([label, value, sub, source, tone, go, tipKey]) => `
      <button type="button" class="kpi ${tone}" data-goto="${go}" data-tip="${esc(t(tipKey))}" title="${esc(t(tipKey))}">
        <div class="kpi-top"><span>${esc(label)}</span><i class="src-dot ${source}"></i></div>
        <strong>${value}</strong>
        <small>${esc(sub)}</small>
      </button>`).join('');

    // reconciliation
    const rows = [
      [t('recon.both'), ov.both, 'both', 'match'],
      [t('recon.ns'), ov.nsOnly, 'nspector', 'ns'],
      [t('recon.am'), ov.amayaOnly, 'amaya', 'amaya']
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
        <span class="eyebrow">${esc(t('recon.sample'))}</span>
        <div class="chip-row">
          ${(ov.sample || []).map(s => `<button class="mono-chip" data-serial="${esc(s)}">${esc(s)}</button>`).join('') ||
            '<span class="hint">' + esc(t('recon.none')) + '</span>'}
        </div>
      </div>`;

    // amaya panel
    const sc = a.stateCounts || {};
    const maxState = Math.max(1, ...Object.values(sc));
    $('#ov-amaya-body').innerHTML = `
      <div class="mini-bars">
        ${STATE_ORDER.filter(k => sc[k] != null).map(k => `
          <div class="mini-bar">
            <span>${esc(I.state(k))}</span>
            <i><b class="state-${slug(k)}" style="width:${(sc[k] / maxState * 100).toFixed(1)}%"></b></i>
            <em>${num(sc[k])}</em>
          </div>`).join('')}
      </div>
      <div class="mini-meta">
        <span>${esc(t('am.snapshot'))} <b>${esc(a.dataVersion || '—')}</b></span>
        <span>${esc(t('am.built'))} <b>${esc(I.date((a.builtAt || '').slice(0, 10)))}</b></span>
      </div>
      <button class="wide-btn" data-goto="imei">${esc(t('am.openCenter'))}</button>`;

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
        <span>${esc(t('ns.dispatches'))} <b>${num(st.dispatches)}</b></span>
        <span>${esc(t('ns.returns'))} <b>${num(st.returns)}</b></span>
        <span>${esc(t('ns.dealers'))} <b>${num(st.dealers)}</b></span>
      </div>
      <button class="wide-btn" data-goto="devices">${esc(t('ns.openLedger'))}</button>`;

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
      </div>`).join('') : '<p class="hint">' + esc(t('critical.none')) + '</p>';

    // sources strip
    const srcCards = [
      [t('src.ns'), t('src.nsBig', { n:num(st.dispatches) }), t('src.nsSub'), 'nspector', 'devices', 'tip.src.nspector'],
      [t('src.am'), t('src.amBig', { assets:num(a.assets), events:num(a.events) }), t('src.amSub', { file:a.generatedFrom || 'imei_deduplicated_ledger.xlsx' }), 'amaya', 'imei', 'tip.src.amaya'],
      [t('src.merged'), t('src.mergedBig', { n:num(ov.both) }), t('src.mergedSub'), 'both', 'lookup', 'tip.src.merged']
    ];
    $('#ov-sources-body').innerHTML = srcCards.map(([title, big, sub, cls, go, tipKey]) => `
      <button class="source-card" data-goto="${go}" data-tip="${esc(t(tipKey))}" title="${esc(t(tipKey))}">
        <span class="src-dot ${cls}"></span>
        <b>${esc(title)}</b>
        <strong>${esc(big)}</strong>
        <small>${esc(sub)}</small>
      </button>`).join('');
  }

  function KIND_LABEL(k) {
    return I.kind(k);
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
    out.innerHTML = `<div class="panel glass"><div class="inline-load"><i></i><span>${esc(t('lookup.reading', { serial }))}</span></div></div>`;
    let d;
    try { d = await api('/api/combo/asset/' + encodeURIComponent(serial)); }
    catch (err) {
      if (seq === lookupSeq) out.innerHTML = `<div class="panel glass"><h3>${esc(t('lookup.failed'))}</h3><p class="hint">${esc(err.message)}</p></div>`;
      return;
    }
    if (seq !== lookupSeq) return;
    lookupDossier = d;
    renderDossier(d);
  }

  function presenceChip(p) {
    if (p === 'both') return '<span class="presence both">' + esc(t('presence.both')) + '</span>';
    if (p === 'nspector') return '<span class="presence nspector">' + esc(t('presence.ns')) + '</span>';
    if (p === 'amaya') return '<span class="presence amaya">' + esc(t('presence.am')) + '</span>';
    return '<span class="presence none">' + esc(t('presence.none')) + '</span>';
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
          <h3>${esc(t('dossier.notFound', { serial }))}</h3>
          <p class="hint">${esc(t('dossier.notFoundHint'))}</p>
          <div class="empty-actions">
            <button data-goto="devices">${esc(t('dossier.openInspector'))}</button>
            <button data-goto="imei">${esc(t('dossier.searchCenter'))}</button>
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
          <span class="eyebrow">${esc(t('dossier.eyebrow'))}</span>
          <h2 class="mono">${esc(serial)}</h2>
          <div class="cmeta">
            ${presenceChip(d.presence)}
            ${f0 ? `<span class="tag">${esc(f0.family || f0.sku || '')}</span>` : ''}
            ${(a && a.product) ? `<span class="tag acc">${esc(a.product)}</span>` : ''}
            ${ns.luhn === true ? '<span class="tag ok">' + esc(t('dossier.checkValid')) + '</span>' :
              ns.luhn === false ? '<span class="tag crit">' + esc(t('dossier.checkInvalid')) + '</span>' : ''}
            ${ns.tac ? `<span class="tag mono">TAC ${esc(ns.tac)}</span>` : ''}
            ${(a && a.state) ? `<span class="tag state-tag state-${slug(a.state)}">${esc(a.state)}</span>` : ''}
            ${(a && a.conflict) ? '<span class="tag crit">' + esc(t('dossier.conflict')) + '</span>' : ''}
            ${(a && a.repeat) ? '<span class="tag high">' + esc(t('dossier.repeat')) + '</span>' : ''}
          </div>
        </div>
        <div class="dossier-actions">
          ${nsFound ? `<button data-ns-inspect="${esc(serial)}">${esc(t('dossier.openNs'))}</button>` : ''}
          ${amFound ? `<button class="primary" data-copy="${esc(serial)}">${esc(t('dossier.copy'))}</button>` : ''}
        </div>
      </div>`;

    out.innerHTML = header + `
      <div class="dossier-grid">
        <div class="dossier-col">
          <div class="col-head"><span class="src-dot nspector"></span><div><b>${esc(t('dossier.nsTitle'))}</b><small>${esc(t('dossier.nsSub'))}</small></div></div>
          ${nsFound ? nsColumn(ns) : emptyCol(t('dossier.noNs'))}
        </div>
        <div class="dossier-col">
          <div class="col-head"><span class="src-dot amaya"></span><div><b>${esc(t('dossier.amTitle'))}</b><small>${esc(t('dossier.amSub'))}</small></div></div>
          ${amFound ? amayaColumn(a) : emptyCol(t('dossier.noAm'))}
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
      if (window.SuiteOpenControlCenter) window.SuiteOpenControlCenter({ serial:s, silent:true });
      toast(copied
        ? t('dossier.copyHint', {}, 'Serial copied — paste it into the Control Center search.')
        : t('dossier.copyFallback', {}, 'Control Center opened — copy the serial above to continue.'),
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
      <div class="panel-top"><h3>${esc(t('ns.summary'))}</h3><span class="count-pill">${esc(t('ns.count', { disp:num(disp.length), ret:num(rets.length) }))}</span></div>
      <dl class="kv">
        <dt>${esc(t('ns.serialKind'))}</dt><dd>${esc(tx(ns.serialKind) || '—')}</dd>
        <dt>${esc(t('ns.checkDigit'))}</dt><dd>${esc(ns.luhn === true ? t('ns.valid') : ns.luhn === false ? t('ns.invalid') : t('ns.na'))}</dd>
        <dt>TAC</dt><dd class="mono">${esc(ns.tac || '—')}</dd>
        ${ns.price ? `<dt>${esc(t('ns.price'))}</dt><dd>${money(ns.price.typical)} <span class="dim">(${money(ns.price.min)}–${money(ns.price.max)}, ${ns.price.samples}×)</span></dd>` : ''}
        ${ns.relatedCount ? `<dt>${esc(t('ns.blast'))}</dt><dd>${esc(t('ns.blastSub', { n:num(ns.relatedCount) }))}</dd>` : ''}
      </dl>
    </div>`;

    if (disp.length) {
      html += `<div class="panel glass">
        <div class="panel-top"><h3>${esc(t('ns.trail'))}</h3><span class="count-pill">${esc(t('ns.stops', { n:num(disp.length) }))}</span></div>
        <div class="trail">${disp.map((x, i) => `
          <div class="trail-step">
            <span class="trail-when">${esc(I.date((x.date || '').toString()) === '—' ? t('ns.undated') : I.date((x.date || '').toString()))}</span>
            <span class="trail-dot"></span>
            <div class="trail-copy">
              <b>${esc(x.party || t('ns.unknownDealer'))}</b>
              <span>${esc(x.wing || '—')} ${esc(t('ns.wing'))} · ${esc(x.family || x.sku || '')} · ${esc(x.source || '')}</span>
            </div>
          </div>`).join('')}</div>
      </div>`;
    }

    if (dx) {
      html += `<div class="panel glass">
        <div class="panel-top"><h3>${esc(t('ns.reasoning'))}</h3><span class="count-pill ${esc(dx.confidence)}">${esc(t('ns.confidence', { c:I.confidence(dx.confidence) }))}</span></div>
        <div class="callout bad"><b>${esc(t('ns.diagnosis'))}</b>${esc(tx(dx.diagnosis || ''))}</div>
        ${(dx.evidence || []).length ? `<div class="ev">${dx.evidence.map(e => `
          <div class="evrow ${esc(e.weight)}"><span class="k">${esc(e.label)}</span><span class="d">${esc(e.detail)}</span></div>`).join('')}</div>` : ''}
        ${(dx.nextActions || []).length ? `<h4 class="mini-h">${esc(t('ns.doNext'))}</h4><ol class="actionlist">${dx.nextActions.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
      </div>`;
    }

    if (rets.length) {
      html += `<div class="panel glass">
        <div class="panel-top"><h3>${esc(t('ns.returns'))}</h3><span class="count-pill">${num(rets.length)}</span></div>
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
        <div class="panel-top"><h3>${esc(t('ns.findings'))}</h3><span class="count-pill">${num(finds.length)}</span></div>
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
      <div class="panel-top"><h3>${esc(t('am.ledger'))}</h3><span class="count-pill">${esc(t('am.occurrences', { n:num(a.occurrences) }))}</span></div>
      <dl class="kv">
        <dt>Product</dt><dd>${esc(a.product || t('am.notRecorded'))}</dd>
        <dt>${esc(t('am.terminal'))}</dt><dd><span class="state-chip state-${slug(a.state)}">${esc(I.state(a.state))}</span></dd>
        <dt>${esc(t('am.range'))}</dt><dd>${esc(a.first || t('ns.undated'))} → ${esc(a.last || t('ns.undated'))}</dd>
        <dt>${esc(t('am.tabs'))}</dt><dd>${num(a.tabs)}</dd>
        <dt>${esc(t('am.flags'))}</dt><dd>${a.conflict ? esc(t('dossier.conflict')) : esc(t('am.noConflict'))}${a.repeat ? ' · ' + esc(t('am.repeatShort')) : ''}</dd>
        ${a.evidenceTab ? `<dt>${esc(t('am.citation'))}</dt><dd>${esc(a.evidenceTab)} · ${esc(t('am.row'))} ${num(a.evidenceRow)}</dd>` : ''}
      </dl>
      <div class="state-strip">${(a.states || []).map(s => `<span class="state-chip state-${slug(s)}">${esc(I.state(s))}</span>`).join('')}</div>
    </div>`;

    const ev = a.events || [];
    html += `<div class="panel glass">
      <div class="panel-top"><h3>${esc(t('am.movement'))}</h3><span class="count-pill">${esc(t('am.events', { n:num(ev.length) }))}</span></div>
      ${ev.length ? `<div class="amaya-trail">${ev.map(e => `
        <div class="amaya-event${e.undated ? ' undated' : ''}">
          <div class="ae-date">${esc(e.date || t('ns.undated'))}</div>
          <div class="ae-body">
            <div class="ae-head">
              <b class="mono">${esc(e.tab || '—')}</b>
              <span class="ae-row">${esc(t('am.row'))} ${num(e.row)}</span>
              ${e.source ? (e.sourceUrl
                ? `<a class="ae-src" href="${esc(e.sourceUrl)}" target="_blank" rel="noreferrer">${esc(e.source)}</a>`
                : `<span class="ae-src">${esc(e.source)}</span>`) : ''}
            </div>
            ${e.product ? `<div class="ae-product">${esc(e.product)}</div>` : ''}
            <div class="state-strip">${(e.states || []).map(s => `<span class="state-chip state-${slug(s)}">${esc(I.state(s))}</span>`).join('')}</div>
          </div>
        </div>`).join('')}</div>` : '<p class="hint">' + esc(t('am.noEvents')) + '</p>'}
    </div>`;

    if (a.occurrences >= 3 || a.conflict || a.repeat) {
      html += `<div class="panel glass">
        <div class="interpretation">
          <b>${esc(t('am.means'))}</b>
          <p>${a.conflict
            ? t('am.meanConflict')
            : a.repeat
            ? t('am.meanRepeat')
            : t('am.meanMultiple')}</p>
        </div>
      </div>`;
    }
    return html;
  }

  // ---------------------------------------------------------------- AMAYA workspace
  const AMA_PATH = '/amaya-imei-control-center/';

  function evidenceHash(serial) {
    const digits = String(serial || '').replace(/\D/g, '');
    return /^\d{14,15}$/.test(digits) ? '#/evidence/' + digits : '';
  }

  function openControlCenter(options) {
    if (typeof options === 'string') options = { serial: options };
    else if (typeof options === 'boolean') options = { silent: options };
    options = options || {};
    const hash = evidenceHash(options.serial);
    const silent = !!options.silent;
    if (window.SUITE_NATIVE) {
      // On Android the Control Center is a first-class in-app screen, not a popup.
      try { sessionStorage.setItem('suite.control.opened', '1'); } catch (e) {}
      window.location.assign(AMA_PATH + hash);
      return;
    }
    if (desktop && window.amayaShell.openControlCenter) {
      Promise.resolve(window.amayaShell.openControlCenter(hash))
        .then(ok => { if (!silent) toast(ok ? t('control.window') : t('control.failed'), ok ? 'success' : 'error'); })
        .catch(() => { if (!silent) toast(t('control.failed'), 'error'); });
    } else {
      const w = window.open(AMA_PATH + hash, '_blank');
      if (w) { try { w.opener = null; } catch (e) {} }
      if (!silent) toast(w ? t('control.tab') : t('control.popups'), w ? 'success' : 'warn');
    }
  }
  window.SuiteOpenControlCenter = openControlCenter;
  $$('.open-ama').forEach(b => b.addEventListener('click', () => openControlCenter()));
  $('#frame-reload').addEventListener('click', () => {
    if (desktop && window.amayaShell.reloadControlCenter) {
      Promise.resolve(window.amayaShell.reloadControlCenter())
        .then(() => toast(t('control.reloaded')));
    } else {
      overview = null;
      renderAmaWorkspace();
      toast(t('control.refreshed'));
    }
  });

  function renderAmaWorkspace() {
    if (overview && overview.amaya) return paintAma(overview.amaya);
    api('/api/combo/overview').then(d => {
      overview = d;
      paintAma(d.amaya || {});
    }).catch(e => {
      $('#frame-note').textContent = t('ama.unavailable');
      $('#ama-review').textContent = t('ama.metrics');
      $('#ama-states').innerHTML = '';
      $('#ama-snapshot-note').textContent = '';
      $('#ama-stats').innerHTML = `<div class="kpi error">${esc(t('ama.unavailable'))}<span>${esc(e.message)}</span>
        <button class="retry-btn" id="ama-retry">${esc(t('ov.retry'))}</button></div>`;
      const r = $('#ama-retry');
      if (r) r.addEventListener('click', () => { overview = null; renderAmaWorkspace(); });
    });
  }

  function paintAma(a) {
    const d = a.derived || {};
    $('#frame-note').textContent = t('src.amBig', { assets:num(a.assets), events:num(a.events) });

    const cards = [
      ['⚡', t('ama.unique'), a.assets, t('ama.uniqueSub')],
      ['↩', t('ama.repeat'), a.repeatIds, t('ama.repeatSub')],
      ['⇄', t('ama.conflictMetric'), a.conflicts, t('ama.conflictSub')],
      ['◷', t('ama.noTerminal'), d.assetsWithoutTerminalState, t('ama.noTerminalSub')]
    ];
    $('#ama-stats').innerHTML = cards.map(([icon, label, value, sub]) => `
      <div class="stat-card">
        <div class="icon" aria-hidden="true">${icon}</div>
        <div class="label">${esc(label)}</div>
        <div class="value">${num(value)}</div>
        <div class="sub">${esc(sub)}</div>
      </div>`).join('');

    $('#ama-review').innerHTML =
      `<span><b>${num(d.assetsWithoutTerminalState || 0)}</b> ${esc(t('ama.outside', { n:'' }).trim())}</span>` +
      `<span><b>${num(a.emptyTabs || 0)}</b> ${esc(t('ama.emptyTabs', { n:'' }).trim())}</span>` +
      `<span><b>${num(a.reviewQueue || 0)}</b> ${esc(t('ama.flagged', { n:'' }).trim())}</span>`;

    const entries = Object.entries(a.stateCounts || {}).sort((x, y) => y[1] - x[1]);
    const total = a.assets || 1;
    $('#ama-states').innerHTML = entries.map(([name, count], i) => `
      <div class="kpi ${i === 0 ? 'lead' : ''}">
        <div class="num">${num(count)}</div>
        <div class="label">${esc(name)}</div>
        <div class="pct">${new Intl.NumberFormat(I.locale === 'bn' ? 'bn-BD' : I.locale === 'zh' ? 'zh-CN' : 'en-IN', { maximumFractionDigits:1 }).format(pct(count, total))}%</div>
      </div>`).join('') || '<p class="hint">' + esc(t('ama.noStates')) + '</p>';

    $('#ama-snapshot-note').textContent =
      t('ama.note', { v:a.dataVersion || '—', d:I.date((a.builtAt || '').slice(0, 10)), f:a.generatedFrom || '—' });
  }

  // ---------------------------------------------------------------- sources
  async function loadSources(force) {
    if (sources && !force) return renderSources();
    try { sources = await api('/api/combo/sources'); }
    catch (e) {
      $('#sources-out').innerHTML = `<div class="panel glass"><h3>${esc(t('sources.unavailable'))}</h3><p class="hint">${esc(e.message)}</p></div>`;
      return;
    }
    renderSources();
  }

  function renderSources() {
    const d = sources;
    if (!d) return;
    const a = d.amaya || {};
    const srcEntries = Object.entries(a.sources || {});
    $('#src-data-version').textContent = t('am.snapshot') + ' ' + (a.dataVersion || '—') + ' · ' + t('am.built') + ' ' + I.date((a.builtAt || '').slice(0, 10));
    $('#sources-out').innerHTML = `
      <div class="src-grid">
        <div class="panel glass">
          <div class="panel-top"><h3>${esc(t('sources.ingest'))}</h3><span class="count-pill">${esc(t('sources.files', { n:num((d.files || []).length) }))}</span></div>
          <p class="hint">${esc(t('sources.ingestHint'))}</p>
          <div class="file-list">
            ${(d.files || []).map(f => `
              <div class="file-row">
                <b class="mono">${esc(f.name)}</b>
                <span>${(f.bytes / 1024).toFixed(0)} KB · ${esc(I.date(f.modified.slice(0, 10)))}</span>
              </div>`).join('') || '<p class="hint">' + esc(t('sources.noFiles')) + '</p>'}
          </div>
        </div>
        <div class="panel glass">
          <div class="panel-top"><h3>${esc(t('sources.snapshot'))}</h3><span class="count-pill">v${esc(a.dataVersion || '—')}</span></div>
          <p class="hint">${th('sources.generated', { file:a.generatedFrom || '—', date:I.date((a.builtAt || '').slice(0, 10)) })}</p>
          <div class="src-grid-inner">
            <div class="mini-stat"><b>${num(a.assets)}</b><span>${esc(t('sources.assets'))}</span></div>
            <div class="mini-stat"><b>${num(a.events)}</b><span>${esc(t('sources.events'))}</span></div>
            <div class="mini-stat"><b>${num(a.conflicts)}</b><span>${esc(t('sources.conflicts'))}</span></div>
            <div class="mini-stat"><b>${num(a.repeatIds)}</b><span>${esc(t('sources.repeats'))}</span></div>
          </div>
        </div>
      </div>

      <div class="panel glass">
        <h3>${esc(t('sources.workbooks'))}</h3>
        <p class="hint">${esc(t('sources.workbooksHint'))}</p>
        <div class="workbook-grid">
          ${srcEntries.map(([key, s]) => `
            <a class="workbook-card" href="${esc(s.url)}" target="_blank" rel="noreferrer">
              <span class="book-index">${esc(key)}</span>
              <b>${esc(s.name)}</b>
              <small>${esc(t('sources.openBook'))}</small>
            </a>`).join('')}
        </div>
      </div>

      <div class="panel glass">
        <h3>${esc(t('sources.method'))}</h3>
        <div class="method-grid">
          <div class="method-card"><b>${esc(t('method.exactTitle'))}</b><p>${esc(t('method.exactBody'))}</p></div>
          <div class="method-card"><b>${esc(t('method.observedTitle'))}</b><p>${esc(t('method.observedBody'))}</p></div>
          <div class="method-card"><b>${esc(t('method.findingsTitle'))}</b><p>${esc(t('method.findingsBody'))}</p></div>
          <div class="method-card"><b>${esc(t('method.offlineTitle'))}</b><p>${esc(t('method.offlineBody'))}</p></div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- boot
  const rv = $('#rail-version');
  if (rv) rv.textContent = desktop ? t('rail.versionOffline') : t('rail.versionWeb');

  // Let the NSpector sync action invalidate the merged caches too.
  window.SuiteRefresh = function () {
    overview = null; sources = null;
    loadOverview(true);
    if (current === 'sources') loadSources(true);
    if (current === 'imei') renderAmaWorkspace();
  };

  window.addEventListener('suite:localechange', () => {
    showWorkspace(current, true);
    if (lookupDossier) renderDossier(lookupDossier);
    toast(t('toast.localeChanged'), 'success');
  });

  const initial = (location.hash || '').replace('#', '');
  showWorkspace(TITLES[initial] ? initial : 'overview');
})();
