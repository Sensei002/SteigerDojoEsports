/* =========================================================================
 * STGRMatchControl — Teams manager
 * ========================================================================= */
(function () {
  'use strict';
  UI.mount('teams');

  const $ = function (id) { return document.getElementById(id); };
  let teams = {};       // id -> team
  let logoData = '';    // current logo (data URL or external URL)

  /* --------------------------- live team list --------------------------- */
  Store.subscribe('teams', function (val) {
    teams = val || {};
    renderList();
  });

  function renderList() {
    const list = $('teamList');
    const ids = Object.keys(teams);
    if (!ids.length) {
      list.innerHTML = '<div class="empty">No teams yet. Create your first team →</div>';
      return;
    }
    list.innerHTML = ids.map(function (id) {
      const t = teams[id];
      const players = (t.players || []).filter(function (p) { return p && p.name; });
      const chips = players.length
        ? players.slice(0, 5).map(function (p) {
            return '<span class="tc-chip">' + esc(p.name) + '</span>';
          }).join('') +
          (players.length > 5 ? '<span class="tc-chip more">+' + (players.length - 5) + '</span>' : '')
        : '<span class="tc-empty">No players yet</span>';
      return '<div class="team-card" data-edit="' + id + '" title="Edit ' + esc(t.name || 'team') + '">' +
        '<span class="tc-stripe" style="background:' + (t.color || '#888') + '"></span>' +
        '<div class="tc-head">' +
          '<img class="tc-logo" src="' + (t.logo || transparentPx()) + '" alt="">' +
          '<div class="tc-id"><div class="tc-name">' + esc(t.name || 'Unnamed') + '</div>' +
            '<span class="tag">' + esc(t.short || '—') + '</span></div>' +
        '</div>' +
        '<div class="tc-players">' + chips + '</div>' +
        '<div class="tc-foot"><span>' + players.length + ' player' + (players.length === 1 ? '' : 's') +
          '</span><span class="tc-edit">Edit ✎</span></div>' +
        '</div>';
    }).join('');
    list.querySelectorAll('[data-edit]').forEach(function (b) {
      b.onclick = function () { loadTeam(b.getAttribute('data-edit')); };
    });
  }

  /* ----------------------------- editor --------------------------------- */
  function clearForm() {
    $('teamId').value = '';
    $('tName').value = ''; $('tShort').value = ''; $('tColor').value = '#1e90ff';
    $('logoUrl').value = ''; $('logoFile').value = '';
    logoData = ''; updateLogoPreview();
    $('players').innerHTML = '';
    addPlayerRow(); addPlayerRow(); addPlayerRow(); addPlayerRow(); addPlayerRow();
    $('editorTitle').textContent = 'New team';
    $('deleteBtn').style.display = 'none';
  }

  function loadTeam(id) {
    const t = teams[id]; if (!t) return;
    $('teamId').value = id;
    $('tName').value = t.name || '';
    $('tShort').value = t.short || '';
    $('tColor').value = t.color || '#1e90ff';
    logoData = t.logo || '';
    // external URL goes in the url box; data URLs stay internal
    $('logoUrl').value = /^https?:/i.test(logoData) ? logoData : '';
    $('logoFile').value = '';
    updateLogoPreview();
    $('players').innerHTML = '';
    const ps = (t.players && t.players.length) ? t.players : [{}];
    ps.forEach(function (p) { addPlayerRow(p.name, p.role, p.platform); });
    while ($('players').children.length < 5) addPlayerRow();
    $('editorTitle').textContent = 'Edit: ' + (t.name || 'team');
    $('deleteBtn').style.display = '';
    $('editorCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // tracker.network lookup platforms — must match the worker's PLATFORMS map.
  const PLATFORMS = [
    { key: 'ubi', label: 'PC' },
    { key: 'psn', label: 'PSN' },
    { key: 'xbl', label: 'Xbox' }
  ];

  function addPlayerRow(name, role, platform) {
    const row = document.createElement('div');
    row.className = 'player-row';
    const plat = platform || 'ubi';
    const opts = PLATFORMS.map(function (p) {
      return '<option value="' + p.key + '"' + (p.key === plat ? ' selected' : '') + '>' + p.label + '</option>';
    }).join('');
    row.innerHTML =
      '<input class="pname" type="text" placeholder="Player IGN" maxlength="24" value="' + esc(name || '') + '">' +
      '<input class="prole" type="text" placeholder="Role (Entry / IGL…)" maxlength="18" value="' + esc(role || '') + '">' +
      '<select class="pplat" title="tracker.network platform for live stats">' + opts + '</select>' +
      '<button class="btn ghost sm" type="button" title="Remove">✕</button>';
    row.querySelector('button').onclick = function () { row.remove(); };
    $('players').appendChild(row);
  }

  function collectPlayers() {
    return Array.prototype.map.call($('players').querySelectorAll('.player-row'), function (r) {
      return {
        name: r.querySelector('.pname').value.trim(),
        role: r.querySelector('.prole').value.trim(),
        platform: r.querySelector('.pplat').value || 'ubi'
      };
    }).filter(function (p) { return p.name; });
  }

  /* ------------------------------ logos --------------------------------- */
  function updateLogoPreview() { $('logoPreview').src = logoData || transparentPx(); }

  $('logoFile').addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      resizeImage(reader.result, 256, function (dataUrl) {
        logoData = dataUrl; $('logoUrl').value = ''; updateLogoPreview();
      });
    };
    reader.readAsDataURL(file);
  });
  $('logoUrl').addEventListener('input', function () {
    const v = $('logoUrl').value.trim();
    if (v) { logoData = v; updateLogoPreview(); }
  });
  $('logoClear').onclick = function () {
    logoData = ''; $('logoUrl').value = ''; $('logoFile').value = ''; updateLogoPreview();
  };

  function resizeImage(src, max, cb) {
    const img = new Image();
    img.onload = function () {
      let w = img.width, h = img.height;
      if (w > max || h > max) { const s = max / Math.max(w, h); w = Math.round(w*s); h = Math.round(h*s); }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      try { cb(c.toDataURL('image/png')); }
      catch (e) { cb(src); } // tainted (cross-origin URL) -> keep original
    };
    img.onerror = function () { cb(src); };
    img.crossOrigin = 'anonymous';
    img.src = src;
  }

  function transparentPx() {
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }

  /* ------------------------------ actions ------------------------------- */
  $('saveBtn').onclick = function () {
    const name = $('tName').value.trim();
    if (!name) { UI.toast('Team needs a name'); $('tName').focus(); return; }
    const team = {
      name: name,
      short: ($('tShort').value.trim() || name.slice(0, 3)).toUpperCase(),
      color: $('tColor').value,
      logo: logoData || '',
      players: collectPlayers()
    };
    const id = $('teamId').value;
    if (id) { Store.set('teams/' + id, team); UI.toast('Team updated'); }
    else { const newId = Store.push('teams', team); $('teamId').value = newId || ''; UI.toast('Team created'); }
    if (!id) clearForm();
  };

  $('deleteBtn').onclick = function () {
    const id = $('teamId').value; if (!id) return;
    if (!confirm('Delete this team? This cannot be undone.')) return;
    Store.remove('teams/' + id);
    clearForm(); UI.toast('Team deleted');
  };

  $('newBtn').onclick = function () {
    clearForm();
    $('editorCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $('cancelBtn').onclick = clearForm;
  $('addPlayer').onclick = function () { addPlayerRow(); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  clearForm();
})();
