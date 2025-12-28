const flipcoin = async ({ message, client, say, logger }) => {
  try {
    // Ignore bot messages
    if (message.bot_id || message.subtype === 'bot_message') {
      return;
    }
    
    // Extract number of coins from message (e.g., "flip 5 coins")
    let num = 1; // Default to 1 coin
    const numberMatch = message.text.match(/flip\s+(a\s+)?(\d+)\s+coins?/i);
    if (numberMatch && numberMatch[2]) {
      num = parseInt(numberMatch[2], 10);
    }

    if (!isNaN(num) && isFinite(num) && num > 1) {
      if (num > 1000000) {
        await client.chat.postMessage({
          channel: message.channel,
          text: `The limit is 1000000 coins, rolling 1000000 coins instead.`,
          thread_ts: message.thread_ts || message.ts,
        });
        num = 1000000;
      }

      let numHeads = 0, numTails = 0;
      let resultMessage = "You rolled ";

      for (let i = 0; i < num; i++) {
        if (Math.random() < 0.5) {
          numHeads++;
          resultMessage += "heads, ";
        } else {
          numTails++;
          resultMessage += "tails, ";
        }
      }

      await client.chat.postMessage({
        channel: message.channel,
        text: resultMessage,
        thread_ts: message.thread_ts || message.ts,
      });

      await client.chat.postMessage({
        channel: message.channel,
        text: `That's a total of ${numHeads} heads and ${numTails} tails.`,
        thread_ts: message.thread_ts || message.ts,
      });

      return;
    }

    // Single coin flip
    const coin = Math.random();
    let result = "";
    if (coin < 0.5) {
      result = "heads";
    } else {
      result = "tails";
    }
    await client.chat.postMessage({
      channel: message.channel,
      text: `It's ${result}!`,
      thread_ts: message.thread_ts || message.ts,
    });
  } catch (error) {
    logger.error('Error in flipcoin handler:', error);
  }
};

export { flipcoin };

