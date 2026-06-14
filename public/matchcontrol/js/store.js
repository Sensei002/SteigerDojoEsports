/* =========================================================================
 * STGRMatchControl — shared state store
 * -------------------------------------------------------------------------
 * One small API used by every page (control panel, team manager, overlays).
 *
 * Two interchangeable backends behind the same interface:
 *
 *   FirebaseBackend  -> Firebase Realtime Database. Picked automatically when
 *                       a valid config is found (firebase-config.js or a
 *                       Settings override). Gives you REAL-TIME control from
 *                       ANY device/browser -> works phone -> OBS on stream PC.
 *
 *   LocalBackend     -> localStorage + BroadcastChannel. Used when Firebase is
 *                       not configured yet. Syncs only within the SAME browser
 *                       (e.g. control panel + overlays as OBS browser
 *                       sources/docks). Lets you try everything with zero setup.
 *
 * State lives under a "room" so you can run more than one production at once.
 * Room comes from ?room=NAME in the URL, else localStorage, else "main".
 * ========================================================================= */
(function (global) {
  'use strict';

  /* ----------------------------- Default state ---------------------------- */
  // Tournament-bracket building blocks. A "match" is two free-text
  // participants, their scores, and which side won ('' | '1' | '2'). Groups
  // run double elimination (4 teams -> 2 advance) via five matches; the
  // playoffs run single elimination (8 teams -> champion).
  function blankMatch() { return { p1: '', p2: '', s1: '', s2: '', w: '' }; }
  function blankGroup() {
    return {
      ub1: blankMatch(),   // Upper bracket — round 1 (seed 1 v 2)
      ub2: blankMatch(),   // Upper bracket — round 1 (seed 3 v 4)
      ubf: blankMatch(),   // Upper final — winner takes the group's 1st seed
      lb1: blankMatch(),   // Lower bracket — round 1 (the two UB losers)
      lbf: blankMatch()    // Lower final — winner takes the group's 2nd seed
    };
  }

  // The full shape of a room. Every page reads/writes slices of this.
  const DEFAULT_STATE = {
    teams: {
      // id: { name, short, logo, color, players:[{name, role, platform}] }
      //   platform — tracker.network lookup platform: 'ubi'(PC) | 'psn' | 'xbl'
    },
    match: {
      teamA: '',        // team id
      teamB: '',        // team id
      game: 'r6',       // active title — 'r6' (default) | 'valorant'; drives the map pool
      scoreA: 0,        // rounds won this map
      scoreB: 0,
      mapsA: 0,         // maps won in the series (BO3/BO5)
      mapsB: 0,
      rounds: [],       // round history: [{ team:'A'|'B', side:'ATK'|'DEF' }]
      bestOf: 'BO3',    // BO1 / BO3 / BO5
      sideA: 'ATK',     // side team A currently plays: ATK / DEF
      map: '',          // current map name
      round: 1,
      phase: 'LIVE',    // PRE / LIVE / TECH / END
      title: '',        // free text, e.g. "Grand Final"
      visible: true     // show/hide the scorebug overlay
    },
    branding: {
      eventLogo: '',    // image data-URL or external URL — shown in scorebug center
      sponsor: '',      // gif/img/video data-URL or external URL — far-left sponsor loop
      sponsorKind: ''   // 'image' | 'video'
    },
    scoreMsg: {
      visible: false,   // show/hide the far-right scorebug message
      text: '',         // e.g. event name
      font: 'bebas',    // font key (see FONTS map in control.js / scorebug.html)
      bold: false,
      italic: false,
      uppercase: true
    },
    mapCard: {
      visible: false,   // pin: keep the card slid down until turned off
      duration: 8,      // seconds the timed "Play" pop stays down before sliding up
      play: 0           // bump (timestamp) to trigger a one-shot timed slide-down
    },
    startingSoon: {
      visible: false,         // show/hide the Starting Soon scene
      bg: 'carbon',           // animated backdrop key — see OV.SS_BACKGROUNDS ('none' = transparent)
      title: 'STARTING SOON', // headline
      subtitle: '',           // e.g. "Grand Final · Best of 5"
      showTimer: true,        // show the countdown
      timerRunning: false,    // is the countdown ticking
      timerEndsAt: 0,         // epoch ms the countdown hits zero (when running)
      timerRemaining: 600     // seconds left (authoritative when paused)
    },
    lowerThird: {
      visible: false,
      mode: 'casters',  // casters / title
      casters: [
        { name: '', handle: '', role: 'Caster' },
        { name: '', handle: '', role: 'Caster' }
      ],
      title: '',
      subtitle: '',
      autoHide: 0       // seconds to auto-hide after pressing Show (0 = off)
    },
    roster: {
      visible: false,
      team: 'A'         // A or B
    },
    roundHistory: {
      visible: false,   // show/hide the round-history browser source
      map: '',          // map chosen for the next logged round
      site: '',         // bombsite chosen for the next logged round
      entries: []       // [{ team:'A'|'B', map:'', site:'' }] — round N = index N+1
    },
    mapban: {
      visible: false,
      format: 'BO3',
      pool: ['Bank', 'Border', 'Calypso Casino', 'Chalet', 'Clubhouse', 'Coastline',
             'Consulate', 'Fortress', 'Kafe', 'Lair', 'Nighthaven Labs', 'Oregon',
             'Skyscraper', 'Villa'],
      steps: [],        // [{ action:'ban'|'pick'|'decider', team:'A'|'B'|'', map:'', side:'' }]
      activeStep: 0
    },
    theme: {
      accent:    '#ff7a00',  // primary brand / ATK
      accent2:   '#1e90ff',  // secondary / DEF
      bg:        '#0a0e14',
      teamAColor:'#1e90ff',
      teamBColor:'#ff3b3b',
      panelOpacity: 88,      // 0–100 — overlay panel transparency (glass alpha)
      divider:   '#39414f',  // scorebug segment divider / outline color
      nameAtk:   '#ffffff',  // scorebug team-name text color for the team on ATK side
      nameDef:   '#ffffff',  // scorebug team-name text color for the team on DEF side
                             //   (the roster player-card accent edge follows these too)
      gradient:  false,      // use a gradient panel fill instead of a solid one
      gradFrom:  '#0a0e14',  // gradient start color
      gradTo:    '#1a2740',  // gradient end color
      gradAngle: 105,        // gradient angle in degrees
      anim:      'siege',    // overlay motion style — see OV.ANIMS (siege/fade/pop/cinematic)
      skin:      'default',  // scorebug skin — see OV.SKINS ('default' | 'r6' broadcast look)
      preset:    'siege'     // last-applied preset key (see OV.THEMES); 'custom' once edited
    },
    integrations: {
      statsProxy:   '',      // URL of the tracker.network stats Worker (see stats-proxy/worker.js)
      statsEnabled: true     // master toggle for live player stats on the roster overlay
    },
    bracket: {
      visible: false,                  // show/hide the bracket overlay
      title: 'TOURNAMENT BRACKET',     // headline shown on the overlay
      // Note: the bracket's animated backdrop is shared with Starting Soon
      // (state.startingSoon.bg, set from Settings) — no separate key here.
      // Group stage — 4 groups of 4 teams, double elimination, top 2 advance.
      groups: {
        A: blankGroup(), B: blankGroup(), C: blankGroup(), D: blankGroup()
      },
      // Playoffs — single elimination from the 8 group qualifiers.
      knockout: {
        qf1: blankMatch(), qf2: blankMatch(), qf3: blankMatch(), qf4: blankMatch(),
        sf1: blankMatch(), sf2: blankMatch(),
        final: blankMatch()
      }
    },
    audio: {
      src: '',          // data-URL or external URL of the looping background track
      name: '',         // original filename — control-panel label only
      enabled: false,   // master on/off
      volume: 60        // 0–100; plays behind the roster / bracket / Starting Soon scenes
    }
  };

  /* ------------------------------- Helpers -------------------------------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Deep-merge defaults into a (possibly partial) loaded state so missing
  // keys never blow up the UI.
  function withDefaults(state) {
    const base = clone(DEFAULT_STATE);
    if (!state || typeof state !== 'object') return base;
    return deepMerge(base, state);
  }
  function deepMerge(base, over) {
    Object.keys(over || {}).forEach(function (k) {
      const bv = base[k], ov = over[k];
      if (ov && typeof ov === 'object' && !Array.isArray(ov) &&
          bv && typeof bv === 'object' && !Array.isArray(bv)) {
        base[k] = deepMerge(bv, ov);
      } else if (ov !== undefined) {
        base[k] = ov;
      }
    });
    return base;
  }

  function getRoom() {
    const p = new URLSearchParams(location.search);
    const fromUrl = p.get('room');
    if (fromUrl) return fromUrl.trim();
    try {
      const ls = localStorage.getItem('stgr_room');
      if (ls) return ls;
    } catch (e) {}
    return 'main';
  }

  function getFirebaseConfig() {
    // 1) Settings override saved to localStorage (handy for quick testing)
    try {
      const ls = localStorage.getItem('stgr_fb_config');
      if (ls) {
        const cfg = JSON.parse(ls);
        if (cfg && cfg.apiKey) return cfg;
      }
    } catch (e) {}
    // 2) Committed firebase-config.js (recommended for OBS, survives any browser)
    const cfg = global.STGR_FIREBASE_CONFIG;
    if (cfg && cfg.apiKey && !/^PASTE/i.test(cfg.apiKey)) return cfg;
    return null;
  }

  /* ============================== LOCAL BACKEND ============================ *
   * localStorage for persistence + BroadcastChannel for instant same-browser
   * sync. Works great when the control panel & overlays are in one browser
   * (e.g. OBS docks + browser sources).
   * ----------------------------------------------------------------------- */
  function LocalBackend(room) {
    const KEY = 'stgr_state_' + room;
    let chan = null;
    try { chan = new BroadcastChannel('stgr_' + room); } catch (e) {}
    const listeners = [];          // [{path, cb}]

    function read() {
      try { return withDefaults(JSON.parse(localStorage.getItem(KEY))); }
      catch (e) { return withDefaults(null); }
    }
    function write(state) {
      localStorage.setItem(KEY, JSON.stringify(state));
      if (chan) chan.postMessage({ t: 'state', state: state });
      fire(state);
    }
    function valueAt(state, path) {
      if (!path) return state;
      return path.split('/').reduce(function (o, k) {
        return (o == null) ? undefined : o[k];
      }, state);
    }
    function fire(state) {
      listeners.forEach(function (l) { l.cb(valueAt(state, l.path)); });
    }

    // Cross-tab / cross-source updates
    if (chan) chan.onmessage = function (e) {
      if (e.data && e.data.t === 'state') fire(withDefaults(e.data.state));
    };
    global.addEventListener('storage', function (e) {
      if (e.key === KEY) fire(read());
    });

    return {
      kind: 'local',
      ready: Promise.resolve(),
      connected: function () { return true; },
      onStatus: function () {},
      subscribe: function (path, cb) {
        listeners.push({ path: path || '', cb: cb });
        cb(valueAt(read(), path || ''));           // emit current value now
      },
      update: function (path, partial) {            // merge object at path
        const s = read();
        const target = ensurePath(s, path);
        Object.assign(target, partial);
        write(s);
      },
      set: function (path, value) {                 // overwrite value at path
        const s = read();
        setPath(s, path, value);
        write(s);
      },
      push: function (path, value) {                // add to a map with new id
        const s = read();
        const target = ensurePath(s, path);
        const id = 'k' + Date.now().toString(36) + Math.floor(performance.now()).toString(36);
        target[id] = value;
        write(s);
        return id;
      },
      remove: function (path) {
        const s = read();
        const parts = path.split('/');
        const last = parts.pop();
        const parent = valueAt(s, parts.join('/'));
        if (parent) delete parent[last];
        write(s);
      }
    };

    function ensurePath(state, path) {
      if (!path) return state;
      return path.split('/').reduce(function (o, k) {
        if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
        return o[k];
      }, state);
    }
    function setPath(state, path, value) {
      const parts = path.split('/');
      const last = parts.pop();
      const parent = parts.length ? ensurePath(state, parts.join('/')) : state;
      parent[last] = value;
    }
  }

  /* ============================ FIREBASE BACKEND ========================== *
   * Thin wrapper over firebase-database (compat build loaded via <script>).
   * ----------------------------------------------------------------------- */
  function FirebaseBackend(room, cfg) {
    if (!global.firebase || !firebase.initializeApp) {
      throw new Error('Firebase SDK not loaded');
    }
    if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(cfg);
    const db = firebase.database();
    const root = db.ref('rooms/' + room);

    let isConnected = false;
    const statusCbs = [];
    db.ref('.info/connected').on('value', function (s) {
      isConnected = !!s.val();
      statusCbs.forEach(function (cb) { cb(isConnected); });
    });

    // Firebase rejects child('') as an invalid path, so an empty path must
    // resolve to the room root itself (used by the control panel to watch
    // the whole room).
    function at(path) { return path ? root.child(path) : root; }

    return {
      kind: 'firebase',
      ready: Promise.resolve(),
      connected: function () { return isConnected; },
      onStatus: function (cb) { statusCbs.push(cb); cb(isConnected); },
      subscribe: function (path, cb) {
        at(path).on('value', function (snap) {
          cb(snap.val());
        });
      },
      update: function (path, partial) { return at(path).update(partial); },
      set:    function (path, value)   { return at(path).set(value); },
      push:   function (path, value)   { return at(path).push(value).key; },
      remove: function (path)          { return at(path).remove(); }
    };
  }

  /* ------------------------------ Bootstrap ------------------------------- */
  const room = getRoom();
  const cfg  = getFirebaseConfig();
  let backend;
  let usingFirebase = false;

  if (cfg) {
    try { backend = FirebaseBackend(room, cfg); usingFirebase = true; }
    catch (e) {
      console.warn('[STGR] Firebase init failed, falling back to local:', e);
      backend = LocalBackend(room);
    }
  } else {
    backend = LocalBackend(room);
  }

  /* ------------------------------ Public API ------------------------------ */
  const Store = {
    DEFAULT_STATE: DEFAULT_STATE,
    room: room,
    backend: backend.kind,
    usingFirebase: usingFirebase,
    configured: !!cfg,

    /** subscribe(path, cb) — cb fires now and on every change. path '' = whole room. */
    subscribe: function (path, cb) { return backend.subscribe(path, cb); },
    /** update(path, {merge object}) */
    update: function (path, partial) { return backend.update(path, partial); },
    /** set(path, value) — overwrite */
    set: function (path, value) { return backend.set(path, value); },
    /** push(path, value) -> new key */
    push: function (path, value) { return backend.push(path, value); },
    /** remove(path) */
    remove: function (path) { return backend.remove(path); },

    connected: function () { return backend.connected(); },
    onStatus: function (cb) { return backend.onStatus(cb); },

    withDefaults: withDefaults,
    setRoom: function (r) { try { localStorage.setItem('stgr_room', r); } catch (e) {} },

    /** Build an absolute overlay URL preserving the current room. */
    overlayUrl: function (relPath) {
      const baseDir = location.href.replace(/[^/]*$/, ''); // strip current file
      const url = new URL(relPath, baseDir);
      if (room && room !== 'main') url.searchParams.set('room', room);
      return url.href;
    }
  };

  global.Store = Store;
})(window);
