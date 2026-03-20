const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../data.db');
const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function init() {
  await run(`PRAGMA journal_mode=WAL`);

  // Users
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      level       INTEGER NOT NULL DEFAULT 2,
      area        TEXT    NOT NULL DEFAULT '未設定',
      bio         TEXT    NOT NULL DEFAULT '',
      avatar      TEXT    NOT NULL DEFAULT '🎾',
      premium     INTEGER NOT NULL DEFAULT 0,
      stripe_customer_id TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `);

  // Match posts
  await run(`
    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      title       TEXT    NOT NULL,
      body        TEXT    NOT NULL DEFAULT '',
      date_str    TEXT    NOT NULL,
      time_slot   TEXT    NOT NULL,
      location    TEXT    NOT NULL,
      level_min   INTEGER NOT NULL DEFAULT 1,
      level_max   INTEGER NOT NULL DEFAULT 5,
      tags        TEXT    NOT NULL DEFAULT '[]',
      status      TEXT    NOT NULL DEFAULT 'open',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `);

  // Applications (post の参加申込み)
  await run(`
    CREATE TABLE IF NOT EXISTS applications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id     INTEGER NOT NULL REFERENCES posts(id),
      user_id     INTEGER NOT NULL REFERENCES users(id),
      message     TEXT    NOT NULL DEFAULT '',
      status      TEXT    NOT NULL DEFAULT 'pending',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(post_id, user_id)
    )
  `);

  // Messages
  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id   INTEGER NOT NULL REFERENCES users(id),
      receiver_id INTEGER NOT NULL REFERENCES users(id),
      body        TEXT    NOT NULL,
      read        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `);

  // Match records (戦績)
  await run(`
    CREATE TABLE IF NOT EXISTS records (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      opponent    TEXT    NOT NULL,
      location    TEXT    NOT NULL DEFAULT '',
      win         INTEGER NOT NULL,
      sets_me     INTEGER NOT NULL DEFAULT 0,
      sets_opp    INTEGER NOT NULL DEFAULT 0,
      score       TEXT    NOT NULL DEFAULT '',
      played_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `);

  console.log('DB initialized');
}

module.exports = { db, run, get, all, init };
