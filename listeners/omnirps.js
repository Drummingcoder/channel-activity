import { turso, dbRun, dbGet } from './database.js';
import { runAi } from './ai.js';

// Cloudflare AI configuration
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

// Helper functions
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

// Initialize database
(async () => {
  try {
    await turso.execute(`
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
    `);

    await turso.execute(`
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
    `);
    console.log('Database table "RPSGames" ready');
  } catch (err) {
    console.error('Error during database initialization:', err);
  }
})();

// commands
const playOmni = async ({ ack, command, logger, client }) => {
  try {
    await ack();
    const userId = command.user_id;
    
    const view = await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        callback_id: "omni_rps_modal",
        private_metadata: JSON.stringify({ user_id: userId }),
        title: {
          type: "plain_text",
          text: "Omniscient RPS"
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
              text: "You can use any kind of magic in this game!"
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
            block_id: "player2_block",
            optional: true,
            label: {
              type: "plain_text",
              text: "Who to play against?"
            },
            element: {
              type: "users_select",
              action_id: "player2_select",
              placeholder: {
                type: "plain_text",
                text: "Leave blank to play alone"
              }
            },
            hint: {
              type: "plain_text",
              text: "Who is going to be your opponent? (leave blank to play alone)"
            }
          },
          {
            type: "input",
            block_id: "mode_block",
            label: {
              type: "plain_text",
              text: "What mode?"
            },
            element: {
              type: "static_select",
              action_id: "mode_select",
              placeholder: {
                type: "plain_text",
                text: "Select game mode"
              },
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "One Toss"
                  },
                  value: "one_toss"
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Multiple Answers"
                  },
                  value: "multiple_answers"
                }
              ]
            },
            hint: {
              type: "plain_text",
              text: "One toss means you only throw one answer (like RPS). Multiple answers means you keep going until one of you loses."
            }
          },
          {
            type: "input",
            block_id: "type_block",
            label: {
              type: "plain_text",
              text: "What type of game?"
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
                    text: "Any move goes!"
                  },
                  value: "general"
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Only magical answers"
                  },
                  value: "magic"
                }
              ]
            },
            hint: {
              type: "plain_text",
              text: "General (anything goes) or magical (only magic-related answers allowed)!"
            }
          }
        ]
      }
    });

    logger.info(`Opened RPS modal for user ${userId}.\nModule is: ${view}`);
  } catch (error) {
    logger.error('Error creating Death by AI game:', error);
  }
};

