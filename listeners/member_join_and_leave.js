const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

// Events
const memberjoin = async({ client, event }) => {
    let invited = false;
    const rep1 = await client.users.info({
        user: event.user,
    });
    const userdisplay = rep1.user.profile?.display_name || rep1.user.profile?.real_name || "John Doe";
    let stringtoai = `This user just joined a Hack Club Slack channel that belongs to a dude named Shadowlight and he shares his daily adventures and his software projects (such as Slack bots and websites) and chills with friends in channel. As a cheerful, quirky, sometimes awkward, welcoming, jokester, fun-to-be-around person named Kit, welcome the user to the channel with some quirky jokes that are winter-themed and introduce them to what the channel is about and encourage them to chat freely and join the other personal channels in the Shadow Neighborhood canvas (they're not general channels like #general, but channels for people to talk about themselves), since they're all cool channels! Make some nice or quirky (you choose) remarks about their name (be respectful tho) ${userdisplay}. Make it around 125 words or less. Also, don't recommend any channels to join or any other things that you don't know exist. Also, it's not your channel, it's Shadowlight's channel.`;
    if (event.inviter && event.inviter != "") {
        invited = true;
        const rep2 = await client.users.info({
            user: event.inviter,
        });
        const invitedname = rep2.user.profile?.display_name || rep2.user.profile?.real_name || "no one";
        stringtoai += ` This user was forced to join by ${invitedname}, so poke some fun at that or tease the person who "invited" (forced them) to join.`
    }

    const airesponse1 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${AI_MODEL}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`, 
        },
        body: JSON.stringify({
            messages: [ { role: "user", content: stringtoai } ],
            max_tokens: 500, 
            temperature: 0.8,
        }),
    });
    const thedata = await airesponse1.json();
    console.log(thedata);
    const text = thedata.result.response.trim();

    await client.chat.postMessage({
        channel: event.channel,
        text: text,
    });

    const chat = await client.conversations.open({
        users: "U091EPSQ3E3",
    });

    if (invited) {
        await client.chat.postMessage({
            channel: chat.channel.id,
            text: `<@${event.user}> joined <#${event.channel}>, invited by <@${event.inviter}>.`
        });
    } else {
        await client.chat.postMessage({
            channel: chat.channel.id,
            text: `<@${event.user}> joined <#${event.channel}>.`
        });
    }
};

const memberleave = async({ client, event }) => {
    const open = await client.conversations.open({
        users: "U091EPSQ3E3",
    });

    await client.chat.postMessage({
        channel: open.channel.id,
        blocks: [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `Hey there! <@${event.user}> just left <#${event.channel}>!\n`,
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `Ok, so, send to channel?`,
            }
        },
        {
            "type": "actions",
            "elements": [
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "Yes!"
                },
                "action_id": "yespost",
                "value": JSON.stringify({ user: event.user, channel: event.channel }),
                "style": "primary"
            },
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "No!"
                },
                "action_id": "noout",
                "style": "danger"
            }
            ]
        }
        ]
    });
};

// Actions
const yesser = async ({ ack, client, body }) => {
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
}

const nooer = async ({ ack, client, body }) => {
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
};

export { memberjoin, memberleave, yesser, nooer };