const derespond = async ({ ack, respond, command, logger, client }) => {
  try {
    await ack();
    const userId = command.user_id;
    const view = await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        callback_id: "death_respond_modal",
        private_metadata: JSON.stringify({ user_id: userId }),
        title: {
          type: "plain_text",
          text: "Death by AI responder"
        },
        submit: {
          type: "plain_text",
          text: "Go!"
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
            block_id: "gamenum_block",
            label: {
              type: "plain_text",
              text: "What game number?"
            },
            element: {
              type: "plain_text_input",
              action_id: "gamenum_input",
              placeholder: {
                type: "plain_text",
                text: "Which game are you responding to?"
              }
            }
          },
          {
            type: "input",
            block_id: "respond_block",
            label: {
              type: "plain_text",
              text: "What will you do?"
            },
            element: {
              type: "plain_text_input",
              action_id: "respond_input",
              multiline: true,
              placeholder: {
                type: "plain_text",
                text: "This is where you respond to the scenario"
              }
            },
            hint: {
              type: "plain_text",
              text: "Describe how you'll survive the magical scenario!"
            }
          }
        ]
      }
    });

    logger.info(`Opened response modal for user ${userId}`);
  } catch (error) {
    logger.error('Error creating Death by AI game:', error);
  }
};

export { derespond };
