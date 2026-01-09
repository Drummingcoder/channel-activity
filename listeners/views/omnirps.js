import { db, dbRun, dbGet, dbAll } from '../commands/deathbyai.js';

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS OmniRPSGames (
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
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating OmniRPSGames table:', err);
    } else {
      console.log('Database table "OmniRPSGames" ready');
    }
  });

  // Multiple-answers mode (infinite rounds, solo or two players)
  db.run(`
    CREATE TABLE IF NOT EXISTS MultiRPSGames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT UNIQUE NOT NULL,
      player1 TEXT NOT NULL,
      player2 TEXT,
      score INTEGER DEFAULT 0,
      finished INTEGER DEFAULT 0,
      current_input TEXT,
      inputs_list TEXT DEFAULT '[]',
      turn INTEGER DEFAULT 1,
      type TEXT NOT NULL,
      channel TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating MultiRPSGames table:', err);
    } else {
      console.log('Database table "MultiRPSGames" ready');
    }
  });
});

// Cloudflare AI configuration
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

// Helper function to call Cloudflare AI
async function callCloudflareAI(messages, maxTokens = 100, temperature = 0.8) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${AI_MODEL}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: JSON.stringify({
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    }
  );
  return await response.json();
}

// Helper function to validate if move is magic-related
async function isMagicRelated(move) {
  const aiResponse = await callCloudflareAI([
    {
      role: "system",
      content: 'You are a concise, helpful assistant. Your only function is to determine if a term is related to magic based on the provided definition. You must only respond with a single word: "Yes" or "No".'
    },
    {
      role: "user",
      content: `Is the term "${move}" related to magic in any way? The definition of magic is: "the power of apparently influencing the course of events by using mysterious or supernatural forces." Please respond with a simple yes or no.`
    }
  ], 3, 0.1);

  const response = aiResponse.result.response.trim().toLowerCase();
  return response.includes("yes");
}

// Helper function to determine winner between two moves
async function determineWinner(p1Move, p2Move) {
  const aiResponse = await callCloudflareAI([
    {
      role: "system",
      content: 'You are a battle simulation expert in a game of Rock, Paper, Scissors, but you can use anything. Your task is to select a single winner between two combatants and provide a one-sentence explanation. Your entire response MUST strictly follow the exact format: "[Winner Name] wins because [reason]." Do not include any extra text, punctuation, or formatting outside of the specified structure.'
    },
    {
      role: "user",
      content: `Who would win: ${p1Move} or ${p2Move}? Just give me the winner and a short explanation (1 sentence) in the form "[Insert winner] wins because [insert reason]". So if ${p1Move} would win against ${p2Move}, put "${p1Move} wins because [insert reason]". Otherwise, put "${p2Move} wins because [insert reason]." No ties! Don't add any extra punctuation or brackets/parathesis to the response.`
    }
  ], 100, 0.8);

  return aiResponse.result.response.trim();
}

