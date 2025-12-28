const eightball = async ({ message, client, say, logger }) => {
  try {
    // Ignore bot messages
    if (message.bot_id || message.subtype === 'bot_message') {
      return;
    }
    
    await client.chat.postMessage({
      channel: message.channel,
      text: "Shaking the ball...",
      thread_ts: message.thread_ts || message.ts,
    });
    let rando = Math.random(); //values from 0 to 0.99
    let reroll = Math.random();
    for (let chances = 0.4; reroll > chances; chances += 0.1) {
      rando = Math.random();
      reroll = Math.random();
      await client.chat.postMessage({
        channel: message.channel,
        text: "Shaking the ball...",
        thread_ts: message.thread_ts || message.ts,
      });
    }
    if (rando < 0.4) {
      const responses = ["It is certain", "It is decidedly so", "Without a doubt", "Yes definitely", "As I see it, yes", "Most likely", "Signs point to yes", "Outlook good"];
      const index = Math.floor(Math.random() * (8));
      await client.chat.postMessage({
        channel: message.channel,
        text: `The 8-ball says: "${responses[index]}"`,
        thread_ts: message.thread_ts || message.ts,
      });
    } else if (rando < 0.7) {
      const responses = ["Don't count on it", "My reply is no", "My sources say no", "Outlook not so good", "Very doubtful", "Highly Unlikely"];
      const index = Math.floor(Math.random() * (6));
      await client.chat.postMessage({
        channel: message.channel,
        text: `The 8-ball says: "${responses[index]}"`,
        thread_ts: message.thread_ts || message.ts,
      });
    } else {
      const responses = ["Reply hazy", "try again", "Ask again later", "Better not tell you now", "Cannot predict now", "Concentrate and ask again"];
      const index = Math.floor(Math.random() * (6));
      await client.chat.postMessage({
        channel: message.channel,
        text: `The 8-ball says: "${responses[index]}"`,
        thread_ts: message.thread_ts || message.ts,
      });
    }
  } catch (error) {
    logger.error('Error in eightball handler:', error);
  }
};

export { eightball };

