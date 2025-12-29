const playOmni = async ({ ack, respond, command, logger, client }) => {
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

    logger.info(`Opened RPS modal for user ${userId}`);
  } catch (error) {
    logger.error('Error creating Death by AI game:', error);
  }
};

export { playOmni };
