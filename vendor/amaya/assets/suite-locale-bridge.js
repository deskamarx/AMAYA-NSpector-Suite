/**
 * suite-locale-bridge.js — keep the Control Center language in step with the
 * merged suite. It drives the existing React language picker; it never touches
 * device records, identifiers, dealer/model names, or any other proper noun.
 */
(function () {
  'use strict';

  var KEY = 'imei.locale.v1';
  var CHANNEL = 'amaya-suite-locale';
  var SOURCE = 'amaya-pwa-' + Math.random().toString(36).slice(2);
  var VALID = { en: 1, bn: 1, zh: 1 };

  function normalize(value) {
    var s = String(value == null ? '' : value).toLowerCase();
    if (s.indexOf('bn') === 0) return 'bn';
    if (s.indexOf('zh') === 0) return 'zh';
    if (s.indexOf('en') === 0) return 'en';
    return '';
  }

  function current() {
    var fromDom = normalize(document.documentElement.lang);
    if (fromDom) return fromDom;
    try { return normalize(localStorage.getItem(KEY)) || 'en'; } catch (e) { return 'en'; }
  }

  function payload(locale) {
    return { type: 'suite:locale', source: SOURCE, locale: locale };
  }

  function broadcast(locale) {
    locale = normalize(locale);
    if (!locale) return;
    var data = payload(locale);
    try { if (window.BroadcastChannel) channel.postMessage(data); } catch (e) {}
    try { if (window.opener) window.opener.postMessage(data, location.origin); } catch (e) {}
    try { if (window.parent && window.parent !== window) window.parent.postMessage(data, location.origin); } catch (e) {}
    try {
      if (window.amayaControlLocale && window.amayaControlLocale.notify) {
        window.amayaControlLocale.notify(locale);
      }
    } catch (e) {}
  }

  var channel = null;
  try { if (window.BroadcastChannel) channel = new BroadcastChannel(CHANNEL); } catch (e) {}

  function optionFor(locale) {
    var items = document.querySelectorAll('.lang-item');
    for (var i = 0; i < items.length; i++) {
      var code = items[i].querySelector('code');
      if (code && normalize(code.textContent) === locale) return items[i];
    }
    return null;
  }

  function clickPicker(locale) {
    var trigger = document.querySelector('.lang-trigger');
    if (!trigger) return false;
    var option = optionFor(locale);
    if (!option && trigger.getAttribute('aria-expanded') !== 'true') {
      trigger.click();
      option = optionFor(locale);
    }
    if (!option) return false;
    option.click();
    return true;
  }

  var reloadTimer = null;
  function fallback(locale) {
    try { localStorage.setItem(KEY, locale); } catch (e) {}
    if (!reloadTimer) {
      reloadTimer = setTimeout(function () { reloadTimer = null; location.reload(); }, 120);
    }
  }

  function applyLocale(value) {
    var locale = normalize(value);
    if (!locale || !VALID[locale] || locale === current()) return;
    if (clickPicker(locale)) return;

    // The picker appears after the local snapshot loads. Wait for it, then
    // fall back to a reload so a locked or still-loading window still follows.
    var tries = 0;
    (function poll() {
      if (clickPicker(locale) || locale === current()) return;
      if (++tries < 40) setTimeout(poll, 75);
      else fallback(locale);
    })();
  }

  function receive(data) {
    if (!data || data.source === SOURCE || data.type !== 'suite:locale') return;
    applyLocale(data.locale);
  }

  try {
    if (channel) channel.onmessage = function (e) { receive(e && e.data); };
  } catch (e) {}
  try {
    window.addEventListener('message', function (e) {
      if (e.origin && e.origin !== location.origin) return;
      receive(e.data);
    });
  } catch (e) {}
  try {
    window.addEventListener('storage', function (e) {
      if (e && e.key === KEY) applyLocale(e.newValue);
    });
  } catch (e) {}
  try {
    if (window.amayaControlLocale && window.amayaControlLocale.onChange) {
      window.amayaControlLocale.onChange(applyLocale);
    }
  } catch (e) {}

  // User picks a language inside the Control Center: tell the rest of the suite.
  document.addEventListener('click', function (e) {
    var item = e.target && e.target.closest ? e.target.closest('.lang-item') : null;
    if (!item) return;
    var code = item.querySelector('code');
    var locale = normalize(code && code.textContent);
    if (locale) setTimeout(function () { broadcast(locale); }, 0);
  }, true);
})();
