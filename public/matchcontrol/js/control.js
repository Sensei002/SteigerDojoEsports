/* =========================================================================
 * STGRMatchControl — Match Control panel
 * Two-way binds the panel to the live room state. Every change is pushed to
 * the store immediately; incoming state refreshes controls (skipping any
 * field you're actively editing so remote updates never fight your typing).
 * ========================================================================= */
(function () {
  'use strict';
  UI.mount('control');

  const $ = function (id) { return document.getElementById(id); };
  let state = Store.withDefaults(null);
  let teams = {};

  // Roles for the lower-third people (not everyone is a caster).
  const CASTER_ROLES = ['Caster', 'Analyst', 'Observer', 'Spectator'];

  /* ---- Tournament bracket layout (see store.js DEFAULT_STATE.bracket) ----- *
   * Groups run double elimination (5 matches each); playoffs run single
   * elimination (7 matches). Both editors are rendered from these tables.
   * ------------------------------------------------------------------------ */
  const BR_GROUPS = ['A', 'B', 'C', 'D'];
  const BR_GROUP_MATCHES = [
    { key: 'ub1', label: 'Upper · Round 1' },
    { key: 'ub2', label: 'Upper · Round 1' },
    { key: 'ubf', label: 'Upper · Final → 1st seed' },
    { key: 'lb1', label: 'Lower · Round 1' },
    { key: 'lbf', label: 'Lower · Final → 2nd seed' }
  ];
  const BR_KO_ROUNDS = [
    { label: 'Quarter-finals', matches: [
      { key: 'qf1', label: 'QF 1' }, { key: 'qf2', label: 'QF 2' },
      { key: 'qf3', label: 'QF 3' }, { key: 'qf4', label: 'QF 4' } ] },
    { label: 'Semi-finals', matches: [
      { key: 'sf1', label: 'SF 1' }, { key: 'sf2', label: 'SF 2' } ] },
    { label: 'Final', matches: [ { key: 'final', label: 'Grand Final' } ] }
  ];
  function brBlankMatch() { return { p1: '', p2: '', s1: '', s2: '', w: '' }; }

  /* ----------------------------- subscribe ------------------------------ */
  Store.subscribe('', function (val) {
    state = Store.withDefaults(val);
    teams = state.teams || {};
    render();
  });

  function teamName(id) { return (teams[id] && teams[id].name) || '—'; }

  /* ------------------------------ render -------------------------------- */
  function render() {
    fillTeamSelect($('teamA'), state.match.teamA);
    fillTeamSelect($('teamB'), state.match.teamB);
    setSeg('gameSel', state.match.game || 'r6');
    fillMapSelect();

    setVal('scoreA', state.match.scoreA);
    setVal('scoreB', state.match.scoreB);
    setVal('round', state.match.round);
    setVal('mapsA', state.match.mapsA || 0);
    setVal('mapsB', state.match.mapsB || 0);
    setChecked('sbVisible', state.match.visible !== false);
    setSeg('sideA', state.match.sideA);
    setSeg('phase', state.match.phase);
    setInput('title', state.match.title);

    // scorebug branding (event logo shown in the bar center)
    const br = state.branding || {};
    $('eventLogoPreview').src = br.eventLogo || transparentPx();
    setInput('eventLogoUrl', /^https?:/i.test(br.eventLogo || '') ? br.eventLogo : '');

    // background music (loops behind starting-soon / roster / bracket scenes)
    const au = state.audio || {};
    const isUrl = /^https?:/i.test(au.src || '');
    const isYt = !!OV.ytId(au.src || '');
    setChecked('bgmEnabled', au.enabled);
    setInput('bgmUrl', isUrl ? au.src : '');
    if (document.activeElement !== $('bgmVol')) {
      const v = (au.volume == null ? 60 : au.volume);
      $('bgmVol').value = v;
      $('bgmVolVal').textContent = v + '%';
    }
    $('bgmName').textContent = au.name
      ? ('Uploaded: ' + au.name)
      : (isYt ? '▶ Playing via YouTube.'
              : isUrl ? 'Playing from a direct audio URL.'
                      : 'Paste a YouTube link (plays via YouTube), a direct .mp3/.ogg URL, or upload a file below.');

    // scorebug far-right message
    const sm = state.scoreMsg || {};
    setChecked('smVisible', sm.visible);
    setInput('smText', sm.text);
    fillSmFont();
    setSmStyle('bold', sm.bold);
    setSmStyle('italic', sm.italic);
    setSmStyle('uppercase', sm.uppercase !== false);
    renderSmPreview();

    // map card (far-left scorebug)
    const mc = state.mapCard || {};
    setChecked('mcVisible', mc.visible);
    setInput('mcDuration', mc.duration || 8);
    setVal('mcMapName', (state.match.map || '').trim() || '— none —');

    // starting soon scene
    const ss = state.startingSoon || {};
    setChecked('ssVisible', ss.visible);
    setInput('ssTitle', ss.title);
    setInput('ssSub', ss.subtitle);
    setChecked('ssTimerShow', ss.showTimer !== false);
    renderSsClock();

    $('noTeams').style.display = Object.keys(teams).length ? 'none' : '';

    // roster
    setChecked('rosterVisible', state.roster.visible);
    setSeg('rosterTeam', state.roster.team);
    const rTeamId = state.roster.team === 'B' ? state.match.teamB : state.match.teamA;
    const rt = teams[rTeamId];
    $('rosterInfo').textContent = rt
      ? 'Showing ' + rt.name + ' · ' + ((rt.players || []).filter(function (p) { return p.name; }).length) + ' players'
      : 'Select a team in the scorebug first.';

    // lower third
    setChecked('ltVisible', state.lowerThird.visible);
    setSeg('ltMode', state.lowerThird.mode);
    $('ltCasters').style.display = state.lowerThird.mode === 'casters' ? '' : 'none';
    $('ltTitle').style.display = state.lowerThird.mode === 'title' ? '' : 'none';
    renderCasters();
    setInput('ltTitleText', state.lowerThird.title);
    setInput('ltSubText', state.lowerThird.subtitle);
    setInput('ltAutoHide', state.lowerThird.autoHide || 0);

    // map ban
    setChecked('mbVisible', state.mapban.visible);
    setSeg('mbFormat', state.mapban.format);
    renderSteps();

    // round history
    setChecked('rhVisible', state.roundHistory.visible);
    setVal('rhSiteLabel', (state.match.game === 'valorant') ? 'Site' : 'Bomb objective');
    fillRhMap();
    fillRhSite();
    renderRhList();

    // tournament bracket
    setChecked('brVisible', state.bracket.visible);
    setInput('brTitle', state.bracket.title);
    renderBracket();
  }

  /* -------- DOM helpers that respect the currently-focused element ------ */
  function focused(el) { return document.activeElement === el; }
  function setVal(id, v) { const el = $(id); if (el) el.textContent = v; }
  function setInput(id, v) { const el = $(id); if (el && !focused(el)) el.value = (v == null ? '' : v); }
  function setChecked(id, v) { const el = $(id); if (el) el.checked = !!v; }
  function setSeg(id, v) {
    const seg = $(id); if (!seg) return;
    seg.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-v') === String(v));
    });
  }

  function fillTeamSelect(sel, current) {
    if (focused(sel)) return;
    const ids = Object.keys(teams);
    sel.innerHTML = '<option value="">— select team —</option>' +
      ids.map(function (id) {
        return '<option value="' + id + '">' + esc(teams[id].name) + '</option>';
      }).join('');
    sel.value = current || '';
  }

  const MAP_POOL = state.mapban.pool;
  function fillMapSelect() {
    const sel = $('mapSel');
    if (focused(sel)) return;
    const pool = state.mapban.pool || MAP_POOL;
    sel.innerHTML = '<option value="">— no map —</option>' +
      pool.map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('') +
      '<option value="__custom">Custom…</option>';
    const cur = state.match.map || '';
    if (cur && pool.indexOf(cur) === -1) {
      sel.value = '__custom';
      $('mapCustom').style.display = ''; $('mapCustom').value = cur;
    } else {
      sel.value = cur;
      $('mapCustom').style.display = 'none';
    }
  }

  // Switch the active game: load its competitive map pool and clear the now
  // mismatched map selections (current map + veto). Round-history log is kept.
  function switchGame(g) {
    if ((state.match.game || 'r6') === g) return;
    Store.update('match', { game: g, map: '' });
    Store.update('mapban', { pool: OV.gameMaps(g), steps: [], activeStep: 0 });
    Store.update('roundHistory', { map: '', site: '' });
    UI.toast(OV.gameLabel(g) + ' selected · map pool updated');
  }

  /* ----------------------------- bindings ------------------------------- */
  // steppers (score / round)
  document.querySelectorAll('.stepper[data-step]').forEach(function (st) {
    const key = st.getAttribute('data-step');
    st.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        const d = parseInt(b.getAttribute('data-d'), 10);
        const cur = parseInt(state.match[key], 10) || 0;
        const next = Math.max(0, cur + d);
        Store.update('match', objOf(key, next));
      };
    });
  });

  $('teamA').onchange = function () { Store.update('match', { teamA: this.value }); };
  $('teamB').onchange = function () { Store.update('match', { teamB: this.value }); };
  $('sbVisible').onchange = function () { Store.update('match', { visible: this.checked }); };

  bindSeg('sideA',  function (v) { Store.update('match', { sideA: v }); });
  bindSeg('phase',  function (v) { Store.update('match', { phase: v }); });
  bindSeg('gameSel', switchGame);

  /* ----------------------- scorebug branding ---------------------------- */
  // Event logo (small image) — resized + stored as a data URL, like team logos.
  $('eventLogoFile').addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      resizeImage(reader.result, 256, function (dataUrl) {
        safeUpdate('branding', { eventLogo: dataUrl }, true);
      });
    };
    reader.readAsDataURL(file);
  });
  $('eventLogoUrl').oninput = function () { Store.update('branding', { eventLogo: this.value.trim() }); };
  $('eventLogoClear').onclick = function () {
    $('eventLogoFile').value = ''; $('eventLogoUrl').value = '';
    Store.update('branding', { eventLogo: '' });
  };

  /* ----------------------- background music ----------------------------- */
  // Uploaded track is stored as a data URL (like the sponsor video), so it
  // syncs to the overlays with no backend. Big files may hit the DB limit —
  // safeUpdate surfaces a toast pointing to the hosted-URL field instead.
  $('bgmFile').addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      safeUpdate('audio', { src: reader.result, name: file.name }, true);
    };
    reader.readAsDataURL(file);
  });
  $('bgmUrl').oninput = function () {
    Store.update('audio', { src: this.value.trim(), name: '' });
  };
  $('bgmEnabled').onchange = function () { Store.update('audio', { enabled: this.checked }); };
  $('bgmVol').oninput = function () { $('bgmVolVal').textContent = this.value + '%'; };
  $('bgmVol').onchange = function () { Store.update('audio', { volume: +this.value }); };
  $('bgmClear').onclick = function () {
    $('bgmFile').value = ''; $('bgmUrl').value = '';
    Store.update('audio', { src: '', name: '' });
  };

  $('mapSel').onchange = function () {
    if (this.value === '__custom') {
      $('mapCustom').style.display = ''; $('mapCustom').focus();
    } else {
      $('mapCustom').style.display = 'none';
      Store.update('match', { map: this.value });
    }
  };
  $('mapCustom').oninput = function () { Store.update('match', { map: this.value }); };
  $('title').oninput = function () { Store.update('match', { title: this.value }); };

  $('aWin').onclick = function () { awardRound('A'); };
  $('bWin').onclick = function () { awardRound('B'); };
  $('undoRound').onclick = undoRound;
  $('nextMap').onclick = nextMap;
  $('resetScore').onclick = function () {
    Store.update('match', { scoreA: 0, scoreB: 0, round: 1, rounds: [] });
  };
  $('swap').onclick = function () {
    Store.update('match', {
      teamA: state.match.teamB, teamB: state.match.teamA,
      scoreA: state.match.scoreB, scoreB: state.match.scoreA,
      mapsA: state.match.mapsB || 0, mapsB: state.match.mapsA || 0,
      rounds: toArr(state.match.rounds).map(function (r) {
        return { team: r.team === 'A' ? 'B' : 'A', side: r.side };
      }),
      sideA: state.match.sideA === 'ATK' ? 'DEF' : 'ATK'
    });
  };

  // Award a round to a team: log it (with the side they currently hold) and
  // bump that team's score + the round counter — all in one update.
  function awardRound(team) {
    const m = state.match;
    const side = team === 'A'
      ? (m.sideA || 'ATK')
      : ((m.sideA || 'ATK') === 'ATK' ? 'DEF' : 'ATK');
    const rounds = toArr(m.rounds).slice();
    rounds.push({ team: team, side: side });
    const patch = { rounds: rounds, round: (m.round || 1) + 1 };
    if (team === 'A') patch.scoreA = (m.scoreA || 0) + 1;
    else patch.scoreB = (m.scoreB || 0) + 1;
    Store.update('match', patch);
  }

  function undoRound() {
    const m = state.match;
    const rounds = toArr(m.rounds).slice();
    const last = rounds.pop();
    if (!last) { UI.toast('No rounds to undo'); return; }
    const patch = { rounds: rounds, round: Math.max(1, (m.round || 1) - 1) };
    if (last.team === 'A') patch.scoreA = Math.max(0, (m.scoreA || 0) - 1);
    else patch.scoreB = Math.max(0, (m.scoreB || 0) - 1);
    Store.update('match', patch);
  }

  // Award the current map to whoever is ahead, then clear the map's rounds.
  function nextMap() {
    const m = state.match;
    const a = m.scoreA || 0, b = m.scoreB || 0;
    const patch = { scoreA: 0, scoreB: 0, round: 1, rounds: [] };
    if (a > b) patch.mapsA = (m.mapsA || 0) + 1;
    else if (b > a) patch.mapsB = (m.mapsB || 0) + 1;
    Store.update('match', patch);
    UI.toast(a === b ? 'Rounds cleared (no map winner — tie)' : 'Map awarded · rounds cleared');
  }

  // roster
  $('rosterVisible').onchange = function () { Store.update('roster', { visible: this.checked }); };
  bindSeg('rosterTeam', function (v) { Store.update('roster', { team: v }); });

  // lower third
  $('ltVisible').onchange = function () { Store.update('lowerThird', { visible: this.checked }); };
  bindSeg('ltMode', function (v) { Store.update('lowerThird', { mode: v }); });
  $('ltTitleText').oninput = function () { Store.update('lowerThird', { title: this.value }); };
  $('ltSubText').oninput = function () { Store.update('lowerThird', { subtitle: this.value }); };
  $('ltAutoHide').oninput = function () { Store.update('lowerThird', { autoHide: Math.max(0, parseInt(this.value, 10) || 0) }); };
  $('addCaster').onclick = function () {
    const cs = (state.lowerThird.casters || []).slice();
    if (cs.length >= 4) { UI.toast('Max 4 people'); return; }
    cs.push({ name: '', handle: '', role: 'Caster' });
    Store.update('lowerThird', { casters: cs });
  };

  // quick show/hide buttons
  let ltHideTimer = null;
  document.querySelectorAll('[data-show]').forEach(function (b) {
    b.onclick = function () {
      const w = b.getAttribute('data-show');
      if (w === 'roster')  Store.update('roster', { visible: true, team: 'A' });
      if (w === 'rosterB') Store.update('roster', { visible: true, team: 'B' });
      if (w === 'lt') {
        Store.update('lowerThird', { visible: true });
        clearTimeout(ltHideTimer);
        const secs = Math.max(0, parseInt($('ltAutoHide').value, 10) || 0);
        if (secs > 0) {
          ltHideTimer = setTimeout(function () { Store.update('lowerThird', { visible: false }); }, secs * 1000);
        }
      }
    };
  });
  document.querySelectorAll('[data-hide]').forEach(function (b) {
    b.onclick = function () {
      const w = b.getAttribute('data-hide');
      if (w === 'roster') Store.update('roster', { visible: false });
      if (w === 'lt')   { Store.update('lowerThird', { visible: false }); clearTimeout(ltHideTimer); }
    };
  });

  // map ban controls
  $('mbVisible').onchange = function () { Store.update('mapban', { visible: this.checked }); };
  bindSeg('mbFormat', function (v) { Store.update('mapban', { format: v }); });
  $('mbGenerate').onclick = function () { Store.update('mapban', { steps: standardVeto(state.mapban.format), activeStep: 0 }); };
  $('mbClear').onclick = function () { Store.update('mapban', { steps: [], activeStep: 0 }); };
  $('mbAddStep').onclick = function () {
    const s = (state.mapban.steps || []).slice();
    s.push({ action: 'ban', team: 'A', map: '', side: '' });
    Store.update('mapban', { steps: s });
  };
  $('mbPrev').onclick = function () { Store.update('mapban', { activeStep: Math.max(0, (state.mapban.activeStep||0) - 1) }); };
  $('mbNext').onclick = function () {
    const max = (state.mapban.steps || []).length - 1;
    Store.update('mapban', { activeStep: Math.min(max < 0 ? 0 : max, (state.mapban.activeStep||0) + 1) });
  };

  /* --------------------------- casters render --------------------------- */
  function renderCasters() {
    const wrap = $('casterRows');
    const cs = state.lowerThird.casters || [];
    // don't rebuild while typing inside it
    if (wrap.contains(document.activeElement)) return;
    wrap.innerHTML = cs.map(function (c, i) {
      const role = c.role || 'Caster';
      const roleOpts = CASTER_ROLES.map(function (r) {
        return '<option value="' + esc(r) + '"' + (role === r ? ' selected' : '') + '>' + esc(r) + '</option>';
      }).join('');
      return '<div class="player-row">' +
        '<input class="pname c-name" data-i="' + i + '" type="text" placeholder="Name" value="' + esc(c.name) + '">' +
        '<select class="crole c-role" data-i="' + i + '">' + roleOpts + '</select>' +
        '<input class="prole c-handle" data-i="' + i + '" type="text" placeholder="@handle" value="' + esc(c.handle) + '">' +
        '<button class="btn ghost sm" data-del="' + i + '" type="button">✕</button></div>';
    }).join('');
    wrap.querySelectorAll('.c-name').forEach(function (el) {
      el.oninput = function () { editCaster(+el.getAttribute('data-i'), 'name', el.value); };
    });
    wrap.querySelectorAll('.c-role').forEach(function (el) {
      el.onchange = function () { editCaster(+el.getAttribute('data-i'), 'role', el.value); };
    });
    wrap.querySelectorAll('.c-handle').forEach(function (el) {
      el.oninput = function () { editCaster(+el.getAttribute('data-i'), 'handle', el.value); };
    });
    wrap.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        const cs2 = (state.lowerThird.casters || []).slice();
        cs2.splice(+b.getAttribute('data-del'), 1);
        Store.update('lowerThird', { casters: cs2 });
      };
    });
  }
  function editCaster(i, key, val) {
    const cs = (state.lowerThird.casters || []).slice();
    cs[i] = Object.assign({ name: '', handle: '', role: 'Caster' }, cs[i]); cs[i][key] = val;
    state.lowerThird.casters = cs;        // local echo so we don't lose focus
    Store.set('lowerThird/casters', cs);
  }

  /* ---------------------------- steps render ---------------------------- */
  const ACTIONS = ['ban', 'pick', 'decider'];
  function renderSteps() {
    const wrap = $('mbSteps');
    if (wrap.contains(document.activeElement)) return;
    const steps = state.mapban.steps || [];
    const pool = state.mapban.pool || MAP_POOL;
    if (!steps.length) { wrap.innerHTML = '<div class="empty">No veto steps. Click “Build standard veto”.</div>'; return; }
    wrap.innerHTML = steps.map(function (s, i) {
      const active = i === (state.mapban.activeStep || 0);
      return '<div class="list-item" style="' + (active ? 'border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)' : '') + '">' +
        '<span class="tag">' + (i + 1) + '</span>' +
        sel('act', i, ACTIONS.map(function (a) { return [a, a.toUpperCase()]; }), s.action) +
        sel('team', i, [['A','Team A'],['B','Team B'],['','—']], s.team) +
        sel('map', i, [['','— map —']].concat(pool.map(function (m){return [m,m];})), s.map) +
        sel('side', i, [['','side —'],['ATK','ATK'],['DEF','DEF']], s.side) +
        '<button class="btn ghost sm" data-setactive="' + i + '">▶</button>' +
        '<button class="btn ghost sm" data-delstep="' + i + '">✕</button>' +
        '</div>';
    }).join('');

    wrap.querySelectorAll('select[data-field]').forEach(function (el) {
      el.onchange = function () {
        const i = +el.getAttribute('data-i'), f = el.getAttribute('data-field');
        const steps2 = (state.mapban.steps || []).slice();
        steps2[i] = Object.assign({}, steps2[i]); steps2[i][f] = el.value;
        Store.set('mapban/steps', steps2);
      };
    });
    wrap.querySelectorAll('[data-setactive]').forEach(function (b) {
      b.onclick = function () { Store.update('mapban', { activeStep: +b.getAttribute('data-setactive') }); };
    });
    wrap.querySelectorAll('[data-delstep]').forEach(function (b) {
      b.onclick = function () {
        const steps2 = (state.mapban.steps || []).slice();
        steps2.splice(+b.getAttribute('data-delstep'), 1);
        Store.update('mapban', { steps: steps2 });
      };
    });

    function sel(field, i, opts, cur) {
      return '<select data-field="' + field + '" data-i="' + i + '" style="flex:1;min-width:0">' +
        opts.map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (String(cur) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
        }).join('') + '</select>';
    }
  }

  /* standard veto patterns (team A bans first) */
  function standardVeto(fmt) {
    if (fmt === 'BO1') return [
      { action:'ban', team:'A', map:'', side:'' }, { action:'ban', team:'B', map:'', side:'' },
      { action:'ban', team:'A', map:'', side:'' }, { action:'ban', team:'B', map:'', side:'' },
      { action:'ban', team:'A', map:'', side:'' }, { action:'ban', team:'B', map:'', side:'' },
      { action:'decider', team:'', map:'', side:'' }
    ];
    if (fmt === 'BO5') return [
      { action:'ban', team:'A', map:'', side:'' }, { action:'ban', team:'B', map:'', side:'' },
      { action:'pick', team:'A', map:'', side:'' }, { action:'pick', team:'B', map:'', side:'' },
      { action:'pick', team:'A', map:'', side:'' }, { action:'pick', team:'B', map:'', side:'' },
      { action:'decider', team:'', map:'', side:'' }
    ];
    // BO3 default
    return [
      { action:'ban', team:'A', map:'', side:'' }, { action:'ban', team:'B', map:'', side:'' },
      { action:'pick', team:'A', map:'', side:'' }, { action:'pick', team:'B', map:'', side:'' },
      { action:'ban', team:'A', map:'', side:'' }, { action:'ban', team:'B', map:'', side:'' },
      { action:'decider', team:'', map:'', side:'' }
    ];
  }

  /* ========================== STARTING SOON ============================ *
   * Full-screen pre-show scene with a control-panel-driven countdown.
   * Timer model: when running, timerEndsAt (epoch ms) is authoritative and
   * the clock is derived locally; when paused, timerRemaining (seconds) is.
   * -------------------------------------------------------------------- */
  function ssLiveRemaining() {
    const ss = state.startingSoon || {};
    if (ss.timerRunning && ss.timerEndsAt) {
      return Math.max(0, Math.round((ss.timerEndsAt - Date.now()) / 1000));
    }
    return Math.max(0, parseInt(ss.timerRemaining, 10) || 0);
  }
  function fmtClock(total) {
    const m = Math.floor(total / 60), s = total % 60;
    return m + ':' + String(s).padStart(2, '0');
  }
  function renderSsClock() {
    const el = $('ssClock'); if (el) el.textContent = fmtClock(ssLiveRemaining());
  }
  // tick the panel's own clock once a second while running (purely visual)
  setInterval(function () {
    if (state.startingSoon && state.startingSoon.timerRunning) renderSsClock();
  }, 250);

  $('ssVisible').onchange = function () { Store.update('startingSoon', { visible: this.checked }); };
  $('ssTitle').oninput = function () { Store.update('startingSoon', { title: this.value }); };
  $('ssSub').oninput = function () { Store.update('startingSoon', { subtitle: this.value }); };
  $('ssTimerShow').onchange = function () { Store.update('startingSoon', { showTimer: this.checked }); };

  $('ssSet').onclick = function () {
    const m = Math.max(0, parseInt($('ssMin').value, 10) || 0);
    const s = Math.min(59, Math.max(0, parseInt($('ssSec').value, 10) || 0));
    const total = m * 60 + s;
    Store.update('startingSoon', { timerRunning: false, timerRemaining: total, timerEndsAt: 0 });
  };
  $('ssStart').onclick = function () {
    const rem = ssLiveRemaining();
    if (rem <= 0) { UI.toast('Set a duration first'); return; }
    Store.update('startingSoon', { timerRunning: true, timerEndsAt: Date.now() + rem * 1000 });
  };
  $('ssPause').onclick = function () {
    Store.update('startingSoon', { timerRunning: false, timerRemaining: ssLiveRemaining(), timerEndsAt: 0 });
  };
  $('ssReset').onclick = function () {
    Store.update('startingSoon', { timerRunning: false, timerRemaining: 600, timerEndsAt: 0 });
  };
  document.querySelectorAll('[data-ssadd]').forEach(function (b) {
    b.onclick = function () {
      const d = parseInt(b.getAttribute('data-ssadd'), 10) || 0;
      const ss = state.startingSoon || {};
      const next = Math.max(0, ssLiveRemaining() + d);
      if (ss.timerRunning) Store.update('startingSoon', { timerEndsAt: Date.now() + next * 1000 });
      else Store.update('startingSoon', { timerRemaining: next });
    };
  });

  /* ====================== SCOREBUG FAR-RIGHT MESSAGE ===================== *
   * Free text pinned to the far-right of the scorebug, with a font + style
   * picker and a live preview. Renders via the shared OV.FONTS set.
   * ---------------------------------------------------------------------- */
  function fillSmFont() {
    const sel = $('smFont');
    if (focused(sel)) return;
    const cur = (state.scoreMsg && state.scoreMsg.font) || 'bebas';
    sel.innerHTML = OV.FONTS.map(function (f) {
      return '<option value="' + f.key + '" style="font-family:' + f.stack + '">' + esc(f.label) + '</option>';
    }).join('');
    sel.value = cur;
  }
  function setSmStyle(key, on) {
    const btn = document.querySelector('#smStyle [data-sm="' + key + '"]');
    if (btn) btn.classList.toggle('primary', !!on);
  }
  function renderSmPreview() {
    const sm = state.scoreMsg || {};
    const el = $('smPreview');
    el.style.fontFamily = OV.fontStack(sm.font || 'bebas');
    el.style.fontWeight = sm.bold ? '800' : '600';
    el.style.fontStyle = sm.italic ? 'italic' : 'normal';
    el.style.textTransform = (sm.uppercase !== false) ? 'uppercase' : 'none';
    el.style.letterSpacing = (sm.font === 'bebas' || sm.font === 'anton') ? '1px' : '.5px';
    el.textContent = sm.text || 'Your event name';
    el.style.opacity = sm.text ? '1' : '.4';
  }

  $('smVisible').onchange = function () { Store.update('scoreMsg', { visible: this.checked }); };
  $('smText').oninput = function () {
    state.scoreMsg.text = this.value;          // local echo so preview is instant
    renderSmPreview();
    Store.update('scoreMsg', { text: this.value });
  };
  $('smFont').onchange = function () { Store.update('scoreMsg', { font: this.value }); };
  document.querySelectorAll('#smStyle [data-sm]').forEach(function (b) {
    b.onclick = function () {
      const key = b.getAttribute('data-sm');
      const cur = !!(state.scoreMsg && state.scoreMsg[key === 'uppercase' ? 'uppercase' : key]);
      // uppercase defaults to true, so flip from its effective value
      const eff = key === 'uppercase' ? (state.scoreMsg.uppercase !== false) : cur;
      Store.update('scoreMsg', objOf(key, !eff));
    };
  });

  // map card (far-left scorebug)
  $('mcVisible').onchange = function () { Store.update('mapCard', { visible: this.checked }); };
  $('mcDuration').onchange = function () {
    const d = Math.min(60, Math.max(1, parseInt(this.value, 10) || 8));
    this.value = d;
    Store.update('mapCard', { duration: d });
  };
  $('mcPlay').onclick = function () {
    if (!(state.match.map || '').trim()) { UI.toast('Pick a current map first'); return; }
    const d = Math.min(60, Math.max(1, parseInt($('mcDuration').value, 10) || 8));
    Store.update('mapCard', { play: Date.now(), duration: d });
    UI.toast('Map card · ' + state.match.map + ' (' + d + 's)');
  };

  /* =========================== ROUND HISTORY =========================== *
   * Log each round's map + bomb objective and who won. Also mirrors the win
   * onto the scorebug (score + round pips) so the two stay in sync.
   * --------------------------------------------------------------------- */
  // Best-effort competitive bomb objectives per map. Fully editable in-panel
  // via the "Custom…" option — verify against the current season as needed.
  const MAP_SITES = {
    'Bank': ['2F Executive Lounge / CEO Office', '1F Open Area / Staff Room',
             '1F Tellers Office / Archives', 'B Lockers / CCTV Room'],
    'Border': ['2F Armory Lockers / Archives', '1F Bathroom / Tellers',
               '1F Ventilation Room / Workshop', '1F Customs Inspection / Supply Room'],
    'Calypso Casino': ['2F Cigar Room / Pool', '1F Blackjack / Poker',
                       '1F Bar / Betting', 'B CCTV / Vault Checkpoint'],
    'Chalet': ['2F Master Bedroom / Office', '1F Bar / Gaming Room',
               '1F Kitchen / Trophy Room', 'B Wine Cellar / Snowmobile Garage'],
    'Clubhouse': ['2F Gym / Bedroom', '2F Cash Room / CCTV Room',
                  '1F Bar / Stock Room', 'B Church / Arsenal Room'],
    'Coastline': ['2F Penthouse / Theater', '2F Hookah Lounge / Billiards Room',
                  '1F Blue Bar / Sunrise Bar', '1F Kitchen / Service Entrance'],
    'Consulate': ['2F Consul Office / Meeting Room', '1F Antechamber / Piano Room',
                  '1F Tellers / Archives', 'B Garage / Cafeteria'],
    'Fortress': ['2F Bedroom / Commander\'s Office', '2F Dormitory / Briefing Room',
                 '1F Kitchen / Cafeteria', '1F Hammam / Sitting Room'],
    'Kafe': ['3F Bar / Cocktail Lounge', '2F Fireplace Hall / Mining Room',
             '2F Reading Room / Fireplace Hall', '1F Kitchen Service / Kitchen Cooking'],
    'Lair': ['2F Master Office / R6 Room', '1F Bunks / Briefing',
             '1F Armory / Weapon Maintenance', 'B Lab / Lab Support'],
    'Nighthaven Labs': ['2F Command / Server', '1F Control / Storage',
                        '1F Kitchen / Cafeteria', 'B Tank / Assembly'],
    'Oregon': ['1F Kitchen / Dining Hall', '1F Meeting Hall / Kitchen',
               '2F Kids Dorms / Dorms Main Hall', 'B Laundry Room / Supply Room'],
    'Skyscraper': ['2F Tea Room / Karaoke', '2F Exhibition Room / Office',
                   '1F Kitchen / BBQ', '1F Bedroom / Bathroom'],
    'Villa': ['2F Aviator Room / Games Room', '2F Trophy Room / Statuary Room',
              '1F Living Room / Library', '1F Dining Room / Kitchen']
  };

  // VALORANT plant sites — A/B for most maps, A/B/C for Haven & Lotus.
  const VALORANT_SITES = {
    _default: ['A Site', 'B Site'],
    'Haven': ['A Site', 'B Site', 'C Site'],
    'Lotus': ['A Site', 'B Site', 'C Site']
  };

  function rhSitesFor(map) {
    if ((state.match.game || 'r6') === 'valorant') {
      return VALORANT_SITES[map] || VALORANT_SITES._default;
    }
    return MAP_SITES[map] || [];
  }
  function rhCurrentSite() {
    const sel = $('rhSite');
    if (sel.value === '__custom') return ($('rhSiteCustom').value || '').trim();
    return sel.value || '';
  }

  function fillRhMap() {
    const sel = $('rhMap');
    if (focused(sel)) return;
    const pool = state.mapban.pool || MAP_POOL;
    const cur = state.roundHistory.map || state.match.map || '';
    sel.innerHTML = '<option value="">— select map —</option>' +
      pool.map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('') +
      (cur && pool.indexOf(cur) === -1 ? '<option value="' + esc(cur) + '">' + esc(cur) + '</option>' : '');
    sel.value = cur;
  }

  function fillRhSite() {
    const sel = $('rhSite'), custom = $('rhSiteCustom');
    if (focused(sel) || focused(custom)) return;
    const map = state.roundHistory.map || state.match.map || '';
    const sites = rhSitesFor(map);
    const cur = state.roundHistory.site || '';
    sel.innerHTML = '<option value="">— select bombsite —</option>' +
      sites.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('') +
      '<option value="__custom">Custom…</option>';
    if (cur && sites.indexOf(cur) === -1) {
      sel.value = '__custom';
      custom.style.display = ''; custom.value = cur;
    } else {
      sel.value = cur;
      custom.style.display = 'none';
    }
  }

  function rhTeamShort(code) {
    const id = code === 'B' ? state.match.teamB : state.match.teamA;
    const t = teams[id];
    return (t && (t.short || t.name)) || ('TEAM ' + code);
  }
  function rhTeamColor(code) {
    const id = code === 'B' ? state.match.teamB : state.match.teamA;
    const t = teams[id];
    return (t && t.color) || (code === 'B' ? '#ff3b3b' : '#1e90ff');
  }
  function rhTeamLogo(code) {
    const id = code === 'B' ? state.match.teamB : state.match.teamA;
    const t = teams[id];
    return (t && t.logo) || '';
  }

  function renderRhList() {
    const wrap = $('rhList');
    if (wrap.contains(document.activeElement)) return;
    const entries = toArr(state.roundHistory.entries);
    if (!entries.length) {
      wrap.innerHTML = '<div class="empty">No rounds logged yet. Pick a map &amp; bombsite, then “Team A/B won”.</div>';
      return;
    }
    wrap.innerHTML = entries.map(function (e, i) {
      const color = rhTeamColor(e.team);
      const logo = rhTeamLogo(e.team);
      const where = [e.map, e.site].filter(Boolean).join(' · ') || '—';
      return '<div class="list-item" style="border-left:4px solid ' + color + '">' +
        '<span class="tag">R' + (i + 1) + '</span>' +
        (logo ? '<img src="' + esc(logo) + '" alt="" style="width:22px;height:22px;object-fit:contain;flex:0 0 auto">' : '') +
        '<span style="font-weight:700;color:' + color + ';white-space:nowrap">' + esc(rhTeamShort(e.team)) + '</span>' +
        '<span class="muted" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(where) + '</span>' +
        '<button class="btn ghost sm" data-rhdel="' + i + '">✕</button>' +
        '</div>';
    }).join('');
    wrap.querySelectorAll('[data-rhdel]').forEach(function (b) {
      b.onclick = function () { rhDeleteEntry(+b.getAttribute('data-rhdel')); };
    });
  }

  // Append a round: log map+site+winner AND mirror the win onto the scorebug.
  function rhLogWin(team) {
    const map = state.roundHistory.map || state.match.map || '';
    const site = rhCurrentSite();
    const entries = toArr(state.roundHistory.entries).slice();
    entries.push({ team: team, map: map, site: site });
    Store.update('roundHistory', { entries: entries });
    awardRound(team);   // scorebug score + pip + round counter
  }

  // Remove an arbitrary logged round and pull one matching pip off the scorebug.
  function rhDeleteEntry(i) {
    const entries = toArr(state.roundHistory.entries).slice();
    const removed = entries.splice(i, 1)[0];
    Store.update('roundHistory', { entries: entries });
    if (!removed) return;
    const m = state.match;
    const rounds = toArr(m.rounds).slice();
    for (let j = rounds.length - 1; j >= 0; j--) {
      if (rounds[j].team === removed.team) { rounds.splice(j, 1); break; }
    }
    const patch = { rounds: rounds, round: Math.max(1, (m.round || 1) - 1) };
    if (removed.team === 'A') patch.scoreA = Math.max(0, (m.scoreA || 0) - 1);
    else patch.scoreB = Math.max(0, (m.scoreB || 0) - 1);
    Store.update('match', patch);
  }

  $('rhVisible').onchange = function () { Store.update('roundHistory', { visible: this.checked }); };
  $('rhMap').onchange = function () { Store.update('roundHistory', { map: this.value, site: '' }); };
  $('rhSite').onchange = function () {
    if (this.value === '__custom') {
      $('rhSiteCustom').style.display = ''; $('rhSiteCustom').focus();
    } else {
      $('rhSiteCustom').style.display = 'none';
      Store.update('roundHistory', { site: this.value });
    }
  };
  $('rhSiteCustom').oninput = function () { Store.update('roundHistory', { site: this.value.trim() }); };
  $('rhWinA').onclick = function () { rhLogWin('A'); };
  $('rhWinB').onclick = function () { rhLogWin('B'); };
  $('rhUndo').onclick = function () {
    const entries = toArr(state.roundHistory.entries).slice();
    if (!entries.pop()) { UI.toast('No rounds to undo'); return; }
    Store.update('roundHistory', { entries: entries });
    undoRound();
  };
  $('rhClear').onclick = function () {
    Store.update('roundHistory', { entries: [] });
    Store.update('match', { scoreA: 0, scoreB: 0, round: 1, rounds: [] });
    UI.toast('Round history cleared · map score reset');
  };

  /* ========================= TOURNAMENT BRACKET ======================== *
   * A manual bracket: every slot is free text and nothing auto-advances.
   * Group stage = double elimination (top 2 advance); playoffs = single
   * elimination. Each match has two participants, two scores and a winner
   * side ('' | '1' | '2'). Editors follow the focus-preserving pattern used
   * by the veto / caster lists — never rebuild while a field is focused.
   * -------------------------------------------------------------------- */
  // The bracket's animated backdrop is shared with Starting Soon (state.startingSoon.bg),
  // set from the Settings page — no separate picker here.
  $('brVisible').onchange = function () { Store.update('bracket', { visible: this.checked }); };
  $('brTitle').oninput = function () { Store.update('bracket', { title: this.value }); };
  $('brClear').onclick = function () {
    if (!confirm('Clear every team, score and result from the whole bracket?')) return;
    const groups = {};
    BR_GROUPS.forEach(function (g) {
      groups[g] = {};
      BR_GROUP_MATCHES.forEach(function (m) { groups[g][m.key] = brBlankMatch(); });
    });
    const knockout = {};
    BR_KO_ROUNDS.forEach(function (r) {
      r.matches.forEach(function (m) { knockout[m.key] = brBlankMatch(); });
    });
    Store.update('bracket', { groups: groups, knockout: knockout });
    UI.toast('Bracket cleared');
  };

  // Pull a match object out of the live state by its store path.
  function brMatchAtPath(path) {
    const o = path.split('/').reduce(function (acc, k) {
      return (acc == null) ? undefined : acc[k];
    }, state);
    return Object.assign(brBlankMatch(), o);
  }
  // Mirror an edit into local state so a re-render (or skipped re-render
  // while typing) never drops what the operator just entered.
  function brSetLocal(path, m) {
    const parts = path.split('/');
    const last = parts.pop();
    const parent = parts.reduce(function (acc, k) {
      if (acc[k] == null || typeof acc[k] !== 'object') acc[k] = {};
      return acc[k];
    }, state);
    parent[last] = m;
  }
  function brEditField(path, field, val) {
    const m = brMatchAtPath(path);
    m[field] = val;
    brSetLocal(path, m);
    Store.set(path, m);
  }
  function brToggleWinner(path, side) {
    const m = brMatchAtPath(path);
    m.w = (m.w === side) ? '' : side;
    brSetLocal(path, m);
    Store.set(path, m);
    // The store update may skip the editor rebuild (the clicked button holds
    // focus inside the container), so reflect the new winner here directly.
    const el = document.querySelector('.br-match[data-path="' + path + '"]');
    if (!el) return;
    el.querySelectorAll('.br-mrow').forEach(function (row, i) {
      const s = String(i + 1);
      row.classList.toggle('win', m.w === s);
      const b = row.querySelector('.br-win');
      if (b) b.classList.toggle('on', m.w === s);
    });
  }

  function brMatchHtml(path, label, m) {
    function row(side, p, s) {
      const win = m.w === side;
      return '<div class="br-mrow' + (win ? ' win' : '') + '">' +
        '<button type="button" class="br-win' + (win ? ' on' : '') + '" data-win="' + side + '" title="Mark winner">✓</button>' +
        '<input class="br-p" data-f="p' + side + '" type="text" placeholder="Team ' + side + '" value="' + esc(p) + '">' +
        '<input class="br-s" data-f="s' + side + '" type="text" inputmode="numeric" placeholder="–" value="' + esc(s) + '">' +
        '</div>';
    }
    return '<div class="br-match" data-path="' + path + '">' +
      '<div class="br-mlabel">' + esc(label) + '</div>' +
      row('1', m.p1, m.s1) + row('2', m.p2, m.s2) +
      '</div>';
  }
  function brBindContainer(wrap) {
    wrap.querySelectorAll('.br-match').forEach(function (match) {
      const path = match.getAttribute('data-path');
      match.querySelectorAll('input').forEach(function (inp) {
        inp.oninput = function () { brEditField(path, inp.getAttribute('data-f'), inp.value); };
      });
      match.querySelectorAll('.br-win').forEach(function (btn) {
        btn.onclick = function () { brToggleWinner(path, btn.getAttribute('data-win')); };
      });
    });
  }

  function renderBracket() {
    const gw = $('brGroups');
    if (gw && !gw.contains(document.activeElement)) {
      gw.innerHTML = BR_GROUPS.map(function (g) {
        const grp = (state.bracket.groups && state.bracket.groups[g]) || {};
        const matches = BR_GROUP_MATCHES.map(function (mm) {
          const m = Object.assign(brBlankMatch(), grp[mm.key]);
          return brMatchHtml('bracket/groups/' + g + '/' + mm.key, mm.label, m);
        }).join('');
        return '<div class="br-group"><div class="br-ghead">Group ' + g + '</div>' + matches + '</div>';
      }).join('');
      brBindContainer(gw);
    }

    const kw = $('brKnockout');
    if (kw && !kw.contains(document.activeElement)) {
      const ko = state.bracket.knockout || {};
      kw.innerHTML = BR_KO_ROUNDS.map(function (r) {
        const matches = r.matches.map(function (mm) {
          const m = Object.assign(brBlankMatch(), ko[mm.key]);
          return brMatchHtml('bracket/knockout/' + mm.key, mm.label, m);
        }).join('');
        return '<div class="br-group"><div class="br-ghead">' + esc(r.label) + '</div>' + matches + '</div>';
      }).join('');
      brBindContainer(kw);
    }
  }

  /* ------------------------------ helpers ------------------------------- */
  // Store.update may throw synchronously (localStorage quota) or reject a
  // promise (Firebase) — surface a friendly note when a big upload won't fit.
  function safeUpdate(path, patch, big) {
    try {
      const r = Store.update(path, patch);
      if (r && r.catch) r.catch(function () { if (big) UI.toast('Upload too large for the database — use a hosted URL instead'); });
    } catch (err) {
      if (big) UI.toast('File too large to store — use a hosted URL instead');
    }
  }

  function resizeImage(src, max, cb) {
    const img = new Image();
    img.onload = function () {
      let w = img.width, h = img.height;
      if (w > max || h > max) { const s = max / Math.max(w, h); w = Math.round(w*s); h = Math.round(h*s); }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      try { cb(c.toDataURL('image/png')); }
      catch (e) { cb(src); }   // tainted (cross-origin URL) -> keep original
    };
    img.onerror = function () { cb(src); };
    img.crossOrigin = 'anonymous';
    img.src = src;
  }
  function transparentPx() {
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }

  function bindSeg(id, cb) {
    const seg = $(id); if (!seg) return;
    seg.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { cb(b.getAttribute('data-v')); };
    });
  }
  function objOf(k, v) { const o = {}; o[k] = v; return o; }
  function toArr(v) {
    if (Array.isArray(v)) return v.filter(function (x) { return x != null; });
    if (v && typeof v === 'object') return Object.keys(v).map(function (k) { return v[k]; }).filter(function (x) { return x != null; });
    return [];
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }
})();
