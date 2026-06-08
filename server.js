const express = require('express');
const path = require('path');
const db = require('./database');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin password — change this to your own password
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bamuk2026';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'booking@bamuk.dk';
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Valid time slots (07:00 to 22:30 in 30-min increments)
const VALID_SLOTS = [];
for (let h = 7; h <= 22; h++) {
  VALID_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 23) VALID_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

function todayStr() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function currentTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function endTimeForSlot(slot) {
  const idx = VALID_SLOTS.indexOf(slot);
  return idx < VALID_SLOTS.length - 1 ? VALID_SLOTS[idx + 1] : '23:00';
}

function isDateInRange(dateStr) {
  const today = new Date(todayStr());
  const target = new Date(dateStr);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 6);
  return target >= today && target <= maxDate;
}

// Admin auth middleware
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Forkert adgangskode.' });
  }
  next();
}

// --- Public API ---


// GET /api/bookings?date=YYYY-MM-DD
app.get('/api/bookings', (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  const bookings = db.getBookingsByDate(date);
  res.json(bookings);
});

// POST /api/bookings
app.post('/api/bookings', (req, res) => {
  const { date, slots, name, email } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format.' });
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ error: 'At least one slot is required.' });
  }
  for (const slot of slots) {
    if (!VALID_SLOTS.includes(slot)) {
      return res.status(400).json({ error: `Invalid time slot: ${slot}` });
    }
  }
  if (!isDateInRange(date)) {
    return res.status(400).json({ error: 'Date must be within the next 7 days.' });
  }
  if (date === todayStr() && slots[0] <= currentTimeStr()) {
    return res.status(400).json({ error: 'Cannot book a slot in the past.' });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'En gyldig e-mailadresse er påkrævet.' });
  }
  const cleanEmail = email.trim();

  let booking;
  try {
    booking = db.createBooking(date, slots, name.trim(), cleanEmail);
    res.status(201).json(booking);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'One or more slots are already booked.' });
    }
    return res.status(500).json({ error: 'Server error.' });
  }

  if (resend) {
    const startSlot = slots[0];
    const endTime = endTimeForSlot(slots[slots.length - 1]);
    const [year, month, day] = date.split('-');
    const dateFormatted = `${day}/${month}/${year}`;
    const cancelUrl = `${BASE_URL}/?cancel=${booking.cancel_token}`;
    resend.emails.send({
      from: FROM_EMAIL,
      to: cleanEmail,
      subject: 'Booking bekræftet – BAMUK',
      html: `<p>Hej ${name.trim()},</p>
<p>Din booking er bekræftet:</p>
<p><strong>${dateFormatted} kl. ${startSlot} – ${endTime}</strong></p>
<p>Hvis du vil annullere din booking, klik her:<br>
<a href="${cancelUrl}">${cancelUrl}</a></p>
<p>Mvh<br>BAMUK</p>`
    }).catch(err => console.error('Email fejl:', err));
  }
});

// DELETE /api/bookings/group/:groupId
app.delete('/api/bookings/group/:groupId', (req, res) => {
  const { groupId } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Navn er påkrævet.' });
  }
  const result = db.deleteBookingGroupByName(groupId, name.trim());
  if (result === 'not_found') return res.status(404).json({ error: 'Booking ikke fundet.' });
  if (result === 'wrong_name') return res.status(403).json({ error: 'Forkert navn.' });
  res.json({ success: true });
});

// GET /api/cancel/:token — look up booking by cancel token
app.get('/api/cancel/:token', (req, res) => {
  const group = db.getGroupByCancelToken(req.params.token);
  if (!group) return res.status(404).json({ error: 'Booking ikke fundet.' });
  res.json(group);
});

// DELETE /api/cancel/:token — cancel booking by token
app.delete('/api/cancel/:token', (req, res) => {
  const deleted = db.deleteBookingGroupByToken(req.params.token);
  if (!deleted) return res.status(404).json({ error: 'Booking ikke fundet.' });
  res.json({ success: true });
});

// --- Admin API ---

// POST /api/admin/login — validate password
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Forkert adgangskode.' });
  }
  res.json({ success: true });
});

// GET /api/admin/bookings — all bookings, optional date range
app.get('/api/admin/bookings', requireAdmin, (req, res) => {
  const { from, to } = req.query;
  let bookings;
  if (from && to) {
    bookings = db.getBookingsByDateRange(from, to);
  } else {
    bookings = db.getAllBookings();
  }
  res.json(bookings);
});

// GET /api/admin/stats — aggregated statistics
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const stats = db.getStats();
  res.json(stats);
});

// DELETE /api/admin/bookings/group/:groupId — admin delete (bypasses ALLOW_CANCEL)
app.delete('/api/admin/bookings/group/:groupId', requireAdmin, (req, res) => {
  const { groupId } = req.params;
  const deleted = db.deleteBookingGroup(groupId);
  if (!deleted) {
    return res.status(404).json({ error: 'Booking not found.' });
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Room booking server running at http://localhost:${PORT}`);
});
