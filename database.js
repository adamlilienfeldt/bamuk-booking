const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const db = new Database(path.join(__dirname, 'bookings.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(date, time_slot)
  )
`);

const getBookingsByDate = db.prepare(
  'SELECT id, group_id, date, time_slot, name FROM bookings WHERE date = ?'
);

const insertBooking = db.prepare(
  'INSERT INTO bookings (group_id, date, time_slot, name) VALUES (?, ?, ?, ?)'
);

const deleteByGroupId = db.prepare(
  'DELETE FROM bookings WHERE group_id = ?'
);

const createBookingGroup = db.transaction((groupId, date, slots, name) => {
  for (const slot of slots) {
    insertBooking.run(groupId, date, slot, name);
  }
});

// Admin queries
const getAllBookingsStmt = db.prepare(
  'SELECT id, group_id, date, time_slot, name, created_at FROM bookings ORDER BY date DESC, time_slot ASC'
);

const getBookingsByDateRange = db.prepare(
  'SELECT id, group_id, date, time_slot, name, created_at FROM bookings WHERE date >= ? AND date <= ? ORDER BY date DESC, time_slot ASC'
);

const totalBookingGroups = db.prepare(
  'SELECT COUNT(DISTINCT group_id) as count FROM bookings'
);

const bookingGroupsInRange = db.prepare(
  'SELECT COUNT(DISTINCT group_id) as count FROM bookings WHERE date >= ? AND date <= ?'
);

const topBookers = db.prepare(
  'SELECT name, COUNT(DISTINCT group_id) as booking_count FROM bookings GROUP BY name ORDER BY booking_count DESC LIMIT 10'
);

const busiestDays = db.prepare(`
  SELECT
    CASE CAST(strftime('%w', date) AS INTEGER)
      WHEN 0 THEN 'Søn'
      WHEN 1 THEN 'Man'
      WHEN 2 THEN 'Tir'
      WHEN 3 THEN 'Ons'
      WHEN 4 THEN 'Tor'
      WHEN 5 THEN 'Fre'
      WHEN 6 THEN 'Lør'
    END as day_name,
    CAST(strftime('%w', date) AS INTEGER) as day_num,
    COUNT(DISTINCT group_id) as booking_count
  FROM bookings
  GROUP BY day_num
  ORDER BY booking_count DESC
`);

const busiestSlots = db.prepare(
  'SELECT time_slot, COUNT(DISTINCT group_id) as booking_count FROM bookings GROUP BY time_slot ORDER BY booking_count DESC LIMIT 10'
);

module.exports = {
  getBookingsByDate(date) {
    return getBookingsByDate.all(date);
  },
  createBooking(date, slots, name) {
    const groupId = crypto.randomUUID();
    createBookingGroup(groupId, date, slots, name);
    return { group_id: groupId, date, slots, name };
  },
  deleteBookingGroup(groupId) {
    const result = deleteByGroupId.run(groupId);
    return result.changes > 0;
  },

  // Admin methods
  getAllBookings() {
    return getAllBookingsStmt.all();
  },
  getBookingsByDateRange(from, to) {
    return getBookingsByDateRange.all(from, to);
  },
  getStats() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Start of current week (Monday)
    const dayOfWeek = now.getDay() || 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek + 1);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // Start of current month
    const monthStartStr = today.slice(0, 7) + '-01';

    return {
      total: totalBookingGroups.get().count,
      thisWeek: bookingGroupsInRange.get(weekStartStr, today).count,
      thisMonth: bookingGroupsInRange.get(monthStartStr, today).count,
      topBookers: topBookers.all(),
      busiestDays: busiestDays.all(),
      busiestSlots: busiestSlots.all()
    };
  }
};
