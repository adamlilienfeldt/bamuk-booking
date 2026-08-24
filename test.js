// Run: node test.js   (uses a throwaway DB, never touches bookings.db)
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DB_PATH = path.join(os.tmpdir(), `booking-test-${Date.now()}.db`);
process.env.PORT = '3999';
process.env.RETENTION_DAYS = '30';
delete process.env.RESEND_API_KEY;

const db = require('./database');
require('./server');

const BASE = 'http://localhost:3999';

function nextWeekday(target) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  do { d.setDate(d.getDate() + 1); } while (d.getDay() !== target);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const thursday = nextWeekday(4);
  const friday = nextWeekday(5);

  // --- Thursday 15:00-20:00 is blocked ---
  const thu = await (await fetch(`${BASE}/api/bookings?date=${thursday}`)).json();
  const blocked = thu.filter(b => b.group_id === 'blocked').map(b => b.time_slot).sort();
  assert.deepStrictEqual(blocked, [
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30'
  ], 'Thursday must block 15:00-20:00 and nothing else');

  // Booking inside the block is rejected
  const rej = await fetch(`${BASE}/api/bookings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: thursday, slots: ['16:00'], name: 'Test', email: 't@e.dk' })
  });
  assert.strictEqual(rej.status, 409, 'blocked slot must be rejected');

  // Booking that straddles the edge is rejected too
  const straddle = await fetch(`${BASE}/api/bookings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: thursday, slots: ['14:30', '15:00'], name: 'Test', email: 't@e.dk' })
  });
  assert.strictEqual(straddle.status, 409, 'booking overlapping the block must be rejected');

  // 20:00 on Thursday is free again
  const ok = await fetch(`${BASE}/api/bookings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: thursday, slots: ['20:00'], name: 'Test', email: 't@e.dk' })
  });
  assert.strictEqual(ok.status, 201, '20:00 Thursday must be bookable');

  // Other weekdays are untouched
  const fri = await (await fetch(`${BASE}/api/bookings?date=${friday}`)).json();
  assert.strictEqual(fri.filter(b => b.group_id === 'blocked').length, 0, 'only Thursday is blocked');

  // --- Retention: old bookings lose personal data but stay countable ---
  const old = new Date();
  old.setDate(old.getDate() - 60);
  const oldDate = old.toISOString().slice(0, 10);
  db.createBooking(oldDate, ['09:00', '09:30'], 'Gammel Bruger', 'gammel@e.dk');

  const before = db.getStats();
  assert.ok(before.topBookers.some(b => b.name === 'Gammel Bruger'), 'name present before retention');

  const changed = db.anonymizeOldBookings();
  assert.strictEqual(changed, 2, 'both rows of the old booking are anonymised');

  const after = db.getStats();
  assert.strictEqual(after.total, before.total, 'anonymising must not lose bookings');
  assert.ok(!after.topBookers.some(b => b.name === 'Gammel Bruger'), 'name gone after retention');
  assert.ok(!after.topBookers.some(b => b.name === ''), 'anonymised rows excluded from top bookers');

  const month = after.byMonth.find(m => m.month === oldDate.slice(0, 7));
  assert.ok(month && month.booking_count >= 1, 'old usage still counted per month');
  assert.strictEqual(db.anonymizeOldBookings(), 0, 'retention is idempotent');

  // Recent bookings keep their name
  assert.ok(after.topBookers.some(b => b.name === 'Test'), 'recent booking keeps its name');

  console.log('All checks passed.');
  fs.rmSync(process.env.DB_PATH, { force: true });
  ['-wal', '-shm'].forEach(x => fs.rmSync(process.env.DB_PATH + x, { force: true }));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