// views
const omnirpsSubmission = async ({ ack, view, client, logger }) => {
  try {
    await ack();

    const formValues = view.state.values;
    const metadata = JSON.parse(view.private_metadata);
    
    const channelToPost = formValues.channel_block.channel_select.selected_channel;
    const otherUser = formValues.player2_block?.player2_select?.selected_user;
    const mode = formValues.mode_block.mode_select.selected_option.value;
    const type = formValues.type_block.type_select.selected_option.value;
    const userId = metadata.user_id;

    // Handle solo infinite mode (no player 2)
    if (!otherUser) {
      const initialMove = type === "magic" ? "flying pig" : "rock";
      const firstText = await client.chat.postMessage({
        channel: channelToPost,
        text: `<@${userId}>, ready to play magical infinite RPS? Just reply in this thread with your move, and see how high your score can go!`,
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
      });

      await client.chat.postMessage({
        channel: channelToPost,
        text: `What can beat ${initialMove}?`,
        thread_ts: firstText.ts,
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
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
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
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
      username: "The Dokeshi",
      icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
    });

    await dbRun(
      `INSERT INTO OmniRPSGames (game_number, player1, player2, p1input, p2input, finished, type, channel, message_ts, input_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [gamenum, userId, otherUser, "", "", 0, type, channelToPost, firstText.ts, 0]
    );

    await client.chat.postMessage({
      channel: channelToPost,
      thread_ts: firstText.ts,
      username: "The Dokeshi",
      icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg",
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
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
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
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
      });
    } else if (winCondition.toLowerCase().includes(p2.toLowerCase())) {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `<@${game.player2}>'s answer of "${p2}" won against <@${game.player1}>'s answer of "${p1}"! ${winner}`,
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
      });
    } else {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `Something went wrong with determining the winner.`,
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
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
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
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
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
      });
    } else if (winCondition.toLowerCase().includes(p2.toLowerCase())) {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `<@${game.player2}>'s answer of "${p2}" won against <@${game.player1}>'s answer of "${p1}"! ${winner}`,
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
      });
    } else {
      await client.chat.postMessage({
        channel: metadata.channelId,
        thread_ts: metadata.messageTs,
        text: `Something went wrong with determining the winner.`,
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
      });
      logger.error('Winner determination failed', { p1, p2, winner, winCondition });
    }
  }
};
// reply mechanism
const omnirespond = async ({ message, client, say, logger }) => {
  try {
    // Ignore its own messages
    if (message.user == "U0A2THHDPN2") {
      return;
    }

    // Ignore bot messages
    if (message.bot_id || message.subtype === 'bot_message') {
      runAi(message, client, logger);
      return;
    }

    // Only respond to messages in threads
    if (!message.thread_ts) {
      runAi(message, client, logger);
      return;
    }

    const channelToPost = message.channel;
    const timestamp = message.thread_ts;
    const mess = message.text;
    const user = message.user;

    // Look up the game by thread_ts (game_id)
    const game = await dbGet(
      'SELECT * FROM MultiRPSGames WHERE game_id = ?',
      [timestamp]
    );

    // If no game found or game is finished, ignore
    if (!game || game.finished === 1) {
      runAi(message, client, logger);
      return;
    }

    const inputsList = JSON.parse(game.inputs_list || '[]');

    // SOLO MODE (no player2)
    if (!game.player2) {
      // Only the player1 can respond
      if (game.player1 !== user) {
        return;
      }

      // First move in solo mode (current_input is empty)
      if (!game.current_input || game.current_input === "") {
        const starter = game.type === "magic" ? "flying pig" : "rock";

        // Validate magic move if needed
        if (game.type === "magic") {
          const isMagic = await isMagicRelated(mess);
          if (!isMagic) {
            await client.chat.postEphemeral({
              channel: channelToPost,
              user: user,
              thread_ts: timestamp,
              text: `That's not a magic-related move, please try again or change your answer.`,
            });
            return;
          }
        }

        // Determine winner
        const winner = await determineWinner(starter, mess);
        const winCondition = winner.split("wins")[0];

        if (winCondition.toLowerCase().includes(mess.toLowerCase())) {
          // Player wins, continue game
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `${winner}\n\nSo, what would win against "${mess}"?`,
          });

          const newInputsList = [...inputsList, mess];
          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, score = ?, inputs_list = ?
             WHERE game_id = ?`,
            [mess, game.score + 1, JSON.stringify(newInputsList), timestamp]
          );
        } else {
          // Player loses, end game
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `Unfortunately ${winner}\n\nYou achieved a score of ${game.score}! Have a magical day!`,
          });

          const newInputsList = [...inputsList, mess];
          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, finished = 1, inputs_list = ?
             WHERE game_id = ?`,
            [mess, JSON.stringify(newInputsList), timestamp]
          );
        }
      } else {
        // Subsequent moves - check for reused answers
        for (let i = 0; i < inputsList.length; i++) {
          if (mess.toLowerCase() === inputsList[i].toLowerCase()) {
            await client.chat.postMessage({
              channel: channelToPost,
              thread_ts: timestamp,
              text: `You can't reuse answers! Try again!`,
            });
            return;
          }
        }

        // Validate magic move if needed
        if (game.type === "magic") {
          const isMagic = await isMagicRelated(mess);
          if (!isMagic) {
            await client.chat.postEphemeral({
              channel: channelToPost,
              user: user,
              thread_ts: timestamp,
              text: `That's not a magic-related move, please try again or change your answer.`,
            });
            return;
          }
        }

        // Determine winner against previous move
        const winner = await determineWinner(game.current_input, mess);
        const winCondition = winner.split("wins")[0];

        if (winCondition.toLowerCase().includes(mess.toLowerCase())) {
          // Player wins, continue game
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `${winner}\n\nSo, what would win against "${mess}"?`,
          });

          const newInputsList = [...inputsList, mess];
          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, score = ?, inputs_list = ?
             WHERE game_id = ?`,
            [mess, game.score + 1, JSON.stringify(newInputsList), timestamp]
          );
        } else if (winCondition.toLowerCase().includes(game.current_input.toLowerCase())) {
          // Player loses, end game
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `Unfortunately ${winner}\n\nYou achieved a score of ${game.score}!`,
          });

          const newInputsList = [...inputsList, mess];
          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, finished = 1, inputs_list = ?
             WHERE game_id = ?`,
            [mess, JSON.stringify(newInputsList), timestamp]
          );
        } else {
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `Something went wrong: ${winner}, please try again.`,
          });
        }
      }
    } else {
      // MULTIPLAYER MODE
      // Check if it's the correct player's turn
      const isPlayer1Turn = game.player1 === user && game.turn === 1;
      const isPlayer2Turn = game.player2 === user && game.turn === 2;
      
      if (!isPlayer1Turn && !isPlayer2Turn) {
        return;
      }

      // First move in multiplayer mode
      if (!game.current_input || game.current_input === "") {
        // Validate magic move if needed
        if (game.type === "magic") {
          const isMagic = await isMagicRelated(mess);
          if (!isMagic) {
            await client.chat.postEphemeral({
              channel: channelToPost,
              user: user,
              thread_ts: timestamp,
              text: `That's not a magic-related move, please try again or change your answer.`,
            });
            return;
          }
        }

        // First player makes a move
        await client.chat.postMessage({
          channel: channelToPost,
          thread_ts: timestamp,
          text: `So, player 2, what would win against "${mess}"?`,
        });

        const newInputsList = [...inputsList, mess];
        await dbRun(
          `UPDATE MultiRPSGames 
           SET current_input = ?, inputs_list = ?, turn = 2
           WHERE game_id = ?`,
          [mess, JSON.stringify(newInputsList), timestamp]
        );
      } else {
        // Subsequent moves - check for reused answers
        for (let i = 0; i < inputsList.length; i++) {
          if (mess === inputsList[i]) {
            await client.chat.postMessage({
              channel: channelToPost,
              thread_ts: timestamp,
              text: `You can't reuse answers! Try again!`,
            });
            return;
          }
        }

        // Validate magic move if needed
        if (game.type === "magic") {
          const isMagic = await isMagicRelated(mess);
          if (!isMagic) {
            await client.chat.postEphemeral({
              channel: channelToPost,
              user: user,
              thread_ts: timestamp,
              text: `That's not a magic-related move, please try again or change your answer.`,
            });
            return;
          }
        }

        // Determine winner
        const winner = await determineWinner(game.current_input, mess);
        const winCondition = winner.split("wins")[0];

        if (winCondition.toLowerCase().includes(mess.toLowerCase())) {
          // Current player wins, switch turns
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `${winner}\n\nSo, what would win against "${mess}"?`,
          });

          const newTurn = game.turn === 1 ? 2 : 1;
          const newInputsList = [...inputsList, mess];

          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, inputs_list = ?, turn = ?
             WHERE game_id = ?`,
            [mess, JSON.stringify(newInputsList), newTurn, timestamp]
          );
        } else if (winCondition.toLowerCase().includes(game.current_input.toLowerCase())) {
          // Current player loses, end game
          let winner_user = "";
          let loser_user = "";
          
          if (game.turn === 1) {
            winner_user = game.player2;
            loser_user = game.player1;
          } else {
            winner_user = game.player1;
            loser_user = game.player2;
          }

          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `Unfortunately ${winner}\n\n<@${winner_user}> wins against <@${loser_user}>!`,
          });

          const newInputsList = [...inputsList, mess];
          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, finished = 1, inputs_list = ?
             WHERE game_id = ?`,
            [mess, JSON.stringify(newInputsList), timestamp]
          );
        }
      }
    }
  } catch (error) {
    logger.error(error);
  }
};

