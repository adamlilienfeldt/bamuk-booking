(function () {
  const SLOTS = [];
  for (let h = 7; h <= 22; h++) {
    SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    SLOTS.push(`${String(h).padStart(2, '0')}:30`);
  }

  let selectedDate = todayStr();
  let bookings = [];

  // DOM refs
  const daySelector = document.getElementById('daySelector');
  const slotGrid = document.getElementById('slotGrid');
  const bookingModal = document.getElementById('bookingModal');
  const cancelModal = document.getElementById('cancelModal');
  const bookingForm = document.getElementById('bookingForm');
  const nameInput = document.getElementById('nameInput');
  const durationSelect = document.getElementById('durationSelect');
  const bookingSlotLabel = document.getElementById('bookingSlotLabel');
  const cancelLabel = document.getElementById('cancelLabel');
  const cancelBookingBtn = document.getElementById('cancelBookingBtn');
  const cancelNoBtn = document.getElementById('cancelNoBtn');
  const cancelYesBtn = document.getElementById('cancelYesBtn');
  const toast = document.getElementById('toast');

  let pendingSlot = null;
  let pendingCancelGroupId = null;
  let allowCancel = true;

  // --- Helpers ---

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function currentTimeStr() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  function endTimeForSlot(slot) {
    const idx = SLOTS.indexOf(slot);
    return idx < SLOTS.length - 1 ? SLOTS[idx + 1] : '23:00';
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // Group bookings by group_id for display
  function buildGroups(bookings) {
    const groups = {};
    for (const b of bookings) {
      if (!groups[b.group_id]) {
        groups[b.group_id] = { group_id: b.group_id, name: b.name, slots: [] };
      }
      groups[b.group_id].slots.push(b.time_slot);
    }
    // Sort slots within each group
    for (const g of Object.values(groups)) {
      g.slots.sort();
    }
    return groups;
  }

  // --- Day selector ---

  function renderDays() {
    daySelector.innerHTML = '';
    const today = new Date(todayStr());
    const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const btn = document.createElement('button');
      btn.className = 'day-btn' + (dateStr === selectedDate ? ' active' : '');
      btn.innerHTML = `<span class="day-name">${dayNames[d.getDay()]}</span><span class="day-date">${d.getDate()}/${d.getMonth() + 1}</span>`;
      btn.addEventListener('click', () => {
        selectedDate = dateStr;
        renderDays();
        loadBookings();
      });
      daySelector.appendChild(btn);
    }
  }

  // --- Slot grid ---

  function renderSlots() {
    slotGrid.innerHTML = '';
    const isToday = selectedDate === todayStr();
    const now = currentTimeStr();

    // Build lookup: slot -> booking info
    const bookingMap = {};
    bookings.forEach(b => { bookingMap[b.time_slot] = b; });

    // Build groups for display
    const groups = buildGroups(bookings);

    // Track which slots we've already rendered as part of a group
    const rendered = new Set();

    SLOTS.forEach(slot => {
      if (rendered.has(slot)) return;

      const booking = bookingMap[slot];

      if (isToday && slot <= now) {
        // Past slot — skip entirely
        return;
      }

      if (booking) {
        // Booked — render as a group block
        const group = groups[booking.group_id];
        const startSlot = group.slots[0];
        const lastSlot = group.slots[group.slots.length - 1];
        const endTime = endTimeForSlot(lastSlot);

        const div = document.createElement('div');
        div.className = 'slot booked';
        if (group.slots.length > 1) {
          div.style.minHeight = (group.slots.length * 44) + 'px';
        }

        const timeSpan = document.createElement('span');
        timeSpan.className = 'slot-time';
        timeSpan.textContent = `${startSlot} – ${endTime}`;

        const contentSpan = document.createElement('span');
        contentSpan.className = 'slot-content';
        contentSpan.textContent = group.name;

        div.appendChild(timeSpan);
        div.appendChild(contentSpan);
        if (allowCancel) {
          div.addEventListener('click', () => openCancelModal(group));
        }
        slotGrid.appendChild(div);

        // Mark all slots in this group as rendered
        group.slots.forEach(s => rendered.add(s));
        return;
      }

      // Available slot
      const div = createSlotDiv(slot, 'available', 'Ledig');
      div.addEventListener('click', () => openBookingModal(slot));
      slotGrid.appendChild(div);
    });
  }

  function createSlotDiv(slot, className, label) {
    const div = document.createElement('div');
    div.className = 'slot ' + className;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'slot-time';
    timeSpan.textContent = slot;

    const contentSpan = document.createElement('span');
    contentSpan.className = 'slot-content';
    contentSpan.textContent = label;

    div.appendChild(timeSpan);
    div.appendChild(contentSpan);
    return div;
  }

  // --- API ---

  async function loadBookings() {
    try {
      const res = await fetch(`/api/bookings?date=${selectedDate}`);
      bookings = await res.json();
      renderSlots();
    } catch (err) {
      showToast('Kunne ikke hente bookinger');
    }
  }

  async function createBooking(date, slots, name) {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, slots, name })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Booking mislykkedes');
    }
    return res.json();
  }

  async function deleteBookingGroup(groupId) {
    const res = await fetch(`/api/bookings/group/${groupId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Annullering mislykkedes');
    }
  }

  // --- Booking modal ---

  function openBookingModal(slot) {
    pendingSlot = slot;
    bookingSlotLabel.textContent = `${selectedDate} — ${slot}`;

    // Filter duration options based on available consecutive slots
    const slotIdx = SLOTS.indexOf(slot);
    let maxConsecutive = 0;
    const bookingMap = {};
    const isToday = selectedDate === todayStr();
    const now = currentTimeStr();
    bookings.forEach(b => { bookingMap[b.time_slot] = b; });

    for (let i = slotIdx; i < SLOTS.length; i++) {
      if (bookingMap[SLOTS[i]] || (isToday && SLOTS[i] <= now)) break;
      maxConsecutive++;
    }

    const options = durationSelect.options;
    for (let i = 0; i < options.length; i++) {
      options[i].disabled = parseInt(options[i].value) > maxConsecutive;
    }
    durationSelect.value = '1';

    nameInput.value = localStorage.getItem('bookingName') || '';
    bookingModal.classList.add('show');
    nameInput.focus();
  }

  function closeBookingModal() {
    bookingModal.classList.remove('show');
    pendingSlot = null;
  }

  // --- Cancel modal ---

  function openCancelModal(group) {
    pendingCancelGroupId = group.group_id;
    const startSlot = group.slots[0];
    const lastSlot = group.slots[group.slots.length - 1];
    const endTime = endTimeForSlot(lastSlot);
    cancelLabel.textContent = `Annuller booking af "${group.name}" kl. ${startSlot} – ${endTime}?`;
    cancelModal.classList.add('show');
  }

  function closeCancelModal() {
    cancelModal.classList.remove('show');
    pendingCancelGroupId = null;
  }

  // --- Events ---

  cancelBookingBtn.addEventListener('click', closeBookingModal);

  bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) closeBookingModal();
  });

  cancelNoBtn.addEventListener('click', closeCancelModal);

  cancelModal.addEventListener('click', (e) => {
    if (e.target === cancelModal) closeCancelModal();
  });

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;

    localStorage.setItem('bookingName', name);

    const slotIdx = SLOTS.indexOf(pendingSlot);
    const count = parseInt(durationSelect.value);
    const slotsToBook = SLOTS.slice(slotIdx, slotIdx + count);

    try {
      await createBooking(selectedDate, slotsToBook, name);
      closeBookingModal();
      await loadBookings();
      showToast(`Booket ${count > 1 ? count + ' tider' : '1 tid'} for ${name}`);
    } catch (err) {
      showToast(err.message);
    }
  });

  cancelYesBtn.addEventListener('click', async () => {
    try {
      await deleteBookingGroup(pendingCancelGroupId);
      closeCancelModal();
      await loadBookings();
      showToast('Booking annulleret');
    } catch (err) {
      showToast(err.message);
    }
  });

  // --- Init ---

  async function init() {
    try {
      const res = await fetch('/api/settings');
      const settings = await res.json();
      allowCancel = settings.allowCancel;
    } catch (err) { /* default to true */ }
    renderDays();
    loadBookings();
  }

  init();
})();
