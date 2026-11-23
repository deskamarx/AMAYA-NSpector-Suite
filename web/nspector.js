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
  const money = n => 'Tk ' + Math.round(n || 0).toLocaleString('en-IN');
  const short = n => (n || 0).toLocaleString('en-IN');
  const tb = n => { // compact taka
    n = n || 0;
    if (n >= 10000000) return 'Tk ' + (n/10000000).toFixed(2) + ' Cr';
    if (n >= 100000)   return 'Tk ' + (n/100000).toFixed(2) + ' L';
    if (n >= 1000)     return 'Tk ' + (n/1000).toFixed(0) + 'k';
    return 'Tk ' + n.toLocaleString('en-IN');
  };
  const KIND = {
    duplicate_cross:'two dealers', duplicate_multi:'3+ dealers', orphan_return:'never dispatched',
    imei_lock:'IMEI problem', no_serial_return:'untraceable', luhn_invalid:'invalid serial',
    tac_conflict:'prefix conflict'
  };
  const STATUS = ['open','investigating','resolved','dismissed'];

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
    if (el) el.innerHTML = `<div class="panel-error"><b>${esc(label)} unavailable</b>
      <span>${esc((err && err.message) || 'Unknown error')}</span>
      <button class="retry-btn" data-retry="${id.slice(1)}">Try again</button></div>`;
  };
  const val = f => f.value_at_risk > 0
    ? `<span class="tag val">${money(f.value_at_risk)}</span>`
    : (f.kind === 'duplicate_cross' || f.kind === 'duplicate_multi'
        ? `<span class="tag" title="${esc(f.value_basis||'')}">unpriced</span>` : '');

  // ------------------------------------------------ live connection
  function connect(){
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    try { ws = new WebSocket(`${proto}://${location.host}/ws`); } catch(e){ return retryConnect(); }
    ws.onopen = () => { retry = 0; syncState('live','live sync'); };
    ws.onclose = () => { syncState('off','reconnecting…'); retryConnect(); };
    ws.onerror = () => { try { ws.close(); } catch(e){} };
    ws.onmessage = e => {
      let d; try { d = JSON.parse(e.data); } catch(x){ return; }
      if (d.type === 'synced') {
        toast('Synced · ' + short((d.stats || {}).dispatches || 0) + ' records', 'success');
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
    if (retry >= 7) { syncState('off','live sync paused'); return; }
    setTimeout(connect, 500*Math.pow(2,retry));
  }
  function syncState(cls,txt){
    const el=$('#syncstate');
    if (el) { el.textContent=txt; el.className=cls; el.title = cls==='live' ? 'Live sync connected' : 'Click to reconnect'; }
  }
  $('#syncstate').addEventListener('click', () => { retry = 0; connect(); toast('Reconnecting live sync…'); });
  function currentTab(){ const b=$('#tabs button.active'); return b ? b.dataset.tab : 'queue'; }

  // ------------------------------------------------ work queue
  function fCard(f){
    const opts = STATUS.map(s=>`<option value="${s}"${f.status===s?' selected':''}>${s}</option>`).join('');
    const conf = f.confidence
      ? `<span class="tag ${f.confidence==='high'?'ok':f.confidence==='medium'?'med':''}">${f.confidence} confidence</span>` : '';
    return `<div class="card sev-${esc(f.severity)}" data-id="${f.id}">
      <div class="crow"><div>
        <h4 class="ctitle">${esc(f.title)}</h4>
        ${f.diagnosis ? `<p class="cdiag">${esc(f.diagnosis)}</p>` : ''}
        <div class="cdetail">${esc(f.detail||'')}</div>
        <div class="cmeta">
          <span class="tag ${f.severity==='critical'?'crit':f.severity==='high'?'high':f.severity==='medium'?'med':'low'}">${esc(f.severity)}</span>
          <span class="tag">${esc(KIND[f.kind]||f.kind)}</span>
          ${conf}
          ${val(f)}
          ${f.serial?`<span class="tag mono">${esc(f.serial)}</span>`:''}
          ${f.gap_days!==null&&f.gap_days!==undefined?`<span class="tag">${f.gap_days}d apart</span>`:''}
          ${f.owner?`<span class="tag acc">${esc(f.owner)}</span>`:'<span class="tag">unassigned</span>'}
        </div>
      </div>
      <div style="text-align:right;flex:none">
        <div class="score"><div class="n">${f.score}</div><div class="l">score</div></div>
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
    catch(e){ queueBusy = false; panelError('#queue-list', 'Work queue', e); return; }
    queueBusy = false;
    const c = d.counts || {};
    $('#queue-stats').innerHTML = `
      <span class="pill crit">Open <b>${short(c.open||0)}</b></span>
      <span class="pill">Investigating <b>${short(c.investigating||0)}</b></span>
      <span class="pill ok">Resolved <b>${short(c.resolved||0)}</b></span>
      <span class="pill">Dismissed <b>${short(c.dismissed||0)}</b></span>
      <span class="pill">Total <b>${short(c.total||0)}</b></span>
      <span class="pill crit">Open value <b>${tb(c.open_value||0)}</b></span>`;
    const rows = d.rows || [];
    const html = rows.map(fCard).join('');
    if (!rows.length && reset) {
      $('#queue-list').innerHTML = `<div class="panel inline-empty"><b>No findings match these filters</b>
        <span>Clear a filter or widen the value range to see more of the ledger.</span>
        <button class="retry-btn" data-clear-filters>Clear filters</button></div>`;
    } else if (reset) $('#queue-list').innerHTML = html;
    else $('#queue-list').insertAdjacentHTML('beforeend', html);
    const more = $('#q-more');
    more.style.display = rows.length < queueLimit ? 'none' : 'block';
    more.textContent = 'Load more · ' + short($('#queue-list').querySelectorAll('.card').length) + ' shown';
  }

  document.addEventListener('change', async e => {
    const el = e.target.closest('[data-role="status"]');
    if (!el) return;
    try {
      await api('/api/findings/'+el.dataset.id, { method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status: el.value, actor:'client' }) });
      toast('Marked ' + el.value);
      loadQueue(true); loadOwnership(); loadTopExposure();
    } catch(err){ toast('Update failed'); }
  });
  document.addEventListener('click', async e => {
    const c = e.target.closest('.card[data-id]');
    if (!c || e.target.tagName === 'SELECT') return;
    openFinding(+c.dataset.id);
  });

  async function openFinding(id){
    let f;
    try { f = (await api('/api/findings/' + id)).finding; }
    catch (e) { toast('Finding not found'); return; }
    if (!f) { toast('Finding not found'); return; }

    let trail = '';
    if (f.serial) {
      let im = null;
      try { im = await api('/api/inspect/' + encodeURIComponent(f.serial)); } catch (e) { /* custody is supplementary */ }
      if (im && im.dispatches && im.dispatches.length > 1) {
        trail = `<h4 style="margin:18px 0 8px;font-size:12px;letter-spacing:.5em;
          text-transform:uppercase;color:var(--dim2)">Chain of custody</h4>
          <div class="flow">${im.dispatches.map(x => `<div class="flowstep">
            <span class="when">${esc(x.date||'-')}</span>
            <span><span class="who">${esc(x.party)}</span>
            <span class="sub"> · ${esc(x.wing||'-')} · ${esc(x.family||x.sku||'')} · ${esc(x.source||'')}</span></span>
          </div>`).join('')}</div>`;
      }
      if (im && im.returns && im.returns.length) trail += `<h4 style="margin:18px 0 8px;font-size:12px;letter-spacing:.5em;
        text-transform:uppercase;color:var(--dim2)">Returns</h4>
        <div class="flow">${im.returns.map(r => `<div class="flowstep">
          <span class="when">${esc(r.rdate)}</span>
          <span><span class="who">${esc(r.reason)}</span>
          <span class="sub"> — ${esc(r.merchant)} · ${money(r.price)}</span></span>
        </div>`).join('')}</div>`;
    }

    const ev = (f.evidence||[]).map(e => `<div class="evrow ${esc(e.weight)}">
      <span class="k">${esc(e.label)}</span><span class="d">${esc(e.detail)}</span></div>`).join('');
    const acts = f.next_actions || (f.next_action ? [f.next_action] : []);

    $('#sh-title').textContent = f.title;
    $('#sh-body').innerHTML = `
      <div class="callout ${f.severity==='critical'?'bad':f.severity==='high'?'warn':'dx'}">
        <b>Diagnosis${f.confidence?' · '+f.confidence+' confidence':''}</b>
        ${esc(f.diagnosis||'No diagnosis recorded for this finding.')}
      </div>

      <dl class="kv">
        <dt>Severity</dt><dd>${esc(f.severity)} <span style="color:var(--dim2)">(score ${f.score})</span></dd>
        <dt>Type</dt><dd>${esc(KIND[f.kind]||f.kind)}</dd>
        ${f.serial?`<dt>Serial</dt><dd class="mono">${esc(f.serial)}</dd>`:''}
        ${f.family?`<dt>Model</dt><dd>${esc(f.family)}</dd>`:''}
        ${f.dealer?`<dt>Dealer</dt><dd>${esc(f.dealer)}</dd>`:''}
        ${f.dealer_count?`<dt>Dealers</dt><dd>${f.dealer_count}</dd>`:''}
        ${f.gap_days!==null&&f.gap_days!==undefined?`<dt>Gap</dt><dd>${f.gap_days} days between dispatches</dd>`:''}
        ${f.cross_wing?`<dt>Warehouse</dt><dd style="color:var(--crit)">claimed by both wings</dd>`:''}
        ${f.luhn===1?`<dt>Check digit</dt><dd style="color:var(--ok)">valid — not a clone or corruption</dd>`
          : f.luhn===0?`<dt>Check digit</dt><dd style="color:var(--crit)">invalid</dd>`:''}
        <dt>Value at risk</dt><dd>${f.value_at_risk>0?money(f.value_at_risk)
          : '<span style="color:var(--dim2)">not priced</span>'}</dd>
        ${f.value_at_risk>0?`<dt>Basis</dt><dd style="color:var(--dim);font-size:12px">${esc(f.value_basis||'')}</dd>`:''}
        <dt>Status</dt><dd>${esc(f.status)}</dd>
        <dt>Owner</dt><dd>${f.owner?esc(f.owner):'<span style="color:var(--dim2)">unassigned</span>'}</dd>
      </dl>

      ${f.detail?`<div class="cdetail" style="margin-bottom:16px">${esc(f.detail)}</div>`:''}

      ${ev?`<h4 style="margin:0 0 8px;font-size:12px;letter-spacing:.5em;
        text-transform:uppercase;color:var(--dim2)">Evidence</h4><div class="ev">${ev}</div>`:''}

      ${trail}

      ${acts.length?`<h4 style="margin:18px 0 4px;font-size:12px;letter-spacing:.5em;
        text-transform:uppercase;color:var(--dim2)">Do this next</h4>
        <ol class="actionlist">${acts.map(a=>`<li>${esc(a)}</li>`).join('')}</ol>`:''}

      <h4 style="margin:18px 0 8px;font-size:12px;letter-spacing:.5em;
        text-transform:uppercase;color:var(--dim2)">Assign and record</h4>
      <input id="f-owner" class="sel" style="width:100%;padding:9px 11px;margin-bottom:8px"
        placeholder="Who is responsible for closing this?" value="${esc(f.owner||'')}">
      <textarea id="f-note" class="note-in"
        placeholder="What was found, what was done">${esc(f.resolution||'')}</textarea>
      <div class="sheet-actions">
        ${STATUS.map(s=>`<button class="${s===f.status?'primary':''}" data-set="${s}">${s}</button>`).join('')}
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
      toast('Saved', 'success'); refreshAll(); if (window.SuiteRefresh) window.SuiteRefresh();
    }catch(e){ toast('Save failed — ' + (e.message||'unknown error'), 'error'); }
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
    out.innerHTML = '<div class="panel"><p class="hint">Inspecting…</p></div>';
    let d;
    try { d = await api('/api/inspect/' + encodeURIComponent(serial)); }
    catch(e){ out.innerHTML = '<div class="panel"><p class="hint">Could not reach the server.</p></div>'; return; }

    if (!d.dispatches.length && !d.returns.length) {
      out.innerHTML = `<div class="panel"><h3>Not found</h3>
        <p class="hint">${esc(serial)} does not appear in any dispatch record or return.
        Check for a typo, or note that the unit may predate this ledger.</p></div>`;
      return;
    }

    const f0 = d.dispatches[0];
    const chips = [
      `<span class="tag acc">${esc(d.serialKind)}</span>`,
      d.luhn === true  ? '<span class="tag ok">check digit valid</span>' :
      d.luhn === false ? '<span class="tag crit">check digit invalid</span>' :
      '<span class="tag">check digit not applicable</span>',
      d.tac ? `<span class="tag mono">TAC ${esc(d.tac)}</span>` : '',
      f0 ? `<span class="tag">${esc(f0.family||f0.sku)}</span>` : ''
    ].join('');

    let diagHtml = '';
    if (d.diagnosis) {
      const dx = d.diagnosis;
      diagHtml = `<div class="panel">
        <h3>Reasoning</h3>
        <div class="callout bad"><b>Diagnosis · ${esc(dx.confidence)} confidence</b>${esc(dx.diagnosis)}</div>
        <h4 style="margin:0 0 8px;font-size:12px;letter-spacing:.5em;text-transform:uppercase;
          color:var(--dim2)">Evidence</h4>
        <div class="ev">${dx.evidence.map(e=>`<div class="evrow ${esc(e.weight)}">
          <span class="k">${esc(e.label)}</span><span class="d">${esc(e.detail)}</span></div>`).join('')}</div>
        <h4 style="margin:18px 0 4px;font-size:12px;letter-spacing:.5em;text-transform:uppercase;
          color:var(--dim2)">Do this next</h4>
        <ol class="actionlist">${dx.nextActions.map(a=>`<li>${esc(a)}</li>`).join('')}</ol>
      </div>`;
    }

    const tacHtml = d.tacFamilies.length > 1 ? `<div class="panel">
      <h3>Prefix analysis</h3>
      <p class="hint">Prefix ${esc(d.tac)} appears against ${d.tacFamilies.length} models.
      A Type Allocation Code identifies one model, so this is a mapping problem or a
      mis-entry.</p>
      ${d.tacFamilies.map(f=>`<div class="bar"><span class="lab">${esc(f.family)}</span>
        <span class="track"><span class="fill" style="width:${(f.n/Math.max(...d.tacFamilies.map(x=>x.n))*100).toFixed(0)}%"></span></span>
        <span class="num">${short(f.n)}</span></div>`).join('')}
    </div>` : '';

    out.innerHTML = `
      <div class="panel">
        <h3 class="mono" style="font-size:16px">${esc(d.serial)}</h3>
        <div class="cmeta" style="margin-top:8px">${chips}</div>
        ${d.price?`<p class="hint" style="margin:12px 0 0">Observed price for this model:
          <b style="color:var(--fg)">${money(d.price.typical)}</b>
          (range ${money(d.price.min)}–${money(d.price.max)}, ${d.price.samples} logged returns)</p>`:''}
      </div>
      <div class="panel">
        <h3>Dispatch trail</h3>
        <div class="flow">${d.dispatches.map(x=>`<div class="flowstep">
          <span class="when">${esc(x.date||'-')}</span>
          <span><span class="who">${esc(x.party)}</span>
          <span class="sub"> · ${esc(x.wing||'-')} wing · ${esc(x.family||x.sku||'')} · ${esc(x.source||'')}</span></span>
        </div>`).join('')}</div>
        ${d.relatedCount?`<p class="hint" style="margin:14px 0 0">
          ${short(d.relatedCount)} other serials moved through the same dealer(s) as this one.</p>`:''}
      </div>
      ${diagHtml}
      ${d.returns.length?`<div class="panel"><h3>Returns</h3>
        <div class="flow">${d.returns.map(r=>`<div class="flowstep">
          <span class="when">${esc(r.rdate)}</span>
          <span><span class="who">${esc(r.reason)}</span>
          <span class="sub"> — ${esc(r.merchant)} · ${money(r.price)}</span></span>
        </div>`).join('')}</div></div>`:''}
      ${tacHtml}
      ${d.findings.length?`<div class="panel"><h3>Open findings on this serial</h3>
        ${d.findings.map(f=>`<div class="card sev-${esc(f.severity)} static" style="margin-bottom:8px">
          <h4 class="ctitle">${esc(f.title)}</h4>
          <p class="cdiag">${esc(f.diagnosis||'')}</p>
          <div class="cmeta"><span class="tag ${f.severity==='critical'?'crit':'high'}">${esc(f.severity)}</span>
          <span class="tag">${esc(f.status)}</span>${val(f)}</div></div>`).join('')}</div>`:''}`;
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
    }catch(e){ v.textContent='—'; v.title='Could not load exposure: '+(e.message||''); v.removeAttribute('aria-busy'); }
  }

  async function loadExposure(){
    let d; try { d = await api('/api/portfolio'); } catch(e){ panelError('#exp-cards', 'Exposure', e); return; }
    const e = d.exposure, st = d.stats;
    $('#exp-cards').innerHTML = [
      ['Open exposure', tb(e.open_total), 'valued at observed prices', 'crit'],
      ['Critical', short((d.bySeverity.find(s=>s.severity==='critical')||{}).n||0),
        tb((d.bySeverity.find(s=>s.severity==='critical')||{}).value||0)+' at risk','crit'],
      ['Duplicate findings', short(st.crossDup), 'serials in 2+ dealers','warn'],
      ['Items with a price', short(e.priced_items), 'rest are real but unpriced',''],
      ['Findings', short(st.findings), short(st.openFindings)+' still open',''],
      ['Unique serials', short(st.uniqueSerials), 'physical units tracked','acc']
    ].map(([k,v,s,c])=>`<div class="stat ${c}"><div class="k">${k}</div>
      <div class="v">${v}</div><div class="s">${s}</div></div>`).join('');

    const sevOrder=['critical','high','medium','low'];
    const mx=Math.max(1,...d.bySeverity.map(x=>x.value||0));
    $('#exp-sev').innerHTML = sevOrder.map(k=>{
      const r = d.bySeverity.find(x=>x.severity===k);
      return `<div class="bar"><span class="lab">${k}</span>
        <span class="track"><span class="fill ${k==='critical'?'crit':k==='high'?'high':k==='medium'?'med':'low'}"
        style="width:${((r&&r.value||0)/mx*100).toFixed(1)}%"></span></span>
        <span class="num">${short((r&&r.n)||0)} · ${tb((r&&r.value)||0)}</span></div>`;
    }).join('');

    const md=Math.max(1,...d.byDiagnosis.map(x=>x.n||0));
    $('#exp-diag').innerHTML = d.byDiagnosis.map(x=>`<div class="bar">
      <span class="lab" title="${esc(x.diagnosis)}">${esc(x.diagnosis.slice(0,58))}</span>
      <span class="track"><span class="fill" style="width:${((x.n/md)*100).toFixed(1)}%"></span></span>
      <span class="num">${short(x.n)}${x.value?' · '+tb(x.value):''}</span></div>`).join('');

    $('#exp-top').innerHTML = d.topValue.map(t=>`<div class="card sev-high static">
      <div class="crow"><div>
        <h4 class="ctitle mono">${esc(t.serial)}</h4>
        <p class="cdiag">${esc(t.diagnosis||'')}</p>
        <div class="cmeta"><span class="tag high">score ${t.score}</span>
          <span class="tag">${esc(t.family||'')}</span>
          ${t.dealer?`<span class="tag">${esc(t.dealer)}</span>`:''}
          <span class="tag val">${money(t.value)}</span></div>
      </div></div></div>`).join('');

    const mb=Math.max(1,...d.priceBook.map(x=>x.typical||0));
    $('#exp-book').innerHTML = d.priceBook.map(p=>`<div class="bar">
      <span class="lab">${esc(p.family)}</span>
      <span class="track"><span class="fill low" style="width:${((p.typical/mb)*100).toFixed(1)}%"></span></span>
      <span class="num">${money(p.typical)} · ${p.samples}×</span></div>`).join('');
  }

  // ------------------------------------------------ flows
  async function loadChains(){
    let d; try { d = await api('/api/chains'); } catch(e){ panelError('#chain-list', 'Flows', e); return; }
    const rows = d.rows || [];
    $('#chain-list').innerHTML = rows.length ? rows.map(c=>`<div class="chainbox">
      <div class="chainflow">${esc(c.from_party)}<span class="arrow">→</span>${esc(c.to_party)}</div>
      <div class="cmeta">
        <span class="tag crit">${short(c.count)} serials</span>
        ${c.value>0?`<span class="tag val">${tb(c.value)}</span>`:'<span class="tag">unpriced</span>'}
      </div>
      <p class="hint" style="margin:9px 0 6px">${esc(c.verdict)}</p>
      <div class="serials">${c.sample.map(s=>esc(s)).join('<br>')}</div>
    </div>`).join('') : '<p class="hint">No repeated flows detected.</p>';
  }

  // ------------------------------------------------ dealers
  async function loadDealers(){
    const s = $('#dl-search').value.trim();
    let d; try { d = await api('/api/dealers?limit=200' + (s?'&q='+encodeURIComponent(s):'')); }
    catch(e){ panelError('#dealer-list', 'Dealers', e); return; }
    const dealerRows = d.rows||[];
    if (!dealerRows.length) {
      $('#dealer-list').innerHTML = `<div class="panel inline-empty"><b>No dealers found</b><span>Try a shorter name or clear the search.</span></div>`;
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
          <span class="tag">${short(x.units)} units</span>
          <span class="tag">${short(x.serials)} serials</span>
          ${x.cross_dup?`<span class="tag crit">${short(x.cross_dup)} in 2+ dealers</span>`:''}
          ${x.cross_dup?`<span class="tag high">${rate.toFixed(1)}% of their stock</span>`:''}
          ${x.first?`<span class="tag">${esc(String(x.first).slice(0,10))} → ${esc(String(x.last).slice(0,10))}</span>`:''}
        </div></div>`;
    }).join('');
  }

  // ------------------------------------------------ ownership
  async function loadOwnership(){
    let d; try { d = await api('/api/ownership'); } catch(e){ panelError('#own-cards', 'Ownership', e); return; }
    $('#own-cards').innerHTML = [
      ['Unassigned', short(d.unassigned.c), tb(d.unassigned.amt)+' of open value','crit'],
      ['People involved', String(d.people.filter(p=>p.owner).length),'','acc'],
      ['Total findings', short(d.byKind.reduce((a,b)=>a+b.n,0)),'','ok']
    ].map(([k,v,s,c])=>`<div class="stat ${c}"><div class="k">${k}</div>
      <div class="v">${v}</div><div class="s">${s}</div></div>`).join('') +
      d.people.filter(p=>p.owner).map(p=>`<div class="stat">
        <div class="k">${esc(p.owner)}</div>
        <div class="v">${short(p.open)}</div>
        <div class="s">open of ${short(p.total)} · ${short(p.resolved)} resolved</div></div>`).join('');

    const mx=Math.max(1,...d.byKind.map(x=>x.n));
    $('#own-kinds').innerHTML = d.byKind.map(x=>`<div class="bar">
      <span class="lab">${esc(KIND[x.kind]||x.kind)}</span>
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
    if (label) label.textContent = 'Syncing…';
    try{
      const res = await api('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      toast('Sync complete · ' + short((res.stats||{}).dispatches||0) + ' records', 'success');
      refreshAll();
      if (window.SuiteRefresh) window.SuiteRefresh();
    }
    catch(e){ toast('Sync failed — ' + (e.message||'unknown error'), 'error'); }
    b.classList.remove('busy'); b.disabled = false;
    if (label) label.textContent = 'Sync';
  });

  function refreshAll(){
    const t = currentTab();
    (LOADERS[t]||loadQueue)();
    loadTopExposure();
  }

  connect(); loadQueue(true); loadTopExposure();

  // Surface the NSpector actions the merged shell needs to drive.
  window.NSpectorUI = {
    inspect, openFinding, closeFindingSheet: closeSheet, refreshAll, activateTab, loadQueue,
    get currentTab(){ return currentTab(); }
  };
})();