(function () {
  var list = window.AMAYA_WORKLIST || [];
  var key = "amaya.verifications.v1";
  var records = {};
  var filter = "all";
  var index = 0;
  var app = document.getElementById("app");

  try {
    records = JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch (e) {
    records = {};
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function visible() {
    return list.filter(function (item) {
      if (filter === "high" || filter === "review") return item.tier === filter;
      if (filter === "open") return !records[item.pairId];
      if (filter === "saved") return !!records[item.pairId];
      return true;
    });
  }

  function copy(value, button) {
    function done() {
      var old = button.textContent;
      button.textContent = "Copied";
      setTimeout(function () { button.textContent = old; }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done, function () {});
    }
  }

  function cell(dt, dd, cls) {
    var d = el("dt", null, dt);
    var v = el("dd", cls || null, dd);
    return [d, v];
  }

  function csv(value) {
    var text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function exportCsv() {
    var header = ["pair_id", "imei_1", "imei_2", "status", "proof_type", "evidence_ref", "checked_at", "checked_by", "notes"];
    var lines = [header.join(",")];
    list.forEach(function (item) {
      var r = records[item.pairId];
      if (!r) return;
      lines.push([item.pairId, item.imei1, item.imei2, r.status, r.proofType, r.evidenceRef, r.checkedAt, r.checkedBy, r.notes].map(csv).join(","));
    });
    var blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = el("a");
    a.href = url;
    a.download = "verifications.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function save(item) {
    var status = document.getElementById("f-status").value;
    var proof = document.getElementById("f-proof").value.trim();
    var evidence = document.getElementById("f-evidence").value.trim();
    var who = document.getElementById("f-who").value.trim();
    var notes = document.getElementById("f-notes").value.trim();
    if (status === "confirmed_same_device" && !evidence) {
      document.getElementById("f-evidence").focus();
      return;
    }
    records[item.pairId] = {
      status: status,
      proofType: proof,
      evidenceRef: evidence,
      checkedAt: new Date().toISOString(),
      checkedBy: who,
      notes: notes
    };
    try { localStorage.setItem(key, JSON.stringify(records)); } catch (e) {}
    var items = visible();
    if (index < items.length - 1) index++;
    render();
  }

  function render() {
    app.textContent = "";
    var wrap = el("div", "wrap");
    var savedCount = Object.keys(records).filter(function (k) { return records[k].status !== "unverified"; }).length;
    wrap.appendChild(el("h1", null, "IMEI verification worklist"));
    wrap.appendChild(el("p", "sub", list.length + " candidate pairs · " + savedCount + " recorded · results stay in this browser until exported"));

    var bar = el("div", "bar");
    [["all", "All"], ["high", "High"], ["review", "Review"], ["open", "Open"], ["saved", "Saved"]].forEach(function (entry) {
      var b = el("button", filter === entry[0] ? "active" : "", entry[1]);
      b.addEventListener("click", function () { filter = entry[0]; index = 0; render(); });
      bar.appendChild(b);
    });
    var spacer = el("span", "spacer");
    bar.appendChild(spacer);
    var exp = el("button", "primary", "Export verifications.csv");
    exp.addEventListener("click", exportCsv);
    bar.appendChild(exp);
    wrap.appendChild(bar);

    var items = visible();
    if (!items.length) {
      wrap.appendChild(el("p", "note", "Nothing in this filter."));
      app.appendChild(wrap);
      return;
    }
    if (index >= items.length) index = 0;
    var item = items[index];
    var record = records[item.pairId];

    var panel = el("div", "panel");
    panel.appendChild(el("h2", null, item.pairId + " · " + item.score + " point candidate"));
    var meta = el("div", "bar");
    meta.appendChild(el("span", "chip " + item.tier, item.tier));
    if (record) meta.appendChild(el("span", "chip saved", record.status));
    if (item.bothSold) meta.appendChild(el("span", "chip", "both sold"));
    meta.appendChild(el("span", "note", (index + 1) + " of " + items.length));
    panel.appendChild(meta);

    var dl = el("dl", "kv");
    var b1 = el("button", null, "Copy");
    b1.addEventListener("click", function () { copy(item.imei1, b1); });
    var b2 = el("button", null, "Copy");
    b2.addEventListener("click", function () { copy(item.imei2, b2); });
    var i1 = el("div", "imei");
    i1.appendChild(document.createTextNode(item.imei1 + " "));
    i1.appendChild(b1);
    var i2 = el("div", "imei");
    i2.appendChild(document.createTextNode(item.imei2 + " "));
    i2.appendChild(b2);
    dl.appendChild(el("dt", null, "IMEI 1"));
    dl.appendChild(i1);
    dl.appendChild(el("dt", null, "IMEI 2"));
    dl.appendChild(i2);
    for (var pair of [
      ["TAC", item.tac],
      ["Serial delta", item.snrDelta],
      ["Model", item.model],
      ["Shared days", (item.sharedDays || []).join(", ") || "none"],
      ["Shared tabs", (item.sharedTabs || []).join(", ") || "none"],
      ["Shared rows", (item.sharedRows || []).join(", ") || "none"]
    ]) {
      var parts = cell(pair[0], pair[1]);
      dl.appendChild(parts[0]);
      dl.appendChild(parts[1]);
    }
    panel.appendChild(dl);
    wrap.appendChild(panel);

    var form = el("div", "panel");
    form.appendChild(el("h2", null, "Verification result"));
    var statusLabel = el("label", null, "Status");
    var status = el("select");
    status.id = "f-status";
    [["confirmed_same_device", "Confirmed: same physical device"], ["confirmed_distinct", "Confirmed: two different devices"], ["needs_source", "Needs source document"], ["unverified", "Unverified"]].forEach(function (o) {
      var option = el("option", null, o[1]);
      option.value = o[0];
      status.appendChild(option);
    });
    if (record) status.value = record.status;
    form.appendChild(statusLabel);
    form.appendChild(status);

    var fields = [
      ["f-proof", "Proof type (workbook row / invoice / brand portal / physical)", "text"],
      ["f-evidence", "Evidence reference (file, row, URL or screenshot name)", "text"],
      ["f-who", "Checked by", "text"]
    ];
    fields.forEach(function (f) {
      form.appendChild(el("label", null, f[1]));
      var input = el("input");
      input.id = f[0];
      input.type = f[2];
      input.value = record ? (f[0] === "f-proof" ? record.proofType : f[0] === "f-evidence" ? record.evidenceRef : record.checkedBy) : "";
      form.appendChild(input);
    });
    form.appendChild(el("label", null, "Notes"));
    var notes = el("textarea");
    notes.id = "f-notes";
    notes.value = record ? record.notes || "" : "";
    form.appendChild(notes);

    var actions = el("div", "bar actions");
    var prev = el("button", null, "Previous");
    prev.disabled = index === 0;
    prev.addEventListener("click", function () { index--; render(); });
    var next = el("button", null, "Next");
    next.disabled = index >= items.length - 1;
    next.addEventListener("click", function () { index++; render(); });
    var store = el("button", "primary", "Save & next");
    store.addEventListener("click", function () { save(item); });
    actions.appendChild(prev);
    actions.appendChild(next);
    actions.appendChild(store);
    form.appendChild(actions);
    wrap.appendChild(form);

    wrap.appendChild(el("p", "note", "A confirmed 'same device' requires an evidence reference. The pair is only a candidate until then."));
    app.appendChild(wrap);
  }

  document.addEventListener("keydown", function (event) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((event.target && event.target.tagName) || "")) return;
    if (event.key === "ArrowRight") { index++; render(); }
    if (event.key === "ArrowLeft") { index = Math.max(0, index - 1); render(); }
  });

  render();
})();
