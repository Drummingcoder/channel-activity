// Initialize database
import { turso, dbRun, dbGet } from './database.js';

(async () => {
  try {
    await turso.execute(`
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
    `);
    console.log('Database table "RPSGames" ready');
  } catch (err) {
    console.error('Error during database initialization:', err);
  }
})();

// commands
const playRPS = async ({ ack, command, logger, client }) => {
  try {
    await ack();
    const userId = command.user_id;
    const view = await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        callback_id: "rps_start_modal",
        private_metadata: JSON.stringify({ user_id: userId }),
        title: {
          type: "plain_text",
          text: "Rock, Paper, Scissors"
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
              text: "Have a good fashioned rock, paper, scissors match with anyone!"
            }
          },
          {
            type: "input",
            block_id: "player2_block",
            label: {
              type: "plain_text",
              text: "Who to play against?"
            },
            element: {
              type: "users_select",
              action_id: "player2_select",
              placeholder: {
                type: "plain_text",
                text: "Who is going to be your opponent?"
              }
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
          }
        ]
      }
    });

    logger.info(`Opened RPS modal for user ${userId}: Response is ${view}`);
  } catch (error) {
    logger.error('Error creating Death by AI game:', error);
  }
};

// views

// View submission handler for starting a new game
const basicrps = async ({ ack, view, client, logger }) => {
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

    const firstText = await client.chat.postMessage({
      channel: channel,
      text: `<@${player1}> has challenged <@${player2}> to a game of Rock, Paper, Scissors!`,
    });

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

const determineWinner = (p1Move, p2Move) => {
  if (p1Move === p2Move) return 'tie';
  if (
    (p1Move === 'rock' && p2Move === 'scissors') ||
    (p1Move === 'scissors' && p2Move === 'paper') ||
    (p1Move === 'paper' && p2Move === 'rock')
  ) {
    return 'p1';
  }
  return 'p2';
};

const p1MoveSubmission = async ({ ack, view, client, logger }) => {
  try {
    await ack();

    const metadata = JSON.parse(view.private_metadata || "{}");
    const state = view.state?.values;
    
    let selectedMove = "";
    if (state) {
      for (const blockId in state) {
        if (state[blockId].rps_choice && state[blockId].rps_choice.selected_option) {
          selectedMove = state[blockId].rps_choice.selected_option.value;
          break;
        }
      }
    }

    if (!selectedMove) {
      logger.error('No move selected');
      return;
    }

    const gameNumber = metadata.gameNumber;
    
    const game = await dbGet('SELECT * FROM RPSGames WHERE game_number = ?', gameNumber);
    
    if (!game) {
      logger.error(`Game #${gameNumber} not found`);
      return;
    }

    await dbRun('UPDATE RPSGames SET p1input = ? WHERE game_number = ?', selectedMove, gameNumber);
    
    logger.info(`P1 chose ${selectedMove} for game #${gameNumber}`);

    // Check if both players have submitted
    if (game.p2input) {
      await dbRun('UPDATE RPSGames SET finished = 1 WHERE game_number = ?', gameNumber);
      
      const winner = determineWinner(selectedMove, game.p2input);
      
      if (winner === 'tie') {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `It's a tie! Both players chose *${selectedMove}*.`,
        });
      } else if (winner === 'p1') {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `<@${game.player1}> wins! They threw ${selectedMove} while <@${game.player2}> threw ${game.p2input}.`,
        });
      } else {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `<@${game.player2}> wins! They threw ${game.p2input} while <@${game.player1}> threw ${selectedMove}.`,
        });
      }
    }
  } catch (error) {
    logger.error('Error processing P1 move:', error);
  }
};

const p2MoveSubmission = async ({ ack, view, client, logger }) => {
  try {
    await ack();

    const metadata = JSON.parse(view.private_metadata || "{}");
    const state = view.state?.values;
    
    let selectedMove = "";
    if (state) {
      for (const blockId in state) {
        if (state[blockId].rps_choice && state[blockId].rps_choice.selected_option) {
          selectedMove = state[blockId].rps_choice.selected_option.value;
          break;
        }
      }
    }

    if (!selectedMove) {
      logger.error('No move selected');
      return;
    }

    const gameNumber = metadata.gameNumber;
    
    const game = await dbGet('SELECT * FROM RPSGames WHERE game_number = ?', gameNumber);
    
    if (!game) {
      logger.error(`Game #${gameNumber} not found`);
      return;
    }

    await dbRun('UPDATE RPSGames SET p2input = ? WHERE game_number = ?', selectedMove, gameNumber);
    
    logger.info(`P2 chose ${selectedMove} for game #${gameNumber}`);

    // Check if both players have submitted
    if (game.p1input) {
      await dbRun('UPDATE RPSGames SET finished = 1 WHERE game_number = ?', gameNumber);
      
      const winner = determineWinner(game.p1input, selectedMove);
      
      if (winner === 'tie') {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `It's a tie! Both players chose *${selectedMove}*.`,
        });
      } else if (winner === 'p1') {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `<@${game.player1}> wins! They threw ${game.p1input} while <@${game.player2}> threw ${selectedMove}.`,
        });
      } else {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `<@${game.player2}> wins! They threw ${selectedMove} while <@${game.player1}> threw ${game.p1input}.`,
        });
      }
    }
  } catch (error) {
    logger.error('Error processing P2 move:', error);
  }
};

// actions

