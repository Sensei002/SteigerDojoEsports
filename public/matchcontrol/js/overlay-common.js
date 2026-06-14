/* =========================================================================
 * STGRMatchControl — shared overlay helpers
 * Applies live theme colors to CSS variables + small utilities.
 * ========================================================================= */
window.OV = (function () {
  'use strict';
  function applyTheme(t) {
    if (!t) return;
    const r = document.documentElement.style;
    if (t.accent)     r.setProperty('--accent', t.accent);
    if (t.accent2)    r.setProperty('--accent-2', t.accent2);
    if (t.bg)         r.setProperty('--ovbg', t.bg);
    if (t.teamAColor) r.setProperty('--teamA', t.teamAColor);
    if (t.teamBColor) r.setProperty('--teamB', t.teamBColor);
    if (t.divider)    r.setProperty('--divider', t.divider);
    if (t.nameAtk)    r.setProperty('--name-atk', t.nameAtk);
    if (t.nameDef)    r.setProperty('--name-def', t.nameDef);

    // Panel transparency + optional gradient drive the glass fills used by
    // every overlay panel (--glass = team plates, --glass-2 = score/center/map).
    const a  = alpha(t.panelOpacity, 88);
    const a2 = alpha((t.panelOpacity == null ? 88 : t.panelOpacity) + 6, 94);
    if (t.gradient) {
      const ang = (t.gradAngle == null ? 105 : t.gradAngle);
      const c1 = hexToRgb(t.gradFrom || '#0a0e14');
      const c2 = hexToRgb(t.gradTo   || '#1a2740');
      r.setProperty('--glass',   gradient(ang, c1, c2, a));
      r.setProperty('--glass-2', gradient(ang, c1, c2, a2));
    } else {
      const base = hexToRgb(t.bg || '#0a0e14');
      r.setProperty('--glass',   rgba(base, a));
      r.setProperty('--glass-2', rgba(lighten(base, 8), a2));
    }

    // Motion style — drives the [data-anim="…"] rules in overlay.css so every
    // overlay shares one entrance/exit feel (see OV.ANIMS).
    const anim = ANIMS.some(function (x) { return x.key === t.anim; }) ? t.anim : 'siege';
    document.documentElement.setAttribute('data-anim', anim);

    // Scorebug skin — drives the [data-skin="…"] rules (default look vs the
    // R6 broadcast bar). See OV.SKINS.
    const skin = SKINS.some(function (x) { return x.key === t.skin; }) ? t.skin : 'default';
    document.documentElement.setAttribute('data-skin', skin);
  }
  /* --------------------------- Background music ----------------------------- *
   * Shared by the roster / bracket / Starting Soon overlays. Plays a single
   * looping track whenever the scene is visible AND audio is enabled. Config
   * lives in state.audio { src, name, enabled, volume }.
   *
   * Two sources, chosen by the src:
   *   • a YouTube link (youtube.com / youtu.be / music.youtube …) → played via
   *     the hidden YouTube IFrame Player (direct <audio> can't play YouTube);
   *   • anything else (uploaded data-URL or a direct .mp3/.ogg URL) → <audio id="bgm">.
   *
   * Browsers block autoplay until a user gesture; OBS Browser Sources allow it,
   * so on stream this just works. In a plain browser tab playback starts on the
   * first click / keypress (armGesture below) — for both source types.
   * -------------------------------------------------------------------------- */
  function clampVol(v) {
    v = (v == null ? 60 : Number(v));
    if (isNaN(v)) v = 60;
    return Math.max(0, Math.min(1, v / 100));
  }
  // Extract an 11-char video id from the common YouTube URL shapes; null if not YT.
  function ytId(url) {
    const m = String(url || '').match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|music\.youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  let _bgmArmed = false;
  let _bgmResume = null;          // retry-playback fn, run on the first user gesture
  function bgm(audio, visible) {
    audio = audio || {};
    const src = audio.src || '';
    const want = !!(visible && audio.enabled && src);
    const vol = clampVol(audio.volume);
    const yid = ytId(src);

    if (yid) {                    // ---- YouTube-backed playback ----
      bgmAudioStop();             // silence the <audio> element if it was active
      ytApply(yid, want, vol);
      _bgmResume = ytSync;
    } else {                      // ---- direct audio file / data URL ----
      ytStop();                   // silence the YouTube player if it was active
      const el = document.getElementById('bgm');
      if (!el) return;
      el.loop = true;
      // Only touch src when it actually changes — re-assigning a multi-MB
      // data-URL on every unrelated state tick would restart/refetch the track.
      if (el.getAttribute('data-src') !== src) {
        el.setAttribute('data-src', src);
        if (src) { el.src = src; } else { el.removeAttribute('src'); el.load(); }
      }
      el.volume = vol;
      el._bgmWant = want;
      if (want) {
        const p = el.play();
        if (p && p.catch) p.catch(function () {});
      } else if (!el.paused) {
        el.pause();               // keep position so re-showing resumes
      }
      _bgmResume = function () {
        if (el._bgmWant) { const p = el.play(); if (p && p.catch) p.catch(function () {}); }
      };
    }

    if (want) armGesture();       // ensure the plain-browser gesture fallback is ready
  }
  function bgmAudioStop() {
    const el = document.getElementById('bgm');
    if (el && !el.paused) el.pause();
  }
  function armGesture() {
    if (_bgmArmed) return;
    _bgmArmed = true;
    function go() { if (_bgmResume) _bgmResume(); }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, go);
    });
  }

  /* ---- YouTube IFrame backing (lazily loaded only when a YT link is used) ---- */
  const _yt = { apiLoading: false, ready: false, player: null,
                id: '', loadedId: '', want: false, vol: .6 };
  let _ytReadyCbs = [];
  function ytApply(id, want, vol) {
    _yt.id = id; _yt.want = want; _yt.vol = vol;
    ytMount();
    ytEnsureApi(function () { ytEnsurePlayer(); ytSync(); });
  }
  function ytMount() {
    if (document.getElementById('bgmYT')) return;
    const host = document.createElement('div');
    host.id = 'bgmYT';
    host.setAttribute('aria-hidden', 'true');
    // hidden but still rendered (display:none would stop playback)
    host.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;' +
                         'opacity:.01;pointer-events:none;z-index:-1;overflow:hidden';
    document.body.appendChild(host);
  }
  function ytEnsureApi(cb) {
    if (window.YT && window.YT.Player) { _yt.ready = true; cb(); return; }
    _ytReadyCbs.push(cb);
    if (_yt.apiLoading) return;
    _yt.apiLoading = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') { try { prev(); } catch (e) {} }
      _yt.ready = true;
      const cbs = _ytReadyCbs; _ytReadyCbs = [];
      cbs.forEach(function (f) { try { f(); } catch (e) {} });
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
  function ytEnsurePlayer() {
    if (_yt.player || !window.YT || !window.YT.Player) return;
    const mount = document.createElement('div');
    document.getElementById('bgmYT').appendChild(mount);
    _yt.player = new window.YT.Player(mount, {
      videoId: _yt.id,
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0,
                    modestbranding: 1, rel: 0, playsinline: 1,
                    loop: 1, playlist: _yt.id },
      events: {
        onReady: function () { _yt.loadedId = _yt.id; ytSync(); },
        onStateChange: function (e) {
          // loop=playlist is unreliable across loadVideoById, so force the loop
          if (e.data === window.YT.PlayerState.ENDED) {
            try { _yt.player.seekTo(0); _yt.player.playVideo(); } catch (x) {}
          }
        }
      }
    });
  }
  function ytSync() {
    const pl = _yt.player;
    if (!pl || !pl.setVolume) return;       // not ready yet
    try {
      if (_yt.loadedId !== _yt.id) { _yt.loadedId = _yt.id; pl.loadVideoById(_yt.id); }
      pl.setVolume(Math.round(_yt.vol * 100));
      if (_yt.want) pl.playVideo(); else pl.pauseVideo();
    } catch (e) {}
  }
  function ytStop() {
    _yt.want = false;
    if (_yt.player && _yt.player.pauseVideo) { try { _yt.player.pauseVideo(); } catch (e) {} }
  }

  /* color helpers for the glass/gradient fills */
  function hexToRgb(h) {
    h = String(h == null ? '' : h).trim().replace('#', '');
    if (h.length === 3) h = h.replace(/./g, function (c) { return c + c; });
    const n = parseInt(h, 16);
    if (h.length !== 6 || isNaN(n)) return { r: 10, g: 14, b: 20 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function alpha(p, def) {
    p = (p == null ? def : Number(p));
    if (isNaN(p)) p = def;
    return Math.max(0, Math.min(100, p)) / 100;
  }
  function lighten(c, d) { return { r: Math.min(255, c.r + d), g: Math.min(255, c.g + d), b: Math.min(255, c.b + d) }; }
  function rgba(c, a) { return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a.toFixed(3) + ')'; }
  function gradient(ang, c1, c2, a) { return 'linear-gradient(' + ang + 'deg, ' + rgba(c1, a) + ', ' + rgba(c2, a) + ')'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }
  function px() { return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; }

  /* ------------------------------ Brand mark -------------------------------- *
   * Drops a small persistent STGR logo into a full-screen overlay scene so the
   * broadcast carries the dojo branding out of the box. Call once per overlay
   * (e.g. OV.brandMark()). Position/scale tweakable via the options object.
   * Honors state.branding.hideWatermark — set from the control panel to remove
   * it on demand without editing the overlay.
   * --------------------------------------------------------------------------- */
  function brandMark(opts) {
    opts = opts || {};
    const stage = document.querySelector('.stage') || document.body;
    let mark = document.querySelector('.stgr-brandmark');
    if (!mark) {
      mark = document.createElement('img');
      mark.className = 'stgr-brandmark';
      mark.alt = 'STGR';
      mark.src = (opts.src || '../assets/logo.png');
      stage.appendChild(mark);
    }
    if (opts.corner) mark.setAttribute('data-corner', opts.corner);
    return mark;
  }
  // Show/hide the brand mark live from a branding flag.
  function applyBranding(b) {
    const mark = document.querySelector('.stgr-brandmark');
    if (!mark) return;
    mark.style.display = (b && b.hideWatermark) ? 'none' : '';
  }
  function team(state, which) {
    const id = which === 'B' ? state.match.teamB : state.match.teamA;
    return (state.teams && state.teams[id]) || null;
  }
  // turn a map name into a filename slug, e.g. "Nighthaven Labs" -> "nighthaven-labs"
  function mapSlug(name) {
    return String(name == null ? '' : name).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  // try assets/maps/<slug>.{jpg,png,webp,jpeg}; toggles .has-img on segEl when one loads
  function setMapImg(imgEl, segEl, name) {
    const slug = mapSlug(name);
    segEl.classList.remove('has-img');
    imgEl.onload = null; imgEl.onerror = null; imgEl.removeAttribute('src');
    if (!slug) return;
    const exts = ['jpg', 'png', 'webp', 'jpeg', 'svg'];
    let i = 0;
    (function tryNext() {
      if (i >= exts.length) { segEl.classList.remove('has-img'); imgEl.removeAttribute('src'); return; }
      imgEl.onload = function () { segEl.classList.add('has-img'); };
      imgEl.onerror = tryNext;
      imgEl.src = '../assets/maps/' + slug + '.' + exts[i++];
    })();
  }
  /* ----------------------------- Score message fonts ---------------------------- *
   * Curated broadcast-style fonts for the far-right scorebug message. Used by
   * both the control panel (font picker + preview) and the scorebug overlay.
   * Load the matching Google Fonts via OV.FONT_IMPORT in each page's <head>.
   * ------------------------------------------------------------------------------ */
  const FONTS = [
    { key: 'bebas',   label: 'Bebas Neue (display)', stack: '"Bebas Neue", "Arial Narrow", sans-serif' },
    { key: 'oswald',  label: 'Oswald',               stack: '"Oswald", "Segoe UI", sans-serif' },
    { key: 'teko',    label: 'Teko',                 stack: '"Teko", "Segoe UI", sans-serif' },
    { key: 'barlow',  label: 'Barlow Condensed',     stack: '"Barlow Condensed", "Arial Narrow", sans-serif' },
    { key: 'saira',   label: 'Saira Condensed',      stack: '"Saira Condensed", "Arial Narrow", sans-serif' },
    { key: 'rajdhani',label: 'Rajdhani (esports)',   stack: '"Rajdhani", "Segoe UI", sans-serif' },
    { key: 'orbitron',label: 'Orbitron (futuristic)',stack: '"Orbitron", "Segoe UI", sans-serif' },
    { key: 'anton',   label: 'Anton (heavy)',        stack: '"Anton", "Arial Black", sans-serif' }
  ];
  const FONT_IMPORT = 'https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:ital,wght@0,600;0,700;1,600;1,700&family=Bebas+Neue&family=Orbitron:wght@600;800&family=Oswald:wght@500;700&family=Rajdhani:wght@600;700&family=Saira+Condensed:ital,wght@0,600;0,700;1,600;1,700&family=Teko:wght@500;700&display=swap';
  function fontStack(key) {
    const f = FONTS.filter(function (x) { return x.key === key; })[0];
    return (f && f.stack) || FONTS[0].stack;
  }

  /* ------------------------------ Motion styles ------------------------------ *
   * Each key maps to a [data-anim="…"] block in overlay.css. Applied live by
   * applyTheme() so every overlay shares one entrance/exit feel.
   * --------------------------------------------------------------------------- */
  const ANIMS = [
    { key: 'siege',     label: 'Siege (tactical wipes)' },
    { key: 'fade',      label: 'Fade (clean cross-fade)' },
    { key: 'pop',       label: 'Pop (bouncy / energetic)' },
    { key: 'cinematic', label: 'Cinematic (smooth blur-in)' },
    { key: 'glitch',    label: 'Glitch (digital snap)' },
    { key: 'slide',     label: 'Slide (directional push)' }
  ];

  /* ------------------------------ Scorebug skins ----------------------------- *
   * Drives the [data-skin="…"] rules in overlay.css. 'default' is the built-in
   * STGR look; 'r6' recreates the official Rainbow Six broadcast bar (team-
   * tinted halves, outer logos, neutral center, full-width baseline).
   * --------------------------------------------------------------------------- */
  const SKINS = [
    { key: 'default', label: 'STGR Default' },
    { key: 'r6',      label: 'R6 Broadcast (team-tinted bar)' }
  ];

  /* ------------------------- Starting Soon backgrounds ----------------------- *
   * Animated, broadcast-grade backdrops for the Starting Soon scene. Each key
   * maps to a [data-ss-bg="…"] block in overlay.css (applied live from Settings).
   * `swatch` is a static CSS background used ONLY for the Settings preview tile;
   * the live overlay version is animated. All lean dark so on-screen text pops.
   * --------------------------------------------------------------------------- */
  const SS_BACKGROUNDS = [
    { key: 'none', label: 'None (transparent)',
      desc: 'No backdrop — your OBS scene shows through.',
      swatch: 'repeating-conic-gradient(#23262e 0 25%, #15171d 0 50%) 0 0/18px 18px' },
    { key: 'carbon', label: 'Carbon Grid',
      desc: 'Dark tech grid drifting under a soft vignette.',
      swatch: 'linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px) 0 0/16px 16px,' +
              'linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px) 0 0/16px 16px,' +
              'radial-gradient(120% 100% at 50% 30%,#141a22,#06080c 70%)' },
    { key: 'aurora', label: 'Aurora Drift',
      desc: 'Slow team-coloured light clouds over deep black.',
      swatch: 'radial-gradient(50% 60% at 30% 35%, color-mix(in srgb,var(--accent) 55%,transparent), transparent 70%),' +
              'radial-gradient(55% 60% at 72% 62%, color-mix(in srgb,var(--accent-2) 45%,transparent), transparent 70%),' +
              'radial-gradient(circle at 50% 40%,#0c1018,#05070b 75%)' },
    { key: 'velocity', label: 'Velocity Lines',
      desc: 'Diagonal accent streaks scrolling with momentum.',
      swatch: 'repeating-linear-gradient(115deg,#0a0e15 0 16px,' +
              'color-mix(in srgb,var(--accent) 24%,#0a0e15) 16px 18px,#0a0e15 18px 34px)' },
    { key: 'circuit', label: 'Circuit Dots',
      desc: 'Faint dot-matrix field with a pulsing accent core.',
      swatch: 'radial-gradient(color-mix(in srgb,var(--accent) 40%,transparent) 1.5px, transparent 1.6px) 0 0/14px 14px,' +
              'radial-gradient(circle at 50% 40%,#10141b,#06080c 75%)' },
    { key: 'radar', label: 'Radar Sweep',
      desc: 'Rotating sweep over concentric rings.',
      swatch: 'conic-gradient(from 200deg, transparent 0 300deg, color-mix(in srgb,var(--accent) 40%,transparent) 360deg),' +
              'radial-gradient(circle at 50% 50%,#0c1016,#05070b 75%)' },
    { key: 'spotlight', label: 'Spotlight',
      desc: 'A soft beam sweeping slowly across deep black.',
      swatch: 'radial-gradient(45% 80% at 50% 50%, color-mix(in srgb,var(--accent) 28%,transparent), transparent 70%), #06080b' },
    { key: 'hexflow', label: 'Hex Flow',
      desc: 'A drifting hex-mesh lattice over a pulsing core.',
      swatch: 'repeating-linear-gradient(60deg, color-mix(in srgb,var(--accent) 22%,transparent) 0 1px, transparent 1px 13px),' +
              'repeating-linear-gradient(-60deg, color-mix(in srgb,var(--accent) 22%,transparent) 0 1px, transparent 1px 13px),' +
              'radial-gradient(circle at 50% 45%,#0c121b,#06080c 75%)' },
    { key: 'embers', label: 'Embers Rise',
      desc: 'Warm sparks floating up from a smouldering base.',
      swatch: 'radial-gradient(1.6px 1.6px at 28% 68%, color-mix(in srgb,var(--accent) 92%,transparent), transparent 60%),' +
              'radial-gradient(1.4px 1.4px at 64% 38%, color-mix(in srgb,var(--accent-2) 80%,transparent), transparent 60%),' +
              'radial-gradient(120% 85% at 50% 112%, #2a0a04, #080302 65%)' },
    { key: 'nebula', label: 'Nebula',
      desc: 'Cosmic colour clouds drifting over a starfield.',
      swatch: 'radial-gradient(38% 42% at 34% 40%, color-mix(in srgb,var(--accent) 50%,transparent), transparent 70%),' +
              'radial-gradient(44% 48% at 68% 62%, color-mix(in srgb,var(--accent-2) 45%,transparent), transparent 70%),' +
              'radial-gradient(circle at 50% 40%,#0a0820,#04030c 75%)' }
  ];

  /* ------------------------------- Theme presets ----------------------------- *
   * One-click looks: a full color palette bundled with a motion style (`anim`,
   * the entrance/exit feel) AND an animated backdrop (`ssBg`, the Starting Soon
   * / bracket movement). Selecting one in Settings writes the colors+anim into
   * state.theme and the backdrop into state.startingSoon.bg, so a single click
   * restyles every overlay end-to-end. Manual controls still fine-tune afterwards
   * (preset becomes 'custom'). The "Signature" block at the bottom are the bold,
   * all-in looks that pair their own custom motion + backdrop.
   * --------------------------------------------------------------------------- */
  const THEMES = [
    { key: 'siege', label: 'Siege Default', anim: 'siege', ssBg: 'carbon', colors: {
        accent: '#ff7a00', accent2: '#1e90ff', bg: '#0a0e14',
        teamAColor: '#1e90ff', teamBColor: '#ff3b3b', panelOpacity: 88,
        gradient: false, gradFrom: '#0a0e14', gradTo: '#1a2740', gradAngle: 105 } },
    { key: 'inferno', label: 'Inferno', anim: 'pop', ssBg: 'embers', colors: {
        accent: '#ff3b2f', accent2: '#ff9d2f', bg: '#160606',
        teamAColor: '#ff5a3c', teamBColor: '#ffb43c', panelOpacity: 90,
        gradient: true, gradFrom: '#1a0606', gradTo: '#3a0f0f', gradAngle: 120 } },
    { key: 'arctic', label: 'Arctic', anim: 'cinematic', ssBg: 'aurora', colors: {
        accent: '#4fd0ff', accent2: '#2f7bff', bg: '#07121c',
        teamAColor: '#4fd0ff', teamBColor: '#8a6bff', panelOpacity: 85,
        gradient: true, gradFrom: '#07121c', gradTo: '#102a44', gradAngle: 110 } },
    { key: 'neon', label: 'Neon Night', anim: 'pop', ssBg: 'circuit', colors: {
        accent: '#b14bff', accent2: '#00e0ff', bg: '#0a0518',
        teamAColor: '#00e0ff', teamBColor: '#ff2fb0', panelOpacity: 86,
        gradient: true, gradFrom: '#0a0518', gradTo: '#1f0b3d', gradAngle: 125 } },
    { key: 'broadcast', label: 'Clean Broadcast', anim: 'fade', ssBg: 'spotlight', colors: {
        accent: '#2f7bff', accent2: '#14c08a', bg: '#0e1014',
        teamAColor: '#2f7bff', teamBColor: '#ff5a5a', panelOpacity: 94,
        gradient: false, gradFrom: '#0e1014', gradTo: '#1a2230', gradAngle: 105 } },
    { key: 'verdant', label: 'Verdant', anim: 'cinematic', ssBg: 'aurora', colors: {
        accent: '#38d39f', accent2: '#d8ff4f', bg: '#08140e',
        teamAColor: '#38d39f', teamBColor: '#ffcf3c', panelOpacity: 88,
        gradient: true, gradFrom: '#08140e', gradTo: '#103024', gradAngle: 115 } },
    { key: 'r6broadcast', label: 'R6 Broadcast', anim: 'siege', ssBg: 'carbon', colors: {
        accent: '#ff7a00', accent2: '#1e90ff', bg: '#0b0f15',
        teamAColor: '#2f9be0', teamBColor: '#e8743a', panelOpacity: 90,
        divider: '#5a6676', gradient: false, gradFrom: '#0b0f15', gradTo: '#162233', gradAngle: 105,
        skin: 'r6' } },

    /* ---- Signature looks (bold palette + custom motion + custom backdrop) ---- */
    { key: 'cyberpunk', label: 'Cyber Protocol', anim: 'glitch', ssBg: 'hexflow', colors: {
        accent: '#00f0ff', accent2: '#ff2bd6', bg: '#05040f',
        teamAColor: '#00f0ff', teamBColor: '#ff2bd6', panelOpacity: 84,
        divider: '#2bd6ff',
        gradient: true, gradFrom: '#07061a', gradTo: '#1a0838', gradAngle: 130 } },
    { key: 'molten', label: 'Molten Core', anim: 'pop', ssBg: 'embers', colors: {
        accent: '#ff5a1f', accent2: '#ffc23c', bg: '#140402',
        teamAColor: '#ff7a2f', teamBColor: '#ffd23c', panelOpacity: 90,
        divider: '#7a3a1a',
        gradient: true, gradFrom: '#1a0503', gradTo: '#3a0d05', gradAngle: 118 } },
    { key: 'deepspace', label: 'Deep Space', anim: 'cinematic', ssBg: 'nebula', colors: {
        accent: '#7c5cff', accent2: '#36d6ff', bg: '#04060f',
        teamAColor: '#36d6ff', teamBColor: '#b06bff', panelOpacity: 86,
        divider: '#3a3a7a',
        gradient: true, gradFrom: '#050414', gradTo: '#120a30', gradAngle: 115 } },
    { key: 'velocitygt', label: 'Velocity GT', anim: 'slide', ssBg: 'velocity', colors: {
        accent: '#ff2e3a', accent2: '#27c0ff', bg: '#0d0e12',
        teamAColor: '#ff2e3a', teamBColor: '#27c0ff', panelOpacity: 92,
        divider: '#8a9099',
        gradient: true, gradFrom: '#0d0e12', gradTo: '#241015', gradAngle: 100 } },
    { key: 'matrix', label: 'Matrix Run', anim: 'glitch', ssBg: 'circuit', colors: {
        accent: '#39ff88', accent2: '#9dff3c', bg: '#020a05',
        teamAColor: '#39ff88', teamBColor: '#9dff3c', panelOpacity: 88,
        divider: '#1f7a47',
        gradient: true, gradFrom: '#020a05', gradTo: '#06301a', gradAngle: 120 } }
  ];
  // Build a full theme object (colors + anim + preset key) ready for Store.set('theme', …).
  function presetTheme(key) {
    const p = THEMES.filter(function (x) { return x.key === key; })[0] || THEMES[0];
    const out = {};
    Object.keys(p.colors).forEach(function (k) { out[k] = p.colors[k]; });
    out.anim = p.anim;
    out.preset = p.key;
    return out;
  }
  // The animated backdrop a preset bundles (drives state.startingSoon.bg). May be
  // undefined for hand-built themes — callers should leave the backdrop untouched then.
  function presetBg(key) {
    const p = THEMES.filter(function (x) { return x.key === key; })[0];
    return p && p.ssBg;
  }

  /* -------------------------------- Games ------------------------------------ *
   * Supported titles and their competitive map pools. The control panel uses
   * these to populate the map / veto / round-history pickers; switching game
   * swaps state.mapban.pool to the chosen list. R6 is the default everywhere.
   * --------------------------------------------------------------------------- */
  const GAMES = [
    { key: 'r6', label: 'Rainbow Six Siege', maps: [
        'Bank', 'Border', 'Calypso Casino', 'Chalet', 'Clubhouse', 'Coastline',
        'Consulate', 'Fortress', 'Kafe', 'Lair', 'Nighthaven Labs', 'Oregon',
        'Skyscraper', 'Villa' ] },
    { key: 'valorant', label: 'VALORANT', maps: [
        'Abyss', 'Ascent', 'Bind', 'Breeze', 'Fracture', 'Haven',
        'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset' ] }
  ];
  function game(key) { return GAMES.filter(function (g) { return g.key === key; })[0] || GAMES[0]; }
  function gameMaps(key) { return game(key).maps.slice(); }
  function gameLabel(key) { return game(key).label; }

  return { applyTheme: applyTheme, bgm: bgm, ytId: ytId, esc: esc, px: px, team: team, mapSlug: mapSlug, setMapImg: setMapImg,
           FONTS: FONTS, FONT_IMPORT: FONT_IMPORT, fontStack: fontStack,
           ANIMS: ANIMS, SKINS: SKINS, SS_BACKGROUNDS: SS_BACKGROUNDS,
           THEMES: THEMES, presetTheme: presetTheme, presetBg: presetBg,
           GAMES: GAMES, gameMaps: gameMaps, gameLabel: gameLabel };
})();
