import { turso, dbRun, dbGet } from './listeners/database.js';


// come back to this later
const sanscoins = async ({ ack, command, logger, client }) => {
  try {
    await ack();
    const userId = command.user_id;
    if (userId != "U091EPSQ3E3") {
        return;
    }
    let getResp = await dbGet('SELECT * FROM timeUsers WHERE slack_id = ?', "U091EPSQ3E3");
    const view = await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        callback_id: "coin_spend_modal",
        private_metadata: JSON.stringify({ user_id: userId }),
        title: {
          type: "plain_text",
          text: "Spend Coins"
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
              text: `Need to avoid some pings? You have ${getResp.coins} coins`
            }
          },
          {
            type: "input",
            block_id: "coinstospend",
            label: {
              type: "plain_text",
              text: "How much to spend?"
            },
            element: {
                type: "plain_text_input",
                action_id: "coinstospend_input",
                placeholder: {
                    type: "plain_text",
                    text: "0"
                },
            }
          },
        ]
      }
    });

    logger.info(`Opened coins modal for user ${userId}: Response is ${view}`);
  } catch (error) {
    logger.error('Error spending coins:', error);
  }
};