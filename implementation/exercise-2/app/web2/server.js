import express from "express";
import Database from "better-sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// ===== DATABASE SETUP =====
const db = new Database(join(__dirname, "tickets.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    is_admin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    venue TEXT NOT NULL,
    ticket_price REAL NOT NULL,
    total_tickets INTEGER NOT NULL,
    tickets_sold INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER REFERENCES events(id),
    owner_id INTEGER REFERENCES users(id),
    original_buyer_id INTEGER REFERENCES users(id),
    purchase_date TEXT DEFAULT (datetime('now')),
    resale_price REAL DEFAULT NULL,
    is_for_sale INTEGER DEFAULT 0
  );
`);

// Seed data if empty
const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
if (userCount === 0) {
  db.prepare("INSERT INTO users (username, is_admin) VALUES (?, ?)").run("admin", 1);
  db.prepare("INSERT INTO users (username, is_admin) VALUES (?, ?)").run("alice", 0);
  db.prepare("INSERT INTO users (username, is_admin) VALUES (?, ?)").run("bob", 0);

  db.prepare(
    "INSERT INTO events (name, date, venue, ticket_price, total_tickets, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("Blockchain Summit 2026", "2026-06-15", "Convention Center", 50.0, 100, 1);
  db.prepare(
    "INSERT INTO events (name, date, venue, ticket_price, total_tickets, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("Web3 Music Festival", "2026-08-20", "City Park Arena", 75.0, 200, 1);

  console.log("Database seeded with initial data.");
}

// ===== API ROUTES =====

// Get all users
app.get("/api/users", (req, res) => {
  const users = db.prepare("SELECT id, username, is_admin FROM users").all();
  res.json(users);
});

// Get all events with ticket availability
app.get("/api/events", (req, res) => {
  const events = db
    .prepare(
      "SELECT id, name, date, venue, ticket_price, total_tickets, tickets_sold, (total_tickets - tickets_sold) as available FROM events"
    )
    .all();
  res.json(events);
});

// Create event (admin only)
app.post("/api/events", (req, res) => {
  const { user_id, name, date, venue, ticket_price, total_tickets } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(user_id);
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: "Only admins can create events" });
  }
  const result = db
    .prepare(
      "INSERT INTO events (name, date, venue, ticket_price, total_tickets, created_by) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(name, date, venue, ticket_price, total_tickets, user_id);
  res.json({ id: result.lastInsertRowid, message: "Event created" });
});

// Buy ticket
app.post("/api/tickets/buy", (req, res) => {
  const { user_id, event_id } = req.body;
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(event_id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.tickets_sold >= event.total_tickets) {
    return res.status(400).json({ error: "Event is sold out" });
  }

  const buy = db.transaction(() => {
    db.prepare("UPDATE events SET tickets_sold = tickets_sold + 1 WHERE id = ?").run(event_id);
    const result = db
      .prepare("INSERT INTO tickets (event_id, owner_id, original_buyer_id) VALUES (?, ?, ?)")
      .run(event_id, user_id, user_id);
    return result.lastInsertRowid;
  });

  const ticketId = buy();
  res.json({
    ticket_id: ticketId,
    message: `Ticket purchased for $${event.ticket_price}`,
  });
});

// Get tickets owned by a user
app.get("/api/tickets/:userId", (req, res) => {
  const tickets = db
    .prepare(
      `SELECT t.id, t.event_id, t.purchase_date, t.is_for_sale, t.resale_price,
              e.name as event_name, e.date as event_date, e.venue
       FROM tickets t JOIN events e ON t.event_id = e.id
       WHERE t.owner_id = ?`
    )
    .all(req.params.userId);
  res.json(tickets);
});

// List ticket for resale
app.post("/api/tickets/list-for-sale", (req, res) => {
  const { user_id, ticket_id, resale_price } = req.body;
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticket_id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  if (ticket.owner_id !== user_id) {
    return res.status(403).json({ error: "You don't own this ticket" });
  }
  db.prepare("UPDATE tickets SET is_for_sale = 1, resale_price = ? WHERE id = ?").run(
    resale_price,
    ticket_id
  );
  res.json({ message: "Ticket listed for resale" });
});

// Get tickets available for resale
app.get("/api/marketplace", (req, res) => {
  const tickets = db
    .prepare(
      `SELECT t.id, t.event_id, t.resale_price, t.owner_id,
              e.name as event_name, e.date as event_date,
              u.username as seller
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       JOIN users u ON t.owner_id = u.id
       WHERE t.is_for_sale = 1`
    )
    .all();
  res.json(tickets);
});

// Buy resale ticket (transfer ownership)
app.post("/api/tickets/buy-resale", (req, res) => {
  const { buyer_id, ticket_id } = req.body;
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ? AND is_for_sale = 1").get(ticket_id);
  if (!ticket) return res.status(404).json({ error: "Ticket not available for resale" });
  if (ticket.owner_id === buyer_id) {
    return res.status(400).json({ error: "You already own this ticket" });
  }

  db.prepare("UPDATE tickets SET owner_id = ?, is_for_sale = 0, resale_price = NULL WHERE id = ?").run(
    buyer_id,
    ticket_id
  );
  res.json({
    message: `Ticket transferred for $${ticket.resale_price}`,
  });
});

// Transfer ticket directly
app.post("/api/tickets/transfer", (req, res) => {
  const { owner_id, ticket_id, recipient_id } = req.body;
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticket_id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  if (ticket.owner_id !== owner_id) {
    return res.status(403).json({ error: "You don't own this ticket" });
  }
  const recipient = db.prepare("SELECT * FROM users WHERE id = ?").get(recipient_id);
  if (!recipient) return res.status(404).json({ error: "Recipient not found" });

  db.prepare("UPDATE tickets SET owner_id = ?, is_for_sale = 0, resale_price = NULL WHERE id = ?").run(
    recipient_id,
    ticket_id
  );
  res.json({ message: `Ticket transferred to ${recipient.username}` });
});

app.listen(PORT, () => {
  console.log(`Web2 Ticket App running at http://localhost:${PORT}`);
});