// View submission handler for starting a new Omniscient RPS game
const omnirpsSubmission = async ({ ack, view, body, client, logger }) => {
  try {
    await ack();

    const formValues = view.state.values;
    const metadata = JSON.parse(view.private_metadata);
    
    const channelToPost = formValues.channel_block.channel_input.selected_channel;
    const otherUser = formValues.player2_block?.player2_input?.selected_user;
    const mode = formValues.mode_block.mode_input.selected_option.value;
    const type = formValues.type_block.type_input.selected_option.value;
    const userId = metadata.userId;

    // Handle solo infinite mode (no player 2)
    if (!otherUser) {
      const initialMove = type === "magic" ? "flying pig" : "rock";
      const firstText = await client.chat.postMessage({
        channel: channelToPost,
        text: `<@${userId}>, ready to play magical infinite RPS? Just reply in this thread with your move, and see how high your score can go!`,
      });

      await client.chat.postMessage({
        channel: channelToPost,
        text: `What can beat ${initialMove}?`,
        thread_ts: firstText.ts,
      });

      await dbRun(
        `INSERT INTO MultiRPSGames (game_id, player1, score, inputs_list, type, channel, current_input)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [firstText.ts, userId, 0, JSON.stringify([initialMove]), type, channelToPost, ""]
      );

      logger.info(`Created solo infinite RPS game in thread ${firstText.ts}`);
      return;
    }

    // Handle multiplayer infinite mode
    if (mode === "multiple_answers") {
      const firstText = await client.chat.postMessage({
        channel: channelToPost,
        text: `<@${userId}> has challenged <@${otherUser}> to play magical infinite RPS! Player 1, make your first move!`,
      });

      await dbRun(
        `INSERT INTO MultiRPSGames (game_id, player1, player2, score, inputs_list, type, channel, turn, current_input)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [firstText.ts, userId, otherUser, -1, JSON.stringify([]), type, channelToPost, 1, ""]
      );

      logger.info(`Created multiplayer infinite RPS game in thread ${firstText.ts}`);
      return;
    }

    // Handle one-toss mode (classic 1v1)
    // Find next available game number
    const maxGameRow = await dbGet('SELECT MAX(game_number) as max_num FROM OmniRPSGames');
    const gamenum = (maxGameRow?.max_num || 0) + 1;

    // Check if there's an ongoing game by looking for unfinished games
    const ongoingGame = await dbGet(
      'SELECT * FROM OmniRPSGames WHERE finished = 0 LIMIT 1'
    );

    if (ongoingGame) {
      await client.chat.postEphemeral({
        channel: channelToPost,
        user: userId,
        text: `A game is still ongoing!`,
      });
      return;
    }

    const firstText = await client.chat.postMessage({
      channel: channelToPost,
      text: `<@${userId}> has challenged <@${otherUser}> to a game of magical Omniscient Rock, Paper, Scissors!`,
    });

    await dbRun(
      `INSERT INTO OmniRPSGames (game_number, player1, player2, p1input, p2input, finished, type, channel, message_ts, input_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [gamenum, userId, otherUser, "", "", 0, type, channelToPost, firstText.ts, 0]
    );

    await client.chat.postMessage({
      channel: channelToPost,
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
              value: gamenum.toString(),
              action_id: "omni_p1_input",
              style: "primary"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Player 2, go!"
              },
              value: gamenum.toString(),
              action_id: "omni_p2_input",
              style: "danger"
            }
          ]
        }
      ],
    });

    logger.info(`Created one-toss RPS game #${gamenum}`);
  } catch (error) {
    logger.error('Error creating Omniscient RPS game:', error);
  }
};

// View submission handler for Player 1 move
const omniP1MoveSubmission = async ({ ack, view, body, client, logger }) => {
  const metadata = JSON.parse(view.private_metadata);
  const selectedMove = view.state.values.input_move.rps_choice.value;

  const game = await dbGet(
    'SELECT * FROM OmniRPSGames WHERE game_number = ?',
    [metadata.gameId]
  );

  if (!game) {
    await ack({
      response_action: "errors",
      errors: {
        input_move: "Game not found!"
      }
    });
    return;
  }

  // Validate magic moves if type is magic
  if (game.type === "magic") {
    const isMagic = await isMagicRelated(selectedMove);
    if (!isMagic) {
      await ack({
        response_action: "errors",
        errors: {
          input_move: "That's not a magic-related move! Please choose something related to magic (supernatural or mysterious forces)."
        }
      });
      return;
    }
  }

  await ack();

  // Update game with P1's input
  const finished = game.p2input ? 1 : 0;
  await dbRun(
    'UPDATE OmniRPSGames SET p1input = ?, finished = ? WHERE game_number = ?',
    [selectedMove, finished, metadata.gameId]
  );

  logger.info(`P1 (${metadata.userId}) chose: ${selectedMove}`);

  // If both players have submitted, determine winner
  if (game.p2input) {
    const p1 = selectedMove;
    const p2 = game.p2input;

    if (p1 === p2) {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `It's a tie! Both players chose ${p1}.`,
      });
      return;
    }

    const winner = await determineWinner(p1, p2);
    const winCondition = winner.replaceAll('\n', '').split("wins")[0];

    if (winCondition.toLowerCase().includes(p1.toLowerCase())) {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `<@${game.player1}>'s answer of "${p1}" won against <@${game.player2}>'s answer of "${p2}"! ${winner}`,
      });
    } else if (winCondition.toLowerCase().includes(p2.toLowerCase())) {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `<@${game.player2}>'s answer of "${p2}" won against <@${game.player1}>'s answer of "${p1}"! ${winner}`,
      });
    } else {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `Something went wrong with determining the winner.`,
      });
      logger.error('Winner determination failed', { p1, p2, winner, winCondition });
    }
  }
};

// View submission handler for Player 2 move
const omniP2MoveSubmission = async ({ ack, view, body, client, logger }) => {
  const metadata = JSON.parse(view.private_metadata);
  const selectedMove = view.state.values.input_move.rps_choice.value;

  const game = await dbGet(
    'SELECT * FROM OmniRPSGames WHERE game_number = ?',
    [metadata.gameId]
  );

  if (!game) {
    await ack({
      response_action: "errors",
      errors: {
        input_move: "Game not found!"
      }
    });
    return;
  }

  // Validate magic moves if type is magic
  if (game.type === "magic") {
    const isMagic = await isMagicRelated(selectedMove);
    if (!isMagic) {
      await ack({
        response_action: "errors",
        errors: {
          input_move: "That's not a magic-related move! Please choose something related to magic (supernatural or mysterious forces)."
        }
      });
      return;
    }
  }

  await ack();

  // Update game with P2's input
  const finished = game.p1input ? 1 : 0;
  await dbRun(
    'UPDATE OmniRPSGames SET p2input = ?, finished = ? WHERE game_number = ?',
    [selectedMove, finished, metadata.gameId]
  );

  logger.info(`P2 (${metadata.userId}) chose: ${selectedMove}`);

  // If both players have submitted, determine winner
  if (game.p1input) {
    const p1 = game.p1input;
    const p2 = selectedMove;

    if (p1 === p2) {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `It's a tie! Both players chose ${p1}.`,
      });
      return;
    }

    const winner = await determineWinner(p1, p2);
    const winCondition = winner.replaceAll('\n', '').split("wins")[0];

    if (winCondition.toLowerCase().includes(p1.toLowerCase())) {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `<@${game.player1}>'s answer of "${p1}" won against <@${game.player2}>'s answer of "${p2}"! ${winner}`,
      });
    } else if (winCondition.toLowerCase().includes(p2.toLowerCase())) {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `<@${game.player2}>'s answer of "${p2}" won against <@${game.player1}>'s answer of "${p1}"! ${winner}`,
      });
    } else {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `Something went wrong with determining the winner.`,
      });
      logger.error('Winner determination failed', { p1, p2, winner, winCondition });
    }
  }
};

export { omnirpsSubmission, omniP1MoveSubmission, omniP2MoveSubmission };
