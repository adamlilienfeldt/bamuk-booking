(function () {
  let password = sessionStorage.getItem('adminPassword') || '';

  const loginScreen = document.getElementById('loginScreen');
  const adminPanel = document.getElementById('adminPanel');
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('passwordInput');
  const toast = document.getElementById('toast');

  // Delete modal
  const deleteModal = document.getElementById('deleteModal');
  const deleteLabel = document.getElementById('deleteLabel');
  const deleteNoBtn = document.getElementById('deleteNoBtn');
  const deleteYesBtn = document.getElementById('deleteYesBtn');
  let pendingDeleteGroupId = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function authHeaders() {
    return { 'Authorization': 'Bearer ' + password, 'Content-Type': 'application/json' };
  }

  async function apiGet(url) {
    const res = await fetch(url, { headers: authHeaders() });
    if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
    return res.json();
  }

  async function apiDelete(url) {
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
  }

  // --- Auth ---

  function logout() {
    password = '';
    sessionStorage.removeItem('adminPassword');
    loginScreen.style.display = '';
    adminPanel.style.display = 'none';
  }

  async function login(pw) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    if (!res.ok) throw new Error('Forkert adgangskode');
    password = pw;
    sessionStorage.setItem('adminPassword', pw);
    loginScreen.style.display = 'none';
    adminPanel.style.display = '';
    loadAll();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await login(passwordInput.value);
    } catch (err) {
      showToast(err.message);
    }
  });

  // --- Tabs ---

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // --- Stats ---

  async function loadStats() {
    const stats = await apiGet('/api/admin/stats');

    document.getElementById('statCards').innerHTML = `
      <div class="stat-card"><div class="stat-value">${stats.total}</div><div class="stat-label">Bookinger i alt</div></div>
      <div class="stat-card"><div class="stat-value">${stats.thisWeek}</div><div class="stat-label">Denne uge</div></div>
      <div class="stat-card"><div class="stat-value">${stats.thisMonth}</div><div class="stat-label">Denne måned</div></div>
    `;

    // Top bookers
    const tbody = document.querySelector('#topBookersTable tbody');
    tbody.innerHTML = stats.topBookers.map(b =>
      `<tr><td>${esc(b.name)}</td><td>${b.booking_count}</td></tr>`
    ).join('');

    // Usage per month (perpetual, survives anonymisation)
    renderBarChart('byMonth', stats.byMonth.map(m => ({
      label: m.month, count: m.booking_count, suffix: `${m.hours} t`
    })));
    document.getElementById('retentionNote').textContent =
      `Navne og e-mails slettes automatisk efter ${stats.retentionDays} dage. Brugstal bevares.`;

    // Busiest days
    renderBarChart('busiestDays', stats.busiestDays.map(d => ({ label: d.day_name, count: d.booking_count })));

    // Busiest slots
    renderBarChart('busiestSlots', stats.busiestSlots.map(s => ({ label: s.time_slot, count: s.booking_count })));
  }

  function renderBarChart(containerId, items) {
    const container = document.getElementById(containerId);
    if (!items.length) { container.innerHTML = '<p class="empty-msg">Ingen data endnu.</p>'; return; }
    const max = Math.max(...items.map(i => i.count));
    container.innerHTML = items.map(i => `
      <div class="bar-row">
        <span class="bar-label">${esc(i.label)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(i.count / max * 100).toFixed(1)}%"></div></div>
        <span class="bar-count">${i.count}${i.suffix ? ' / ' + esc(i.suffix) : ''}</span>
      </div>
    `).join('');
  }

  // --- Bookings ---

  async function loadBookings(from, to) {
    let url = '/api/admin/bookings';
    if (from && to) url += `?from=${from}&to=${to}`;
    const bookings = await apiGet(url);
    const today = new Date().toISOString().slice(0, 10);

    // Group by group_id
    const groups = groupBookings(bookings);

    // Split into current/future and past
    const upcoming = groups.filter(g => g.date >= today);
    const past = groups.filter(g => g.date < today);

    renderBookingsTable('bookingsTable', upcoming, true);
    document.getElementById('noBookings').style.display = upcoming.length ? 'none' : '';

    renderBookingsTable('historyTable', past, false);
    document.getElementById('noHistory').style.display = past.length ? 'none' : '';
  }

  function groupBookings(bookings) {
    const map = {};
    for (const b of bookings) {
      if (!map[b.group_id]) {
        map[b.group_id] = { group_id: b.group_id, name: b.name, date: b.date, slots: [], created_at: b.created_at };
      }
      map[b.group_id].slots.push(b.time_slot);
    }
    const groups = Object.values(map);
    groups.forEach(g => g.slots.sort());
    groups.sort((a, b) => b.date.localeCompare(a.date) || a.slots[0].localeCompare(b.slots[0]));
    return groups;
  }

  function slotRangeStr(slots) {
    const ALLSLOTS = [];
    for (let h = 7; h <= 22; h++) {
      ALLSLOTS.push(`${String(h).padStart(2, '0')}:00`);
      ALLSLOTS.push(`${String(h).padStart(2, '0')}:30`);
    }
    const last = slots[slots.length - 1];
    const idx = ALLSLOTS.indexOf(last);
    const end = idx < ALLSLOTS.length - 1 ? ALLSLOTS[idx + 1] : '23:00';
    return `${slots[0]} – ${end}`;
  }

  function renderBookingsTable(tableId, groups, showDelete) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = groups.map(g => `
      <tr>
        <td>${g.date}</td>
        <td>${slotRangeStr(g.slots)}</td>
        <td>${g.name ? esc(g.name) : '<em>anonymiseret</em>'}</td>
        <td>${g.created_at ? g.created_at.slice(0, 16).replace('T', ' ') : ''}</td>
        ${showDelete ? `<td><button class="btn-delete" data-group="${g.group_id}" data-name="${esc(g.name)}" data-time="${slotRangeStr(g.slots)}" data-date="${g.date}">Slet</button></td>` : ''}
      </tr>
    `).join('');

    if (showDelete) {
      tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          pendingDeleteGroupId = btn.dataset.group;
          deleteLabel.textContent = `Slet booking af "${btn.dataset.name}" d. ${btn.dataset.date} kl. ${btn.dataset.time}?`;
          deleteModal.classList.add('show');
        });
      });
    }
  }

  // Filter
  document.getElementById('filterBtn').addEventListener('click', () => {
    const from = document.getElementById('filterFrom').value;
    const to = document.getElementById('filterTo').value;
    if (from && to) loadBookings(from, to);
  });

  document.getElementById('clearFilterBtn').addEventListener('click', () => {
    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value = '';
    loadBookings();
  });

  // Delete modal
  deleteNoBtn.addEventListener('click', () => deleteModal.classList.remove('show'));
  deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) deleteModal.classList.remove('show'); });

  deleteYesBtn.addEventListener('click', async () => {
    try {
      await apiDelete(`/api/admin/bookings/group/${pendingDeleteGroupId}`);
      deleteModal.classList.remove('show');
      showToast('Booking slettet');
      loadAll();
    } catch (err) {
      showToast(err.message);
    }
  });

  // --- Helpers ---

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Init ---

  function loadAll() {
    loadStats();
    loadBookings();
  }

  // Auto-login if password saved in session
  if (password) {
    login(password).catch(() => logout());
  }
})();
