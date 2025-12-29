import sqlite3 from 'sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || resolve(__dirname, '../../data/stats.db');

// Ensure directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log(`Connected to SQLite database at ${DB_PATH}`);
  }
});

// Promisify database methods
const dbRun = (sql, ...params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, ...params, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
};

const dbGet = (sql, ...params) => {
  return new Promise((resolve, reject) => {
    db.get(sql, ...params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, ...params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, ...params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS DeathByAI (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_number INTEGER UNIQUE NOT NULL,
      ts TEXT NOT NULL,
      channel TEXT,
      player1 TEXT NOT NULL,
      player2 TEXT,
      player3 TEXT,
      player4 TEXT,
      player5 TEXT,
      player6 TEXT,
      player7 TEXT,
      player8 TEXT,
      player9 TEXT,
      player10 TEXT,
      p1score INTEGER DEFAULT 0,
      p2score INTEGER DEFAULT 0,
      p3score INTEGER DEFAULT 0,
      p4score INTEGER DEFAULT 0,
      p5score INTEGER DEFAULT 0,
      p6score INTEGER DEFAULT 0,
      p7score INTEGER DEFAULT 0,
      p8score INTEGER DEFAULT 0,
      p9score INTEGER DEFAULT 0,
      p10score INTEGER DEFAULT 0,
      playersEntered INTEGER DEFAULT 1,
      numofinputs INTEGER DEFAULT 0,
      round INTEGER DEFAULT 0,
      finished INTEGER DEFAULT 0,
      type TEXT DEFAULT general,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating DeathByAI table:', err);
    } else {
      console.log('Database table "DeathByAI" ready');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS DeathResponses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_number INTEGER UNIQUE NOT NULL,
      player1rep TEXT,
      player1ans TEXT,
      player2rep TEXT,
      player2ans TEXT,
      player3rep TEXT,
      player3ans TEXT,
      player4rep TEXT,
      player4ans TEXT,
      player5rep TEXT,
      player5ans TEXT,
      player6rep TEXT,
      player6ans TEXT,
      player7rep TEXT,
      player7ans TEXT,
      player8rep TEXT,
      player8ans TEXT,
      player9rep TEXT,
      player9ans TEXT,
      player10rep TEXT,
      player10ans TEXT,
      FOREIGN KEY (game_number) REFERENCES DeathByAI(game_number)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating DeathResponses table:', err);
    } else {
      console.log('Database table "DeathResponses" ready');
    }
  });
});

const deathb = async ({ ack, respond, command, logger, client }) => {
  try {
    await ack();
    const userId = command.user_id;
    
    const view = await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        callback_id: "death_go_modal",
        private_metadata: JSON.stringify({ user_id: userId }),
        title: {
          type: "plain_text",
          text: "Death by AI"
        },
        submit: {
          type: "plain_text",
          text: "Start!"
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "plain_text",
              text: "Do you have what it takes to survive?"
            }
          },
          {
            type: "input",
            block_id: "channel_block",
            label: {
              type: "plain_text",
              text: "What channel to play in?"
            },
            element: {
              type: "channels_select",
              action_id: "channel_select",
              placeholder: {
                type: "plain_text",
                text: "Pick any channel!"
              }
            }
          },
          {
            type: "input",
            block_id: "type_block",
            label: {
              type: "plain_text",
              text: "What kind of game to play"
            },
            element: {
              type: "static_select",
              action_id: "type_select",
              placeholder: {
                type: "plain_text",
                text: "Select game type"
              },
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "General"
                  },
                  value: "general"
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Magic"
                  },
                  value: "magic"
                }
              ]
            },
            hint: {
              type: "plain_text",
              text: "General is any scenario can happen, magic is that magical scenarios will happen."
            }
          }
        ]
      }
    });
    logger.info(view);
  } catch (error) {
    logger.error('Error creating Death by AI game:', error);
  }
};

export { deathb, db, dbRun, dbGet, dbAll };