// actions
// Action handler for Player 1 button click
const omniP1InputHandler = async ({ ack, body, client, logger }) => {
  await ack();

  const gameNumber = body.actions[0].value;
  const game = await dbGet(
    'SELECT * FROM OmniRPSGames WHERE game_number = ?',
    [gameNumber]
  );

  if (!game) {
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: "Game not found!",
    });
    return;
  }

  if (body.user.id !== game.player1) {
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: "This button isn't for you!",
    });
    return;
  }

  // Update input_state: 0 -> 1 (first player), 1 -> 2 (second player)
  const newState = game.input_state === 0 ? 1 : 2;
  
  await dbRun(
    'UPDATE OmniRPSGames SET input_state = ? WHERE game_number = ?',
    [newState, gameNumber]
  );

  // Update the message to show player is entering input
  if (body.message) {
    const blocks = body.message.blocks.map(block => {
      if (block.type === "actions") {
        return {
          ...block,
          elements: block.elements.filter(
            (el) => el.action_id !== "omni_p1_input"
          ),
        };
      }
      return block;
    });

    const contextBlocks = [
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `P1 is entering their input!`
          }
        ]
      }
    ];

    if (newState === 2) {
      contextBlocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `P2 is entering their input!`
          }
        ]
      });
    }

    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      blocks: [...blocks, ...contextBlocks]
    });
  }

  // Open modal for player input
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      callback_id: "omni_p1_move",
      type: "modal",
      title: {
        type: "plain_text",
        text: "Your Move"
      },
      submit: {
        type: "plain_text",
        text: "Submit"
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "What's your move?"
          },
        },
        {
          type: "input",
          block_id: "input_move",
          label: {
            type: "plain_text",
            text: "Pick any move!",
            emoji: true
          },
          element: {
            type: "plain_text_input",
            action_id: "rps_choice"
          }
        }
      ],
      private_metadata: JSON.stringify({
        player: "p1",
        userId: body.user.id,
        channelId: body.channel.id,
        messageTs: body.message.ts,
        gameId: gameNumber
      }),
    }
  });
};

