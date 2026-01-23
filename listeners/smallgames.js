const flipcoin = async ({ message, client, logger }) => {
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

const rolldice = async ({ message, client, logger }) => {
    try {
        // Extract number of dice from message (e.g., "roll 5 dice")
        const numberMatch = message.text.match(/\broll\b\s+(\d+)\s+(dice|die)/i);
        let num = 1; // Default to 1 die
        if (numberMatch && numberMatch[1]) {
            num = parseInt(numberMatch[1], 10);
        }
        
        if (num == 0) {
            await client.chat.postMessage({
                channel: message.channel,
                text: "You rolled nothing!",
                thread_ts: message.thread_ts || message.ts,
            });
            return { outputs: {} };
        }

        if (num > 1000000) {
            await client.chat.postMessage({
                channel: message.channel,
                text: `The limit is 1000000 dice, rolling 1000000 dice instead.`,
                thread_ts: message.thread_ts || message.ts,
            });
            num = 1000000;
        }

        await client.chat.postMessage({
            channel: message.channel,
            text: "Rolling...",
            thread_ts: message.thread_ts || message.ts,
        });
        let str = "You rolled ";
        if (num == 1) {
            const roll = Math.floor(Math.random() * (6) + 1);
            str += "a " + roll + ".";
            await client.chat.postMessage({
                channel: message.channel,
                text: str,
                thread_ts: message.thread_ts || message.ts,
            });
        } else {
            let sum = 0;
            const num1 = Math.floor(Math.random() * (6) + 1);
            str += num1 + ", ";
            sum += num1;
            for (let i = 1; i < (num - 1); i++) {
                const num2 = Math.floor(Math.random() * (6) + 1);
                str += num2 + ", ";
                sum += num2;
            }
            const num3 = Math.floor(Math.random() * (6) + 1);
            str += "and " + num3 + ".";
            sum += num3;
            await client.chat.postMessage({
                channel: message.channel,
                text: str,
                thread_ts: message.thread_ts || message.ts,
            });
            await client.chat.postMessage({
                channel: message.channel,
                text: "The sum of all rolled numbers is " + sum + ".",
                thread_ts: message.thread_ts || message.ts,
            });
        }
    } catch (error) {
        logger.error('Error in rolldice handler:', error);
    }
}

const eightball = async ({ message, client, logger }) => {
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

export { flipcoin, rolldice, eightball };