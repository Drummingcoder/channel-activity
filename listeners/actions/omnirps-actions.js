import { db, dbRun, dbGet, dbAll } from '../commands/deathbyai.js';

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

export { omniP1InputHandler, omniP2InputHandler };