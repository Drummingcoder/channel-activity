import { db, dbRun, dbGet, dbAll } from '../commands/deathbyai.js';

// First, we need to create the RPS games table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS RPSGames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_number INTEGER UNIQUE NOT NULL,
      player1 TEXT NOT NULL,
      player2 TEXT NOT NULL,
      p1input TEXT,
      p2input TEXT,
      channel TEXT NOT NULL,
      message_ts TEXT,
      finished INTEGER DEFAULT 0,
      input_state INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating RPSGames table:', err);
    } else {
      console.log('Database table "RPSGames" ready');
    }
  });
});

// View submission handler for starting a new game
const basicrps = async ({ ack, view, body, client, logger }) => {
  try {
    await ack();

    const formValues = view.state.values;
    const metadata = JSON.parse(view.private_metadata);
    const player1 = metadata.user_id;
    
    const channel = formValues.channel_block.channel_select.selected_channel;
    const player2 = formValues.player2_block.player2_select.selected_user;

    logger.info(`${player1} challenging ${player2} to RPS in ${channel}`);

    // Find the next available game number
    const maxGame = await dbGet('SELECT MAX(game_number) as max_game FROM RPSGames');
    const gameNumber = (maxGame?.max_game || 0) + 1;

    // Post challenge message
    const firstText = await client.chat.postMessage({
      channel: channel,
      text: `<@${player1}> has challenged <@${player2}> to a game of Rock, Paper, Scissors!`,
    });

    // Create game in database
    await dbRun(
      `INSERT INTO RPSGames 
       (game_number, player1, player2, channel, message_ts, input_state, finished) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      gameNumber,
      player1,
      player2,
      channel,
      firstText.ts,
      0,
      0
    );

    // Post buttons for players to input their moves
    await client.chat.postMessage({
      channel: channel,
      thread_ts: firstText.ts,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Put your inputs in!",
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Player 1, go!"
              },
              value: gameNumber.toString(),
              action_id: "p1_input",
              style: "primary"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Player 2, go!"
              },
              value: gameNumber.toString(),
              action_id: "p2_input",
              style: "danger"
            }
          ]
        }
      ],
    });

    logger.info(`Created RPS game #${gameNumber}`);
  } catch (error) {
    logger.error('Error creating RPS game:', error);
  }
};

export { basicrps };
