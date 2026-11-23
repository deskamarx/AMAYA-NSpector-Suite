/* NSpector client — one UI, served to desktop and phone from the same server. */
(function () {
  'use strict';
  const API = location.origin;
  let ws = null, retry = 0;
  let queueLimit = 40, queueOffset = 0;

  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const I = window.SuiteI18n;
  const t = (k, v) => I.t(k, v);
  const tx = v => I.tx(v);
  const money = n => I.money(n);
  const short = n => I.number(n);
  const tb = n => I.compact(n);
  const dt = v => I.date(v);
  const KIND = k => I.kind(k);
  const STATUS = ['open','investigating','resolved','dismissed'];
  let currentFindingId = null;

  function toast(m, type){
    if (window.SuiteToast) return window.SuiteToast(m, type);
    const t=$('#toast');t.textContent=m;t.classList.add('show');
    clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600);
  }
  async function api(p,o){
    const r=await fetch(API+p,o);
    if(!r.ok){
      let detail=''; try{ const j=await r.json(); if(j.error) detail=' · '+j.error; }catch(e){}
      throw new Error(r.statusText+detail);
    }
    return r.json();
  }
  const panelError = (id, label, err) => {
    const el = $(id);
    if (el) el.innerHTML = `<div class="panel-error"><b>${esc(label)} ${esc(t('common.unavailable'))}</b>
      <span>${esc((err && err.message) || t('queue.unknownError'))}</span>
      <button class="retry-btn" data-retry="${id.slice(1)}">${esc(t('queue.retry'))}</button></div>`;
  };
  const val = f => f.value_at_risk > 0
    ? `<span class="tag val">${money(f.value_at_risk)}</span>`
    : (f.kind === 'duplicate_cross' || f.kind === 'duplicate_multi'
        ? `<span class="tag" title="${esc(tx(f.value_basis||''))}">${esc(t('queue.unpriced'))}</span>` : '');

  // ------------------------------------------------ live connection
  function connect(){
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    try { ws = new WebSocket(`${proto}://${location.host}/ws`); } catch(e){ return retryConnect(); }
    ws.onopen = () => { retry = 0; syncState('live',t('nsp.liveSync')); };
    ws.onclose = () => { syncState('off',t('nsp.reconnecting')); retryConnect(); };
    ws.onerror = () => { try { ws.close(); } catch(e){} };
    ws.onmessage = e => {
      let d; try { d = JSON.parse(e.data); } catch(x){ return; }
      if (d.type === 'synced') {
        toast(t('nsp.synced', { n: short((d.stats || {}).dispatches || 0) }), 'success');
        refreshAll();
        if (window.SuiteRefresh) window.SuiteRefresh();
      }
      else if (d.type === 'finding_updated') {
        const t = currentTab();
        if (t === 'queue') loadQueue(true);
        if (t === 'ownership') loadOwnership();
        if (t === 'exposure') loadExposure();
      }
    };
  }
  function retryConnect(){
    retry = Math.min(retry+1,7);
    if (retry >= 7) { syncState('off',t('nsp.syncPaused')); return; }
    setTimeout(connect, 500*Math.pow(2,retry));
  }
  function syncState(cls,txt){
    const el=$('#syncstate');
    if (el) { el.textContent=txt; el.className=cls; el.title = cls==='live' ? t('nsp.liveConnected') : t('nsp.clickReconnect'); }
  }
  $('#syncstate').addEventListener('click', () => { retry = 0; connect(); toast(t('nsp.reconnectingToast')); });
  function currentTab(){ const b=$('#tabs button.active'); return b ? b.dataset.tab : 'queue'; }

  // ------------------------------------------------ work queue
  function fCard(f){
    const opts = STATUS.map(s=>`<option value="${s}"${f.status===s?' selected':''}>${esc(I.status(s))}</option>`).join('');
    const conf = f.confidence
      ? `<span class="tag ${f.confidence==='high'?'ok':f.confidence==='medium'?'med':''}">${esc(t('ns.confidence', { c:I.confidence(f.confidence) }))}</span>` : '';
    return `<div class="card sev-${esc(f.severity)}" data-id="${f.id}">
      <div class="crow"><div>
        <h4 class="ctitle">${esc(tx(f.title))}</h4>
        ${f.diagnosis ? `<p class="cdiag">${esc(tx(f.diagnosis))}</p>` : ''}
        <div class="cdetail">${esc(tx(f.detail||''))}</div>
        <div class="cmeta">
          <span class="tag ${f.severity==='critical'?'crit':f.severity==='high'?'high':f.severity==='medium'?'med':'low'}">${esc(I.severity(f.severity))}</span>
          <span class="tag">${esc(KIND(f.kind) || f.kind)}</span>
          ${conf}
          ${val(f)}
          ${f.serial?`<span class="tag mono">${esc(f.serial)}</span>`:''}
          ${f.gap_days!==null&&f.gap_days!==undefined?`<span class="tag">${esc(t('queue.daysApart', { n:short(f.gap_days) }))}</span>`:''}
          ${f.owner?`<span class="tag acc">${esc(f.owner)}</span>`:`<span class="tag">${esc(t('queue.unassigned'))}</span>`}
        </div>
      </div>
      <div style="text-align:right;flex:none">
        <div class="score"><div class="n">${f.score}</div><div class="l">${esc(t('queue.score'))}</div></div>
        <select class="sel" data-role="status" data-id="${f.id}" style="margin-top:8px">${opts}</select>
      </div></div>
    </div>`;
  }

  let queueBusy = false;
  async function loadQueue(reset){
    if (queueBusy) return;
    if (reset) {
      queueOffset = 0;
      $('#queue-list').innerHTML = `<div class="card-skeleton"></div><div class="card-skeleton"></div><div class="card-skeleton"></div>`;
    }
    queueBusy = true;
    const p = new URLSearchParams({ limit: queueLimit, offset: queueOffset });
    const st=$('#fq-status').value, sv=$('#fq-sev').value, kd=$('#fq-kind').value;
    const ow=$('#fq-owner').value.trim(), mv=$('#fq-min').value;
    if(st)p.set('status',st); if(sv)p.set('severity',sv); if(kd)p.set('kind',kd);
    if(ow)p.set('owner',ow); if(mv)p.set('minValue',mv);
    let d;
    try { d = await api('/api/findings?' + p); }
    catch(e){ queueBusy = false; panelError('#queue-list', t('tabs.queue'), e); return; }
    queueBusy = false;
    const c = d.counts || {};
    $('#queue-stats').innerHTML = `
      <span class="pill crit">${esc(t('queue.open'))} <b>${short(c.open||0)}</b></span>
      <span class="pill">${esc(t('queue.investigating'))} <b>${short(c.investigating||0)}</b></span>
      <span class="pill ok">${esc(t('queue.resolved'))} <b>${short(c.resolved||0)}</b></span>
      <span class="pill">${esc(t('queue.dismissed'))} <b>${short(c.dismissed||0)}</b></span>
      <span class="pill">${esc(t('queue.total'))} <b>${short(c.total||0)}</b></span>
      <span class="pill crit">${esc(t('queue.openValue'))} <b>${tb(c.open_value||0)}</b></span>`;
    const rows = d.rows || [];
    const html = rows.map(fCard).join('');
    if (!rows.length && reset) {
      $('#queue-list').innerHTML = `<div class="panel inline-empty"><b>${esc(t('queue.noMatchTitle'))}</b>
        <span>${esc(t('queue.noMatchBody'))}</span>
        <button class="retry-btn" data-clear-filters>${esc(t('queue.clearFilters'))}</button></div>`;
    } else if (reset) $('#queue-list').innerHTML = html;
    else $('#queue-list').insertAdjacentHTML('beforeend', html);
    const more = $('#q-more');
    more.style.display = rows.length < queueLimit ? 'none' : 'block';
    more.textContent = t('queue.loadMore', { n: short($('#queue-list').querySelectorAll('.card').length) });
  }

  document.addEventListener('change', async e => {
    const el = e.target.closest('[data-role="status"]');
    if (!el) return;
    try {
      await api('/api/findings/'+el.dataset.id, { method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status: el.value, actor:'client' }) });
      toast(t('nsp.marked', { s:I.status(el.value) }));
      loadQueue(true); loadOwnership(); loadTopExposure();
    } catch(err){ toast(t('nsp.updateFailed')); }
  });
  document.addEventListener('click', async e => {
    const c = e.target.closest('.card[data-id]');
    if (!c || e.target.tagName === 'SELECT') return;
    openFinding(+c.dataset.id);
  });

  async function openFinding(id){
    let f;
    try { f = (await api('/api/findings/' + id)).finding; }
    catch (e) { toast(t('nsp.findingNotFound')); return; }
    if (!f) { toast(t('nsp.findingNotFound')); return; }
    currentFindingId = id;

    let trail = '';
    if (f.serial) {
      let im = null;
      try { im = await api('/api/inspect/' + encodeURIComponent(f.serial)); } catch (e) { /* custody is supplementary */ }
      if (im && im.dispatches && im.dispatches.length > 1) {
        trail = `<h4 style="margin:18px 0 8px;font-size:12px;letter-spacing:.5em;
          text-transform:uppercase;color:var(--dim2)">${esc(t('finding.chain'))}</h4>
          <div class="flow">${im.dispatches.map(x => `<div class="flowstep">
            <span class="when">${esc(x.date ? dt(x.date) : '-')}</span>
            <span><span class="who">${esc(x.party)}</span>
            <span class="sub"> · ${esc(x.wing || t('ns.unknownDealer'))} · ${esc(x.family||x.sku||'')} · ${esc(tx(x.source||''))}</span></span>
          </div>`).join('')}</div>`;
      }
      if (im && im.returns && im.returns.length) trail += `<h4 style="margin:18px 0 8px;font-size:12px;letter-spacing:.5em;
        text-transform:uppercase;color:var(--dim2)">${esc(t('finding.returns'))}</h4>
        <div class="flow">${im.returns.map(r => `<div class="flowstep">
          <span class="when">${esc(r.rdate ? dt(r.rdate) : '-')}</span>
          <span><span class="who">${esc(tx(r.reason))}</span>
          <span class="sub"> — ${esc(r.merchant)} · ${money(r.price)}</span></span>
        </div>`).join('')}</div>`;
    }

    const ev = (f.evidence||[]).map(e => `<div class="evrow ${esc(e.weight)}">
      <span class="k">${esc(tx(e.label))}</span><span class="d">${esc(tx(e.detail))}</span></div>`).join('');
    const acts = f.next_actions || (f.next_action ? [f.next_action] : []);

    $('#sh-title').textContent = tx(f.title);
    $('#sh-body').innerHTML = `
      <div class="callout ${f.severity==='critical'?'bad':f.severity==='high'?'warn':'dx'}">
        <b>${esc(t('finding.diagnosis'))}${f.confidence?' · '+esc(t('ns.confidence', { c:I.confidence(f.confidence) })):''}</b>
        ${esc(f.diagnosis ? tx(f.diagnosis) : t('finding.noDiagnosis'))}
      </div>

      <dl class="kv">
        <dt>${esc(t('finding.severity'))}</dt><dd>${esc(I.severity(f.severity))} <span style="color:var(--dim2)">(${esc(t('queue.score'))} ${f.score})</span></dd>
        <dt>${esc(t('finding.type'))}</dt><dd>${esc(KIND(f.kind) || f.kind)}</dd>
        ${f.serial?`<dt>${esc(t('finding.serial'))}</dt><dd class="mono">${esc(f.serial)}</dd>`:''}
        ${f.family?`<dt>${esc(t('finding.model'))}</dt><dd>${esc(tx(f.family))}</dd>`:''}
        ${f.dealer?`<dt>${esc(t('finding.dealer'))}</dt><dd>${esc(f.dealer)}</dd>`:''}
        ${f.dealer_count?`<dt>${esc(t('finding.dealers'))}</dt><dd>${f.dealer_count}</dd>`:''}
        ${f.gap_days!==null&&f.gap_days!==undefined?`<dt>${esc(t('finding.gap'))}</dt><dd>${esc(t('finding.daysBetween', { n:short(f.gap_days) }))}</dd>`:''}
        ${f.cross_wing?`<dt>${esc(t('finding.warehouse'))}</dt><dd style="color:var(--crit)">${esc(t('finding.claimedBoth'))}</dd>`:''}
        ${f.luhn===1?`<dt>${esc(t('finding.checkDigit'))}</dt><dd style="color:var(--ok)">${esc(t('finding.validNotClone'))}</dd>`
          : f.luhn===0?`<dt>${esc(t('finding.checkDigit'))}</dt><dd style="color:var(--crit)">${esc(t('finding.invalid'))}</dd>`:''}
        <dt>${esc(t('finding.valueRisk'))}</dt><dd>${f.value_at_risk>0?money(f.value_at_risk)
          : `<span style="color:var(--dim2)">${esc(t('finding.notPriced'))}</span>`}</dd>
        ${f.value_at_risk>0?`<dt>${esc(t('finding.basis'))}</dt><dd style="color:var(--dim);font-size:12px">${esc(tx(f.value_basis||''))}</dd>`:''}
        <dt>${esc(t('finding.status'))}</dt><dd>${esc(I.status(f.status))}</dd>
        <dt>${esc(t('finding.owner'))}</dt><dd>${f.owner?esc(f.owner):`<span style="color:var(--dim2)">${esc(t('queue.unassigned'))}</span>`}</dd>
      </dl>

      ${f.detail?`<div class="cdetail" style="margin-bottom:16px">${esc(tx(f.detail))}</div>`:''}

      ${ev?`<h4 style="margin:0 0 8px;font-size:12px;letter-spacing:.5em;
        text-transform:uppercase;color:var(--dim2)">${esc(t('finding.evidence'))}</h4><div class="ev">${ev}</div>`:''}

      ${trail}

      ${acts.length?`<h4 style="margin:18px 0 4px;font-size:12px;letter-spacing:.5em;
        text-transform:uppercase;color:var(--dim2)">${esc(t('finding.doNext'))}</h4>
        <ol class="actionlist">${acts.map(a=>`<li>${esc(tx(a))}</li>`).join('')}</ol>`:''}

      <h4 style="margin:18px 0 8px;font-size:12px;letter-spacing:.5em;
        text-transform:uppercase;color:var(--dim2)">${esc(t('finding.assign'))}</h4>
      <input id="f-owner" class="sel" style="width:100%;padding:9px 11px;margin-bottom:8px"
        placeholder="${esc(t('finding.ownerPlaceholder'))}" value="${esc(f.owner||'')}">
      <textarea id="f-note" class="note-in"
        placeholder="${esc(t('finding.notePlaceholder'))}">${esc(f.resolution||'')}</textarea>
      <div class="sheet-actions">
        ${STATUS.map(s=>`<button class="${s===f.status?'primary':''}" data-set="${s}">${esc(I.status(s))}</button>`).join('')}
      </div>`;
    openSheet();
    $('#sh-body').querySelectorAll('[data-set]').forEach(b =>
      b.addEventListener('click', () => saveFinding(id,{status:b.dataset.set})));
  }

  let sheetReturnFocus = null;
  function openSheet(){
    sheetReturnFocus = document.activeElement;
    const sheet = $('#sheet');
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sheet-open');
    setTimeout(()=>{ const b=$('#sh-close'); if(b) b.focus(); }, 30);
  }
  function closeSheet(){
    currentFindingId = null;
    const sheet = $('#sheet');
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('sheet-open');
    if (sheetReturnFocus && sheetReturnFocus.focus) sheetReturnFocus.focus();
  }

  async function saveFinding(id, patch){
    patch.owner   = $('#f-owner') ? $('#f-owner').value.trim() : undefined;
    patch.resolution = $('#f-note') ? $('#f-note').value.trim() : undefined;
    try{
      await api('/api/findings/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(patch)});
      closeSheet();
      toast(t('nsp.saved'), 'success'); refreshAll(); if (window.SuiteRefresh) window.SuiteRefresh();
    }catch(e){ toast(t('nsp.saveFailed', { e:(e.message||t('queue.unknownError')) }), 'error'); }
  }
  $('#sh-close').addEventListener('click', closeSheet);
  $('#sheet').addEventListener('click', e=>{ if(e.target.id==='sheet') closeSheet(); });
  $('#sheet').addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    const focusable = Array.from($('#sheet').querySelectorAll('button, input, textarea, a[href], [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // ------------------------------------------------ inspector
  async function inspect(serial){
    const out = $('#ins-out');
    out.innerHTML = `<div class="panel"><p class="hint">${esc(t('inspect.inspecting'))}</p></div>`;
    let d;
    try { d = await api('/api/inspect/' + encodeURIComponent(serial)); }
    catch(e){ out.innerHTML = `<div class="panel"><p class="hint">${esc(t('inspect.unreachable'))}</p></div>`; return; }

    if (!d.dispatches.length && !d.returns.length) {
      out.innerHTML = `<div class="panel"><h3>${esc(t('inspect.notFound'))}</h3>
        <p class="hint">${esc(t('inspect.notFoundHint', { serial }))}</p></div>`;
      return;
    }

    const f0 = d.dispatches[0];
    const chips = [
      `<span class="tag acc">${esc(tx(d.serialKind))}</span>`,
      d.luhn === true  ? `<span class="tag ok">${esc(t('inspect.checkValid'))}</span>` :
      d.luhn === false ? `<span class="tag crit">${esc(t('inspect.checkInvalid'))}</span>` :
      `<span class="tag">${esc(t('inspect.checkNA'))}</span>`,
      d.tac ? `<span class="tag mono">TAC ${esc(d.tac)}</span>` : '',
      f0 ? `<span class="tag">${esc(f0.family||f0.sku)}</span>` : ''
    ].join('');

    let diagHtml = '';
    if (d.diagnosis) {
      const dx = d.diagnosis;
      diagHtml = `<div class="panel">
        <h3>${esc(t('ns.reasoning'))}</h3>
        <div class="callout bad"><b>${esc(t('finding.diagnosis'))} · ${esc(t('ns.confidence', { c:I.confidence(dx.confidence) }))}</b>${esc(tx(dx.diagnosis))}</div>
        <h4 style="margin:0 0 8px;font-size:12px;letter-spacing:.5em;text-transform:uppercase;
          color:var(--dim2)">${esc(t('finding.evidence'))}</h4>
        <div class="ev">${dx.evidence.map(e=>`<div class="evrow ${esc(e.weight)}">
          <span class="k">${esc(tx(e.label))}</span><span class="d">${esc(tx(e.detail))}</span></div>`).join('')}</div>
        <h4 style="margin:18px 0 4px;font-size:12px;letter-spacing:.5em;text-transform:uppercase;
          color:var(--dim2)">${esc(t('finding.doNext'))}</h4>
        <ol class="actionlist">${dx.nextActions.map(a=>`<li>${esc(tx(a))}</li>`).join('')}</ol>
      </div>`;
    }

    const tacHtml = d.tacFamilies.length > 1 ? `<div class="panel">
      <h3>${esc(t('inspect.prefixAnalysis'))}</h3>
      <p class="hint">${esc(t('inspect.prefixHint', { tac:d.tac, n:short(d.tacFamilies.length) }))}</p>
      ${d.tacFamilies.map(f=>`<div class="bar"><span class="lab">${esc(f.family)}</span>
        <span class="track"><span class="fill" style="width:${(f.n/Math.max(...d.tacFamilies.map(x=>x.n))*100).toFixed(0)}%"></span></span>
        <span class="num">${short(f.n)}</span></div>`).join('')}
    </div>` : '';

    out.innerHTML = `
      <div class="panel">
        <h3 class="mono" style="font-size:16px">${esc(d.serial)}</h3>
        <div class="cmeta" style="margin-top:8px">${chips}</div>
        ${d.price?`<p class="hint" style="margin:12px 0 0">${esc(t('inspect.price'))}
          <b style="color:var(--fg)">${money(d.price.typical)}</b>
          (${esc(t('inspect.range'))} ${money(d.price.min)}–${money(d.price.max)}, ${short(d.price.samples)} ${esc(t('inspect.loggedReturns'))})</p>`:''}
      </div>
      <div class="panel">
        <h3>${esc(t('inspect.dispatchTrail'))}</h3>
        <div class="flow">${d.dispatches.map(x=>`<div class="flowstep">
          <span class="when">${esc(x.date ? dt(x.date) : '-')}</span>
          <span><span class="who">${esc(x.party)}</span>
          <span class="sub"> · ${esc(x.wing || t('ns.unknownDealer'))} ${esc(t('inspect.wing'))} · ${esc(x.family||x.sku||'')} · ${esc(tx(x.source||''))}</span></span>
        </div>`).join('')}</div>
        ${d.relatedCount?`<p class="hint" style="margin:14px 0 0">
          ${esc(t('inspect.related', { n:short(d.relatedCount) }))}</p>`:''}
      </div>
      ${diagHtml}
      ${d.returns.length?`<div class="panel"><h3>${esc(t('ns.returns'))}</h3>
        <div class="flow">${d.returns.map(r=>`<div class="flowstep">
          <span class="when">${esc(r.rdate ? dt(r.rdate) : '-')}</span>
          <span><span class="who">${esc(tx(r.reason))}</span>
          <span class="sub"> — ${esc(r.merchant)} · ${money(r.price)}</span></span>
        </div>`).join('')}</div></div>`:''}
      ${tacHtml}
      ${d.findings.length?`<div class="panel"><h3>${esc(t('inspect.openFindings'))}</h3>
        ${d.findings.map(f=>`<div class="card sev-${esc(f.severity)} static" style="margin-bottom:8px">
          <h4 class="ctitle">${esc(tx(f.title))}</h4>
          <p class="cdiag">${esc(tx(f.diagnosis||''))}</p>
          <div class="cmeta"><span class="tag ${f.severity==='critical'?'crit':'high'}">${esc(I.severity(f.severity))}</span>
          <span class="tag">${esc(I.status(f.status))}</span>${val(f)}</div></div>`).join('')}</div>`:''}`;
  }

  $('#ins-go').addEventListener('click', ()=>{ const s=$('#ins-q').value.trim(); if(s) inspect(s); });
  $('#ins-q').addEventListener('keydown', e=>{ if(e.key==='Enter'){ const s=$('#ins-q').value.trim(); if(s) inspect(s); }});
  $$('#inspect .chipbtn').forEach(b=>b.addEventListener('click',()=>{ $('#ins-q').value=b.dataset.s; inspect(b.dataset.s); }));

  // ------------------------------------------------ exposure
  async function loadTopExposure(){
    const v = $('#top-exposure-val');
    try{
      v.setAttribute('aria-busy', 'true');
      const p = await api('/api/portfolio');
      v.textContent = tb(p.exposure.open_total||0);
      v.removeAttribute('aria-busy');
    }catch(e){ v.textContent='—'; v.title=t('exposure.openExposure') + ': ' + (e.message||''); v.removeAttribute('aria-busy'); }
  }

  async function loadExposure(){
    let d; try { d = await api('/api/portfolio'); } catch(e){ panelError('#exp-cards', t('tabs.exposure'), e); return; }
    const e = d.exposure, st = d.stats;
    $('#exp-cards').innerHTML = [
      [t('exposure.openExposure'), tb(e.open_total), t('exposure.openSub'), 'crit'],
      [t('exposure.critical'), short((d.bySeverity.find(s=>s.severity==='critical')||{}).n||0),
        t('exposure.criticalSub', { v:tb((d.bySeverity.find(s=>s.severity==='critical')||{}).value||0) }),'crit'],
      [t('exposure.duplicateFindings'), short(st.crossDup), t('exposure.duplicateSub'),'warn'],
      [t('exposure.pricedItems'), short(e.priced_items), t('exposure.pricedSub'),''],
      [t('exposure.findings'), short(st.findings), t('exposure.findingsSub', { n:short(st.openFindings) }),''],
      [t('exposure.uniqueSerials'), short(st.uniqueSerials), t('exposure.uniqueSub'),'acc']
    ].map(([k,v,s,c])=>`<div class="stat ${c}"><div class="k">${k}</div>
      <div class="v">${v}</div><div class="s">${s}</div></div>`).join('');

    const sevOrder=['critical','high','medium','low'];
    const mx=Math.max(1,...d.bySeverity.map(x=>x.value||0));
    $('#exp-sev').innerHTML = sevOrder.map(k=>{
      const r = d.bySeverity.find(x=>x.severity===k);
      return `<div class="bar"><span class="lab">${esc(I.severity(k))}</span>
        <span class="track"><span class="fill ${k==='critical'?'crit':k==='high'?'high':k==='medium'?'med':'low'}"
        style="width:${((r&&r.value||0)/mx*100).toFixed(1)}%"></span></span>
        <span class="num">${short((r&&r.n)||0)} · ${tb((r&&r.value)||0)}</span></div>`;
    }).join('');

    const md=Math.max(1,...d.byDiagnosis.map(x=>x.n||0));
    $('#exp-diag').innerHTML = d.byDiagnosis.map(x=>`<div class="bar">
      <span class="lab" title="${esc(tx(x.diagnosis))}">${esc(tx(x.diagnosis).slice(0,58))}</span>
      <span class="track"><span class="fill" style="width:${((x.n/md)*100).toFixed(1)}%"></span></span>
      <span class="num">${short(x.n)}${x.value?' · '+tb(x.value):''}</span></div>`).join('');

    $('#exp-top').innerHTML = d.topValue.map(v=>`<div class="card sev-high static">
      <div class="crow"><div>
        <h4 class="ctitle mono">${esc(v.serial)}</h4>
        <p class="cdiag">${esc(tx(v.diagnosis||''))}</p>
        <div class="cmeta"><span class="tag high">${esc(t('queue.score'))} ${v.score}</span>
          <span class="tag">${esc(v.family||'')}</span>
          ${v.dealer?`<span class="tag">${esc(v.dealer)}</span>`:''}
          <span class="tag val">${money(v.value)}</span></div>
      </div></div></div>`).join('');

    const mb=Math.max(1,...d.priceBook.map(x=>x.typical||0));
    $('#exp-book').innerHTML = d.priceBook.map(p=>`<div class="bar">
      <span class="lab">${esc(p.family)}</span>
      <span class="track"><span class="fill low" style="width:${((p.typical/mb)*100).toFixed(1)}%"></span></span>
      <span class="num">${money(p.typical)} · ${p.samples}×</span></div>`).join('');
  }

  // ------------------------------------------------ flows
  async function loadChains(){
    let d; try { d = await api('/api/chains'); } catch(e){ panelError('#chain-list', t('tabs.chains'), e); return; }
    const rows = d.rows || [];
    $('#chain-list').innerHTML = rows.length ? rows.map(c=>`<div class="chainbox">
      <div class="chainflow">${esc(c.from_party)}<span class="arrow">→</span>${esc(c.to_party)}</div>
      <div class="cmeta">
        <span class="tag crit">${esc(t('chains.serials', { n:short(c.count) }))}</span>
        ${c.value>0?`<span class="tag val">${tb(c.value)}</span>`:`<span class="tag">${esc(t('queue.unpriced'))}</span>`}
      </div>
      <p class="hint" style="margin:9px 0 6px">${esc(tx(c.verdict))}</p>
      <div class="serials">${c.sample.map(s=>esc(s)).join('<br>')}</div>
    </div>`).join('') : `<p class="hint">${esc(t('chains.noRepeated'))}</p>`;
  }

  // ------------------------------------------------ dealers
  async function loadDealers(){
    const s = $('#dl-search').value.trim();
    let d; try { d = await api('/api/dealers?limit=200' + (s?'&q='+encodeURIComponent(s):'')); }
    catch(e){ panelError('#dealer-list', t('tabs.dealers'), e); return; }
    const dealerRows = d.rows||[];
    if (!dealerRows.length) {
      $('#dealer-list').innerHTML = `<div class="panel inline-empty"><b>${esc(t('dealers.noFound'))}</b><span>${esc(t('dealers.noFoundHint'))}</span></div>`;
      return;
    }
    $('#dealer-list').innerHTML = dealerRows.map(x=>{
      let al = [];
      try { al = JSON.parse(x.aliases||'[]'); } catch(e) { al = []; }
      const rate = x.serials ? (x.cross_dup/x.serials*100) : 0;
      return `<div class="card ${x.cross_dup?'sev-high':'sev-low'} static">
        <h4 class="ctitle">${esc(x.name)}</h4>
        <div class="cdetail">${al.length>1?esc(al.join(' · ')):'—'}</div>
        <div class="cmeta">
          <span class="tag">${esc(t('dealers.units', { n:short(x.units) }))}</span>
          <span class="tag">${esc(t('dealers.serials', { n:short(x.serials) }))}</span>
          ${x.cross_dup?`<span class="tag crit">${esc(t('dealers.inTwo', { n:short(x.cross_dup) }))}</span>`:''}
          ${x.cross_dup?`<span class="tag high">${esc(t('dealers.ofStock', { n:new Intl.NumberFormat(I.locale==='bn'?'bn-BD':I.locale==='zh'?'zh-CN':'en-IN', { maximumFractionDigits:1 }).format(rate) }))}</span>`:''}
          ${x.first?`<span class="tag">${esc(dt(String(x.first).slice(0,10)))} → ${esc(dt(String(x.last).slice(0,10)))}</span>`:''}
        </div></div>`;
    }).join('');
  }

  // ------------------------------------------------ ownership
  async function loadOwnership(){
    let d; try { d = await api('/api/ownership'); } catch(e){ panelError('#own-cards', t('tabs.ownership'), e); return; }
    $('#own-cards').innerHTML = [
      [t('ownership.unassigned'), short(d.unassigned.c), t('ownership.unassignedSub', { v:tb(d.unassigned.amt) }),'crit'],
      [t('ownership.people'), String(d.people.filter(p=>p.owner).length),'','acc'],
      [t('ownership.totalFindings'), short(d.byKind.reduce((a,b)=>a+b.n,0)),'','ok']
    ].map(([k,v,s,c])=>`<div class="stat ${c}"><div class="k">${k}</div>
      <div class="v">${v}</div><div class="s">${s}</div></div>`).join('') +
      d.people.filter(p=>p.owner).map(p=>`<div class="stat">
        <div class="k">${esc(p.owner)}</div>
        <div class="v">${short(p.open)}</div>
        <div class="s">${esc(t('ownership.openOf', { total:short(p.total) }))} · ${esc(t('ownership.resolved', { n:short(p.resolved) }))}</div></div>`).join('');

    const mx=Math.max(1,...d.byKind.map(x=>x.n));
    $('#own-kinds').innerHTML = d.byKind.map(x=>`<div class="bar">
      <span class="lab">${esc(KIND(x.kind) || x.kind)}</span>
      <span class="track"><span class="fill ${x.severity==='critical'?'crit':x.severity==='high'?'high':x.severity==='medium'?'med':'low'}"
        style="width:${(x.n/mx*100).toFixed(1)}%"></span></span>
      <span class="num">${short(x.n)}${x.amt?' · '+tb(x.amt):''}</span></div>`).join('');
  }

  // ------------------------------------------------ wiring
  const LOADERS = { queue:()=>loadQueue(true), inspect:()=>{}, exposure:loadExposure,
                    chains:loadChains, dealers:loadDealers, ownership:loadOwnership };
  function activateTab(tab){
    const b = document.querySelector(`#tabs button[data-tab="${tab}"]`);
    if (b) b.click();
  }
  $$('#tabs button').forEach((b, i, all) => {
    b.addEventListener('click', ()=>{
      all.forEach(x=>{ x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      $$('.ws-devices .view').forEach(v=>v.classList.remove('active'));
      b.classList.add('active'); b.setAttribute('aria-selected','true');
      $('#'+b.dataset.tab).classList.add('active');
      LOADERS[b.dataset.tab]();
    });
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
      next.focus(); next.click();
    });
  });

  ['#fq-status','#fq-sev','#fq-kind'].forEach(s=>$(s).addEventListener('change',()=>loadQueue(true)));
  window._debounce = window._debounce || {};
  const debounceFor = (key, fn) => () => {
    clearTimeout(window._debounce[key]);
    window._debounce[key] = setTimeout(fn, 340);
  };
  $('#fq-owner').addEventListener('input', debounceFor('owner', ()=>loadQueue(true)));
  $('#fq-min').addEventListener('input', debounceFor('min', ()=>loadQueue(true)));
  function clearQueueFilters(){
    ['#fq-status','#fq-sev','#fq-kind','#fq-owner','#fq-min'].forEach(s=>$(s).value='');
    loadQueue(true);
  }
  $('#fq-clear').addEventListener('click', clearQueueFilters);
  $('#q-more').addEventListener('click', ()=>{ if (queueBusy) return; queueOffset+=queueLimit; loadQueue(); });
  $('#dl-search').addEventListener('input', debounceFor('dealers', loadDealers));
  document.addEventListener('click', e => {
    if (e.target.closest('[data-clear-filters]')) clearQueueFilters();
    if (e.target.closest('[data-retry]')) {
      refreshAll(); loadExposure(); loadChains(); loadDealers(); loadOwnership();
    }
  });

  $('#syncbtn').addEventListener('click', async ()=>{
    const b=$('#syncbtn'), label=b.querySelector('.btn-label');
    if (b.disabled) return;
    b.disabled = true; b.classList.add('busy');
    if (label) label.textContent = t('top.syncing');
    try{
      const res = await api('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      toast(t('nsp.syncComplete', { n:short((res.stats||{}).dispatches||0) }), 'success');
      refreshAll();
      if (window.SuiteRefresh) window.SuiteRefresh();
    }
    catch(e){ toast(t('nsp.syncFailed', { e:(e.message||t('queue.unknownError')) }), 'error'); }
    b.classList.remove('busy'); b.disabled = false;
    if (label) label.textContent = t('top.sync');
  });

  function refreshAll(){
    const tab = currentTab();
    (LOADERS[tab]||loadQueue)();
    loadTopExposure();
  }

  window.addEventListener('suite:localechange', () => {
    loadTopExposure();
    if (currentFindingId && $('#sheet').classList.contains('open')) openFinding(currentFindingId);
  });

  connect(); loadQueue(true); loadTopExposure();

  // Surface the NSpector actions the merged shell needs to drive.
  window.NSpectorUI = {
    inspect, openFinding, closeFindingSheet: closeSheet, refreshAll, activateTab, loadQueue,
    get currentTab(){ return currentTab(); }
  };
})();