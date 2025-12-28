const play = async ({ ack, respond, shortcut, logger, client }) => {
  try {
    await ack();
    const userId = shortcut.user.id;
    const view = await client.views.open({
      trigger_id: shortcut.trigger_id,
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

    logger.info(`Opened RPS modal for user ${userId}`);
  } catch (error) {
    logger.error('Error creating Death by AI game:', error);
  }
};

export { play };
