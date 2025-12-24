import { db, dbRun, dbGet, dbAll } from '../commands/deathbyai.js';

const addperson = async ({ message, client, say, logger }) => {
  try {
    // Ignore bot messages
    if (message.bot_id || message.subtype === 'bot_message') {
      return;
    }
    
    const channelToPost = message.channel;
    const timestamp = message.thread_ts;
    const mess = message.ts;
    const user = message.user;
    const themess = message.text;

    const key = process.env.CLOUDFLARE_API_KEY;
    const token = process.env.CLOUDFLARE_API_TOKEN;

    // Find the game by thread timestamp
    const game = await dbGet('SELECT * FROM DeathByAI WHERE ts = ?', timestamp);

    if (!game) {
      return;
    }

    if (!game.player1) {
      return;
    }

    console.log(mess);
    if (game.player1 == user && themess && themess.toLowerCase() == "start") {
      await client.chat.postMessage({
        channel: channelToPost,
        text: "Alright, starting the game...",
        thread_ts: timestamp,
      });
      
      await dbRun('UPDATE DeathByAI SET round = ? WHERE game_number = ?', 1, game.game_number);

      const airesponse1 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${key}/ai/run/${"@cf/meta/llama-3.1-8b-instruct"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, 
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `Give a magical scenario of any kind, it can be silly, it can be serious, it can be realistic, or it can be unrealistic. Just provide a scenario to survive, it can be of ANY kind. It can be any place, any time, any reason, any resources, but the one thing it has to be is magical. Make it around 300 characters or less. It has to end with the question, "How will you survive?" Make sure that the scenario is complete, no cut-off situations!`}
          ],
          max_tokens: 500, 
          temperature: 0.8,
        }),
      });

      const thedata1 = await airesponse1.json();
      console.log(thedata1);
      const rep4 = thedata1.result.response.trim();

      await client.chat.postMessage({
        channel: channelToPost,
        text: `Alright, here's your scenario. Respond with the "/deathrespond" command.\n\n${rep4}`,
        thread_ts: timestamp,
      });

      await dbRun('UPDATE DeathByAI SET lastquestion = ? WHERE game_number = ?', rep4, game.game_number);

      return;
    }

    if (game.player1 == user || game.player2 == user || game.player3 == user || game.player4 == user || game.player5 == user || game.player6 == user || game.player7 == user || game.player8 == user || game.player9 == user || game.player10 == user) {
      await client.chat.postEphemeral({
        channel: channelToPost,
        user: user,
        text: "You can't join twice!",
        thread_ts: timestamp,
      });
      return;
    }
    
    if (game.player10 || game.player10 == user) {
      await client.chat.postEphemeral({
        channel: channelToPost,
        user: user,
        text: "Sorry, the lobby is full.",
        thread_ts: timestamp,
      });
      return;
    }

    if (!game.player2) {
      await dbRun(
        'UPDATE DeathByAI SET player2 = ?, p2score = ?, playersEntered = ? WHERE game_number = ?',
        user, 0, 2, game.game_number
      );
    } else if (!game.player3) {
      await dbRun(
        'UPDATE DeathByAI SET player3 = ?, p3score = ?, playersEntered = ? WHERE game_number = ?',
        user, 0, 3, game.game_number
      );
    } else if (!game.player4) {
      await dbRun(
        'UPDATE DeathByAI SET player4 = ?, p4score = ?, playersEntered = ? WHERE game_number = ?',
        user, 0, 4, game.game_number
      );
    } else if (!game.player5) {
      await dbRun(
        'UPDATE DeathByAI SET player5 = ?, p5score = ?, playersEntered = ? WHERE game_number = ?',
        user, 0, 5, game.game_number
      );
    } else if (!game.player6) {
      await dbRun(
        'UPDATE DeathByAI SET player6 = ?, p6score = ?, playersEntered = ? WHERE game_number = ?',
        user, 0, 6, game.game_number
      );
    } else if (!game.player7) {
      await dbRun(
        'UPDATE DeathByAI SET player7 = ?, p7score = ?, playersEntered = ? WHERE game_number = ?',
        user, 0, 7, game.game_number
      );
    } else if (!game.player8) {
      await dbRun(
        'UPDATE DeathByAI SET player8 = ?, p8score = ?, playersEntered = ? WHERE game_number = ?',
        user, 0, 8, game.game_number
      );
    } else if (!game.player9) {
      await dbRun(
        'UPDATE DeathByAI SET player9 = ?, p9score = ?, playersEntered = ? WHERE game_number = ?',
        user, 0, 9, game.game_number
      );
    } else {
      await dbRun(
        'UPDATE DeathByAI SET player10 = ?, p10score = ?, playersEntered = ? WHERE game_number = ?',
        user, 0, 10, game.game_number
      );
      await client.chat.postMessage({
        channel: channelToPost,
        text: "The lobby is now full! Please wait for the host to start the game.",
        thread_ts: timestamp,
      });
    }

    await client.reactions.add({
      channel: channelToPost,
      timestamp: mess,
      name: "white_check_mark",
    });
  } catch (error) {
    logger.error(error);
  }
};

export { addperson };