// Action handler for Player 2 button click
const omniP2InputHandler = async ({ ack, body, client, logger }) => {
  await ack();

  const gameNumber = body.actions[0].value;
  const game = await dbGet(
    'SELECT * FROM OmniRPSGames WHERE game_number = ?',
    [gameNumber]
  );

  if (!game) {
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: "Game not found!",
    });
    return;
  }

  if (body.user.id !== game.player2) {
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: "This button isn't for you!",
    });
    return;
  }

  // Update input_state
  const newState = game.input_state === 0 ? 1 : 2;
  
  await dbRun(
    'UPDATE OmniRPSGames SET input_state = ? WHERE game_number = ?',
    [newState, gameNumber]
  );

  // Update the message
  if (body.message) {
    const blocks = body.message.blocks.map(block => {
      if (block.type === "actions") {
        return {
          ...block,
          elements: block.elements.filter(
            (el) => el.action_id !== "omni_p2_input"
          ),
        };
      }
      return block;
    });

    const contextBlocks = [
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `P2 is entering their input!`
          }
        ]
      }
    ];

    if (newState === 2) {
      // Insert P1 context before P2
      contextBlocks.unshift({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `P1 is entering their input!`
          }
        ]
      });
    }

    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      blocks: [...blocks, ...contextBlocks]
    });
  }

  // Open modal for player input
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      callback_id: "omni_p2_move",
      type: "modal",
      title: {
        type: "plain_text",
        text: "Your Move"
      },
      submit: {
        type: "plain_text",
        text: "Submit"
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "What's your move?"
          },
        },
        {
          type: "input",
          block_id: "input_move",
          label: {
            type: "plain_text",
            text: "Pick any move!",
            emoji: true
          },
          element: {
            type: "plain_text_input",
            action_id: "rps_choice"
          }
        }
      ],
      private_metadata: JSON.stringify({
        player: "p2",
        userId: body.user.id,
        channelId: body.channel.id,
        messageTs: body.message.ts,
        gameId: gameNumber,
      }),
    }
  });
};

export { playOmni, omnirpsSubmission, omniP1MoveSubmission, omniP2MoveSubmission, omnirespond, omniP1InputHandler, omniP2InputHandler };