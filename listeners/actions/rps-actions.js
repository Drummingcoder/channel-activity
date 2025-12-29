import { db, dbRun, dbGet, dbAll } from '../commands/deathbyai.js';

// Handler for Player 1 button click
const p1InputHandler = async ({ ack, body, client, logger }) => {
  try {
    await ack();
    
    const { actions } = body;
    if (!actions) return;

    const gameNumber = parseInt(actions[0].value);
    
    // Get game from database
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
        const blocks = body.message.blocks
          .filter(block => block.type !== "context")
          .map(block => {
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
    
    // Get game from database
    const game = await dbGet('SELECT * FROM RPSGames WHERE game_number = ?', gameNumber);
    
    if (!game) {
      logger.error(`Game #${gameNumber} not found`);
      return;
    }

    // Check if this is the correct player
    if (body.user.id !== game.player2) {
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
        const blocks = body.message.blocks
          .filter(block => block.type !== "context")
          .map(block => {
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

export { p1InputHandler, p2InputHandler };
