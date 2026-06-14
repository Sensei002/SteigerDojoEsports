/* =========================================================================
 * STGRMatchControl — shared login (Firebase Authentication)
 * -------------------------------------------------------------------------
 * Gates the CONTROL PANEL pages behind a single shared username/password.
 * The OBS overlays (overlay/*.html) deliberately DO NOT load this — they
 * must stay publicly loadable so OBS browser sources keep working.
 *
 * Real security is enforced by the Firebase Realtime Database *rules*
 * (writes require auth != null); this script is the login UI + redirect
 * layer on top. See README "Lock the control panel behind a login".
 *
 * Requires (loaded before this file):
 *   firebase-app-compat.js, firebase-auth-compat.js, firebase-config.js
 * ========================================================================= */
(function (global) {
  'use strict';

  // Usernames map to a fixed email domain so the crew can type a plain
  // username (e.g. "crew") instead of an email. Firebase auth still uses
  // the email "crew@stgr.local" under the hood.
  var EMAIL_DOMAIN = 'stgr.local';

  function usernameToEmail(u) {
    u = String(u || '').trim();
    return u.indexOf('@') >= 0 ? u : u + '@' + EMAIL_DOMAIN;
  }

  // Ensure the (single) Firebase app exists, then return firebase.auth().
  // Mirrors the idempotent guard in js/store.js so there is only ever one app.
  function auth() {
    if (!global.firebase || !firebase.initializeApp) {
      throw new Error('Firebase SDK not loaded (need firebase-app + firebase-auth compat)');
    }
    var cfg = global.STGR_FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey) {
      throw new Error('Firebase config missing — login requires firebase-config.js');
    }
    if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(cfg);
    return firebase.auth();
  }

  function signIn(user, pw) {
    return auth().signInWithEmailAndPassword(usernameToEmail(user), pw);
  }

  function signOut() {
    return auth().signOut().then(function () {
      location.href = 'login.html';
    });
  }

  // Only allow a same-origin, relative redirect target (no "//evil.com",
  // no absolute URLs, no protocol). Falls back to index.html.
  function safeNext(value) {
    if (!value) return 'index.html';
    if (/^[\w.\-]+(\.html)?(\?.*)?(#.*)?$/.test(value)) return value; // simple page name
    if (value.charAt(0) === '/' && value.charAt(1) !== '/') return value; // root-relative
    return 'index.html';
  }

  function currentPageRef() {
    return location.pathname.split('/').pop() + location.search + location.hash;
  }

  // ---- Page guard: call at the very top of each gated page --------------
  // Reveals the page once a user is confirmed; otherwise redirects to login.
  function requireLogin() {
    var a;
    try { a = auth(); } catch (e) {
      // Misconfigured Firebase — fail safe by sending to the login page.
      console.error('[auth] ' + e.message);
      location.href = 'login.html';
      return;
    }
    a.onAuthStateChanged(function (firebaseUser) {
      if (firebaseUser) {
        reveal();
        mountLogout(firebaseUser);
      } else {
        var next = encodeURIComponent(currentPageRef());
        location.replace('login.html?next=' + next);
      }
    });
  }

  function reveal() {
    var el = document.documentElement;
    el.className = el.className.replace(/\bstgr-auth-pending\b/, '').trim();
  }

  // Inject a small fixed "Log out" button (reuses .btn.ghost styling).
  function mountLogout(firebaseUser) {
    if (document.getElementById('stgrLogout')) return;
    function add() {
      if (document.getElementById('stgrLogout')) return;
      var name = (firebaseUser && firebaseUser.email || '').split('@')[0] || 'user';
      var btn = document.createElement('button');
      btn.id = 'stgrLogout';
      btn.className = 'btn ghost sm';
      btn.type = 'button';
      btn.title = 'Signed in as ' + name;
      btn.textContent = '⏻ Log out';
      btn.style.cssText =
        'position:fixed;top:12px;right:14px;z-index:9999;';
      btn.addEventListener('click', function () { signOut(); });
      document.body.appendChild(btn);
    }
    if (document.body) add();
    else document.addEventListener('DOMContentLoaded', add);
  }

  global.STGRAuth = {
    EMAIL_DOMAIN: EMAIL_DOMAIN,
    usernameToEmail: usernameToEmail,
    auth: auth,
    signIn: signIn,
    signOut: signOut,
    requireLogin: requireLogin,
    safeNext: safeNext
  };
})(window);
