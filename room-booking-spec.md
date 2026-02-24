# Room Booking System - Specification

## Overview

A simple, no-login web application for booking a single room in 30-minute slots. Anyone can book by entering their name and selecting an available time slot. 
The slots should not be a max of 30 minutes!
Bookings are limited to one week ahead.

---

## Core Rules

- **One room** - no room selection needed
- **No authentication** - users just type their name
- **30-minute slots** from 07:00 to 23:00
- **Bookings open up to 7 days ahead** (today + 6 more days)
- **No past bookings** - slots in the past are greyed out / hidden
- **No double-booking** - a slot that's taken cannot be booked again

---

## User Flow

### 1. Landing Page

The user sees:

- A **day selector** showing the next 7 days (today highlighted by default)
- A **slot grid** for the selected day, showing all 30-min slots from 07:00 to 23:00
- Each slot shows one of three states:
  - **Available** - clickable, open for booking
  - **Booked** - shows the booker's name, not clickable
  - **Past** - greyed out, not clickable (only applies to today)

### 2. Booking a Slot

1. User clicks an available slot
2. A simple form appears (inline or modal) asking for **their name** and **how long**
3. User types their name and confirms
4. The slot immediately updates to show as booked with their name
5. A brief confirmation message appears

### 3. Cancelling a Booking

1. User clicks a booked slot
2. A prompt asks: "Cancel this booking by [Name]?"
3. User confirms, and the slot becomes available again

> Note: Since there are no logins, anyone can cancel anyone's booking. This is by design for simplicity and trust.

---

## Slot Display

Each day has 32 slots:

```
07:00 - 07:30
07:30 - 08:00
08:00 - 08:30
...
22:00 - 22:30
22:30 - 23:00
```

---

## Data Model

Each booking is a single record:

| Field      | Type     | Description                        |
|------------|----------|------------------------------------|
| id         | integer  | Auto-increment primary key         |
| date       | string   | Date of booking (YYYY-MM-DD)       |
| time_slot  | string   | Start time of slot (HH:MM)         |
| name       | string   | Name of the person who booked      |
| created_at | datetime | When the booking was made           |

**Unique constraint** on `(date, time_slot)` - prevents double bookings at the database level.

---

## API Endpoints

### GET /api/bookings?date=YYYY-MM-DD

Returns all bookings for a given date.

**Response:**
```json
[
  { "id": 1, "date": "2026-02-25", "time_slot": "09:00", "name": "Alice" },
  { "id": 2, "date": "2026-02-25", "time_slot": "10:30", "name": "Bob" }
]
```

### POST /api/bookings

Creates a new booking.

**Request body:**
```json
{
  "date": "2026-02-25",
  "time_slot": "09:00",
  "name": "Alice"
}
```

**Validation:**
- `date` must be today or within the next 7 days
- `time_slot` must be a valid 30-min slot (07:00 - 22:30)
- `time_slot` must not be in the past (if date is today)
- `name` must not be empty
- Slot must not already be booked

### DELETE /api/bookings/:id

Cancels (deletes) a booking by its ID.

---

## UI Layout

```
+--------------------------------------------------+
|              Room Booking                         |
+--------------------------------------------------+
|  [Mon 24] [Tue 25] [Wed 26] ... [Sun 1]          |
+--------------------------------------------------+
|  07:00  [ Available          ]                    |
|  07:30  [ Available          ]                    |
|  08:00  [ Alice              ]  (booked)          |
|  08:30  [ Alice              ]  (booked)          |
|  09:00  [ Available          ]                    |
|  ...                                              |
|  22:30  [ Available          ]                    |
+--------------------------------------------------+
```

- Clean, minimal design
- Mobile-friendly (single column works well)
- Color coding:
  - **Green/light** = available
  - **Blue/accent** = booked (shows name)
  - **Grey** = past / unavailable

---

## Tech Stack

| Layer    | Technology        |
|----------|-------------------|
| Frontend | HTML + CSS + vanilla JavaScript |
| Backend  | Node.js + Express |
| Database | SQLite (single file, zero config) |

---

## Out of Scope

- User accounts / login
- Recurring bookings
- Multiple rooms
- Email notifications
- Admin panel
