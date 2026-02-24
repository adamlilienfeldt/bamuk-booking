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
  }
};
