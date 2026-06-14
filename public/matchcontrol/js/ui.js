/* =========================================================================
 * STGRMatchControl — shared admin chrome (top bar, status pill, toast)
 * Inject with UI.mount('control') etc. Keeps every page consistent.
 * ========================================================================= */
(function (global) {
  'use strict';
  const PAGES = [
    { id: 'home',     href: 'index.html',   label: 'Home' },
    { id: 'teams',    href: 'teams.html',   label: 'Teams' },
    { id: 'control',  href: 'control.html', label: 'Control' },
    { id: 'sources',  href: 'sources.html', label: 'Sources' },
    { id: 'settings', href: 'settings.html',label: 'Settings' }
  ];

  function withRoom(href) {
    if (!Store || Store.room === 'main') return href;
    const u = new URL(href, location.href);
    u.searchParams.set('room', Store.room);
    return u.pathname.split('/').pop() + u.search;
  }

  function favicon() {
    if (document.querySelector('link[rel="icon"]')) return;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = 'assets/logo.png';
    document.head.appendChild(link);
  }

  function mount(active) {
    favicon();
    const bar = document.createElement('div');
    bar.className = 'topbar';
    bar.innerHTML =
      '<a class="brand" href="' + withRoom('index.html') + '">' +
        '<img class="brand-logo" src="assets/logo.png" alt="STGR">' +
        '<span class="brand-word">STGR' +
          '<small>Match<b>Control</b></small></span></a>' +
      '<nav class="nav">' +
        PAGES.map(function (p) {
          return '<a href="' + withRoom(p.href) + '" class="' +
                 (p.id === active ? 'active' : '') + '">' + p.label + '</a>';
        }).join('') +
      '</nav>' +
      '<div class="spacer"></div>' +
      '<div class="status-pill off" id="statusPill"><span class="dot"></span>' +
        '<span id="statusText">connecting…</span></div>';
    document.body.insertBefore(bar, document.body.firstChild);

    const pill = bar.querySelector('#statusPill');
    const text = bar.querySelector('#statusText');
    const roomNote = (Store.room !== 'main') ? ' · room: ' + Store.room : '';

    if (Store.usingFirebase) {
      Store.onStatus(function (ok) {
        pill.className = 'status-pill ' + (ok ? 'live' : 'off');
        text.textContent = (ok ? 'Firebase · live' : 'Firebase · offline') + roomNote;
      });
    } else {
      pill.className = 'status-pill local';
      text.textContent = 'Local mode' + roomNote;
    }
  }

  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  function copy(text, okMsg) {
    const done = function () { toast(okMsg || 'Copied!'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  global.UI = { mount: mount, toast: toast, copy: copy };
})(window);
