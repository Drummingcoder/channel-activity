import { p1InputHandler, p2InputHandler } from './rps-actions.js';
import { omniP1InputHandler, omniP2InputHandler } from '../views/omnirps.js';

export const register = (app) => {
  app.action('p1_input', p1InputHandler);
  app.action('p2_input', p2InputHandler);
  app.action('omni_p1_input', omniP1InputHandler);
  app.action('omni_p2_input', omniP2InputHandler);
  app.action('yespost', async ({ ack, client, body, logger }) => {
    await ack();
    if (body.message && body.channel) {
      const blocks = body.message.blocks.map(block => {
        if (block.type === "actions" && Array.isArray(block.elements)) {
          const elements = block.elements.filter(
            (el) => el.action_id !== "yespost" && el.action_id !== "noout"
          );
          if (elements.length === 0) return null;
          return { ...block, elements };
        }
        return block;
      }).filter(Boolean);
      await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        blocks: [
          ...blocks,
          {
            "type": "context",
            "elements": [
              {
                "type": "mrkdwn",
                "text": `Got it! Sending to channel...`
              }
            ]
          },
        ]
      });
    }
    const raw = body.actions?.[0]?.value || "{}";
    /** @type {{ user?: string; channel?: string }} */
    const payload = JSON.parse(raw);
    const leaver = payload.user;
    const chan = payload.channel;

    if (leaver && chan) {
      await client.chat.postMessage({
        channel: chan,
        text: `Nooo! <@${leaver}> has left the chat :cryin:.`,
      });
    }
  });
  app.action('noout', async ({ ack, client, body, logger }) => {
    await ack();
    if (body.message && body.channel) {
      const blocks = body.message.blocks.map(block => {
        if (block.type === "actions" && Array.isArray(block.elements)) {
          const elements = block.elements.filter(
            (el) => el.action_id !== "yespost" && el.action_id !== "noout"
          );
          if (elements.length === 0) return null;
          return { ...block, elements };
        }
        return block;
      }).filter(Boolean);
      await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        blocks: [
          ...blocks,
          {
            "type": "context",
            "elements": [
              {
                "type": "mrkdwn",
                "text": `Got it! Won't send to channel!`
              }
            ]
          },
        ]
      });
    }
  });
};