// Handler for Player 1 button click
const p1InputHandler = async ({ ack, body, client, logger }) => {
  try {
    await ack();
    
    const { actions } = body;
    if (!actions) return;

    const gameNumber = parseInt(actions[0].value);
    
    const game = await dbGet('SELECT * FROM RPSGames WHERE game_number = ?', gameNumber);
    
    if (!game) {
      logger.error(`Game #${gameNumber} not found`);
      return;
    }

    // Check if this is the correct player
    if (body.user.id !== game.player1) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: body.user.id,
        text: "This button isn't for you!",
      });
      return;
    }

    // Update input state
    let newState = 0;
    if (game.input_state === 0) {
      newState = 1;
      await dbRun('UPDATE RPSGames SET input_state = ? WHERE game_number = ?', 1, gameNumber);
      
      // Update message to remove P1 button
      if (body.message && body.channel) {
        const blocks = body.message.blocks.map(block => {
          if (block.type === "actions") {
            return {
              ...block,
              elements: block.elements.filter(
                (el) => el.action_id !== "p1_input"
              ),
            };
          }
          return block;
        });
        
        await client.chat.update({
          channel: body.channel.id,
          ts: body.message.ts,
          blocks: [
            ...blocks,
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `P1 is entering their input!`
                }
              ]
            },
          ]
        });
      }
    } else if (game.input_state === 1) {
      newState = 2;
      await dbRun('UPDATE RPSGames SET input_state = ? WHERE game_number = ?', 2, gameNumber);
      
      // Update message - both players entering
      if (body.message && body.channel) {
        const blocks = body.message.blocks.filter(block => block.type !== "actions" && block.type !== "context");
        
        await client.chat.update({
          channel: body.channel.id,
          ts: body.message.ts,
          blocks: [
            ...blocks,
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `P1 is entering their input!`
                }
              ]
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `P2 is entering their input!`
                }
              ]
            },
          ]
        });
      }
    }

    // Open modal for player to choose
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        callback_id: "p1_inpu",
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
              text: "Choose your move:"
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "radio_buttons",
                action_id: "rps_choice",
                options: [
                  {
                    text: { type: "plain_text", text: "Rock" },
                    value: "rock"
                  },
                  {
                    text: { type: "plain_text", text: "Paper" },
                    value: "paper"
                  },
                  {
                    text: { type: "plain_text", text: "Scissors" },
                    value: "scissors"
                  }
                ]
              }
            ]
          }
        ],
        private_metadata: JSON.stringify({ 
          player: "p1", 
          userId: body.user.id,
          channelId: body.channel.id,
          messageTs: body.message.ts,
          gameNumber: gameNumber
        }),
      }
    });
  } catch (error) {
    logger.error('Error handling P1 input:', error);
  }
};

// Handler for Player 2 button click
const p2InputHandler = async ({ ack, body, client, logger }) => {
  try {
    await ack();
    
    const { actions } = body;
    if (!actions) return;

    const gameNumber = parseInt(actions[0].value);
    
    const game = await dbGet('SELECT * FROM RPSGames WHERE game_number = ?', gameNumber);
    
    if (!game) {
      logger.error(`Game #${gameNumber} not found`);
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

    let newState = 0;
    if (game.input_state === 0) {
      newState = 1;
      await dbRun('UPDATE RPSGames SET input_state = ? WHERE game_number = ?', 1, gameNumber);
      
      // Update message to remove P2 button
      if (body.message && body.channel) {
        const blocks = body.message.blocks.map(block => {
          if (block.type === "actions") {
            return {
              ...block,
              elements: block.elements.filter(
                (el) => el.action_id !== "p2_input"
              ),
            };
          }
          return block;
        });
        
        await client.chat.update({
          channel: body.channel.id,
          ts: body.message.ts,
          blocks: [
            ...blocks,
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `P2 is entering their input!`
                }
              ]
            },
          ]
        });
      }
    } else if (game.input_state === 1) {
      newState = 2;
      await dbRun('UPDATE RPSGames SET input_state = ? WHERE game_number = ?', 2, gameNumber);
      
      // Update message - both players entering
      if (body.message && body.channel) {
        const blocks = body.message.blocks.filter(block => block.type !== "actions" && block.type !== "context");
        
        await client.chat.update({
          channel: body.channel.id,
          ts: body.message.ts,
          blocks: [
            ...blocks,
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `P1 is entering their input!`
                }
              ]
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `P2 is entering their input!`
                }
              ]
            },
          ]
        });
      }
    }

    // Open modal for player to choose
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        callback_id: "p2_inpu",
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
              text: "Choose your move:"
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "radio_buttons",
                action_id: "rps_choice",
                options: [
                  {
                    text: { type: "plain_text", text: "Rock" },
                    value: "rock"
                  },
                  {
                    text: { type: "plain_text", text: "Paper" },
                    value: "paper"
                  },
                  {
                    text: { type: "plain_text", text: "Scissors" },
                    value: "scissors"
                  }
                ]
              }
            ]
          }
        ],
        private_metadata: JSON.stringify({ 
          player: "p2", 
          userId: body.user.id,
          channelId: body.channel.id,
          messageTs: body.message.ts,
          gameNumber: gameNumber
        }),
      }
    });
  } catch (error) {
    logger.error('Error handling P2 input:', error);
  }
};

export { playRPS, basicrps, p1MoveSubmission, p2MoveSubmission, p1InputHandler, p2InputHandler };