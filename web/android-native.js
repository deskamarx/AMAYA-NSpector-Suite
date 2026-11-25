/**
 * android-native.js — native polish for the Capacitor build.
 * Handles splash, status bar, Android back, network state, external links,
 * and a discoverable return control when the full Control Center is open.
 */
(function () {
  'use strict';

  var STRINGS = {
    en: {
      back: '← Back to suite',
      offline: 'Offline — live sync is paused. Cached workspace is still available.'
    },
    bn: {
      back: '← স্যুতে ফিরে যান',
      offline: 'অফলাইন — লাইভ সিঙ্ক বন্ধ আছে। ক্যাশ করা কর্মক্ষেত্র এখনও উপলব্ধ।'
    },
    zh: {
      back: '← 返回套件',
      offline: '离线 — 实时同步已暂停，缓存工作区仍可使用。'
    }
  };

  function locale() {
    var raw = '';
    try { raw = String(localStorage.getItem('imei.locale.v1') || ''); } catch (e) {}
    if (raw.indexOf('bn') === 0) return 'bn';
    if (raw.indexOf('zh') === 0) return 'zh';
    return 'en';
  }

  function copy(lang) {
    return STRINGS[lang] || STRINGS.en;
  }

  function plugin(name) {
    var c = window.Capacitor;
    return c && c.Plugins && c.Plugins[name];
  }

  function whenReady(fn) {
    var tries = 0;
    (function check() {
      if (window.Capacitor || tries++ > 100) return fn();
      setTimeout(check, 40);
    })();
  }

  // The native splash must never trap the app if a plugin registers late. The
  // Capacitor config also enables native auto-hide; this is the web-side retry
  // so a healthy bridge reveals the UI immediately after first paint.
  function hideSplash(Splash, attempt) {
    attempt = attempt || 0;
    var SplashScreen = Splash || plugin('SplashScreen');
    if (SplashScreen && typeof SplashScreen.hide === 'function') {
      try {
        Promise.resolve(SplashScreen.hide()).catch(function () {});
        document.documentElement.classList.add('suite-native-ready');
        return;
      } catch (e) {
        // Fall through to retry below.
      }
    }
    if (attempt < 60) {
      setTimeout(function () { hideSplash(null, attempt + 1); }, 100);
    }
  }

  function showOffline(show) {
    var id = 'suite-offline-banner';
    var el = document.getElementById(id);
    if (!show) {
      if (el) el.remove();
      return;
    }
    if (el) return;
    el = document.createElement('div');
    el.id = id;
    el.setAttribute('role', 'status');
    el.textContent = copy(locale()).offline;
    el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom, 0px));z-index:9999;padding:10px 12px;' +
      'border:1px solid rgba(255,187,90,.4);border-radius:10px;background:#2a1d0c;color:#ffd9a0;' +
      'font:500 12px/1.45 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.4)';
    document.body.appendChild(el);
  }

  function addReturnControl() {
    if (document.getElementById('suite-return')) return;
    var s = sessionStorage;
    var opened = false;
    try { opened = s.getItem('suite.control.opened') === '1'; } catch (e) {}
    if (!opened || location.pathname.indexOf('/amaya-imei-control-center') !== 0) return;

    var b = document.createElement('button');
    b.id = 'suite-return';
    b.type = 'button';
    b.textContent = copy(locale()).back;
    b.setAttribute('aria-label', copy(locale()).back);
    b.style.cssText = 'position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom, 0px));z-index:9999;padding:10px 14px;border:1px solid rgba(167,139,250,.45);' +
      'border-radius:12px;background:rgba(14,18,32,.94);color:#fff;font:600 12px/1 system-ui,sans-serif;' +
      'box-shadow:0 10px 28px rgba(0,0,0,.45);cursor:pointer';
    b.addEventListener('click', function () {
      try { s.removeItem('suite.control.opened'); } catch (e) {}
      if (history.length > 1) history.back();
      else location.assign('/?lang=' + encodeURIComponent(locale()) + '#overview');
    });
    (document.body || document.documentElement).appendChild(b);
  }

  function boot() {
    var Splash = plugin('SplashScreen');
    var StatusBar = plugin('StatusBar');
    var Network = plugin('Network');
    var App = plugin('App');
    var Browser = plugin('Browser');

    if (StatusBar) {
      try {
        StatusBar.setStyle({ style: 'DARK' });
        StatusBar.setBackgroundColor({ color: '#05070f' });
        StatusBar.setOverlaysWebView({ overlay: false });
      } catch (e) {}
    }

    if (Network) {
      try {
        Network.getStatus().then(function (status) { showOffline(!status.connected); }).catch(function () {});
        Network.addListener('networkStatusChange', function (status) { showOffline(!status.connected); });
      } catch (e) {}
    }

    if (App) {
      try {
        App.addListener('backButton', function (info) {
          var opened = false;
          try { opened = sessionStorage.getItem('suite.control.opened') === '1'; } catch (e) {}
          if (opened) {
            try { sessionStorage.removeItem('suite.control.opened'); } catch (e) {}
            history.back();
            return;
          }
          if (info && info.canGoBack) history.back();
          else App.exitApp();
        });
      } catch (e) {}
    }

    // Keep external documentation/community links in an in-app browser.
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var url = a.href;
      if (/^https?:/i.test(url) && url.indexOf(location.origin) !== 0) {
        e.preventDefault();
        if (Browser) Browser.open({ url: url, toolbarColor: '#05070f' }).catch(function () {});
        else window.open(url, '_system');
      }
    }, true);

    function finish() {
      addReturnControl();
      hideSplash(Splash, 0);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', finish);
    else finish();
  }

  whenReady(boot);
})();
