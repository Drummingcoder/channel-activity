import { db, dbRun, dbGet, dbAll } from '../commands/deathbyai.js';

// Cloudflare AI configuration
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

// Helper function to call Cloudflare AI
async function callCloudflareAI(messages, maxTokens = 100, temperature = 0.8) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_API_KEY}/ai/run/${AI_MODEL}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: JSON.stringify({
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    }
  );
  return await response.json();
}

// Helper function to validate if move is magic-related
async function isMagicRelated(move) {
  const aiResponse = await callCloudflareAI([
    {
      role: "system",
      content: 'You are a concise, helpful assistant. Your only function is to determine if a term is related to magic based on the provided definition. You must only respond with a single word: "Yes" or "No".'
    },
    {
      role: "user",
      content: `Is the term "${move}" related to magic in any way? The definition of magic is: "the power of apparently influencing the course of events by using mysterious or supernatural forces." Please respond with a simple yes or no.`
    }
  ], 3, 0.1);

  const response = aiResponse.result.response.trim().toLowerCase();
  return response.includes("yes");
}

// Helper function to determine winner between two moves
async function determineWinner(move1, move2) {
  const aiResponse = await callCloudflareAI([
    {
      role: "system",
      content: 'You are a battle simulation expert in a game of Rock, Paper, Scissors, but you can use anything. Your task is to select a single winner between two combatants and provide a one-sentence explanation. Your entire response MUST strictly follow the exact format: "[Winner Name] wins because [reason]." Do not include any extra text, punctuation, or formatting outside of the specified structure.'
    },
    {
      role: "user",
      content: `Which would win: ${move1} or ${move2}? Just give me the winner and a short explanation (1 sentence) in the form "[Insert winner] wins because [insert reason]". So if ${move1} would win against ${move2}, put "${move1} wins because [insert reason]". Otherwise, put "${move2} wins because [insert reason]." No ties! Don't add any extra punctuation or brackets/parathesis to the response.`
    }
  ], 100, 0.8);

  return aiResponse.result.response.trim();
}

const omnirespond = async ({ message, client, say, logger }) => {
  try {
    // Ignore bot messages
    if (message.bot_id || message.subtype === 'bot_message') {
      return;
    }

    // Only respond to messages in threads
    if (!message.thread_ts) {
      return;
    }

    const channelToPost = message.channel;
    const timestamp = message.thread_ts;
    const mess = message.text;
    const user = message.user;

    // Look up the game by thread_ts (game_id)
    const game = await dbGet(
      'SELECT * FROM MultiRPSGames WHERE game_id = ?',
      [timestamp]
    );

    // If no game found or game is finished, ignore
    if (!game || game.finished === 1) {
      return;
    }

    const inputsList = JSON.parse(game.inputs_list || '[]');

    // SOLO MODE (no player2)
    if (!game.player2) {
      // Only the player1 can respond
      if (game.player1 !== user) {
        return;
      }

      // First move in solo mode (current_input is empty)
      if (!game.current_input || game.current_input === "") {
        const starter = game.type === "magic" ? "flying pig" : "rock";

        // Validate magic move if needed
        if (game.type === "magic") {
          const isMagic = await isMagicRelated(mess);
          if (!isMagic) {
            await client.chat.postEphemeral({
              channel: channelToPost,
              user: user,
              thread_ts: timestamp,
              text: `That's not a magic-related move, please try again or change your answer.`,
            });
            return;
          }
        }

        // Determine winner
        const winner = await determineWinner(starter, mess);
        const winCondition = winner.split("wins")[0];

        if (winCondition.toLowerCase().includes(mess.toLowerCase())) {
          // Player wins, continue game
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `${winner}\n\nSo, what would win against "${mess}"?`,
          });

          const newInputsList = [...inputsList, mess];
          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, score = ?, inputs_list = ?
             WHERE game_id = ?`,
            [mess, game.score + 1, JSON.stringify(newInputsList), timestamp]
          );
        } else {
          // Player loses, end game
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `Unfortunately ${winner}\n\nYou achieved a score of ${game.score}! Have a magical day!`,
          });

          const newInputsList = [...inputsList, mess];
          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, finished = 1, inputs_list = ?
             WHERE game_id = ?`,
            [mess, JSON.stringify(newInputsList), timestamp]
          );
        }
      } else {
        // Subsequent moves - check for reused answers
        for (let i = 0; i < inputsList.length; i++) {
          if (mess.toLowerCase() === inputsList[i].toLowerCase()) {
            await client.chat.postMessage({
              channel: channelToPost,
              thread_ts: timestamp,
              text: `You can't reuse answers! Try again!`,
            });
            return;
          }
        }

        // Validate magic move if needed
        if (game.type === "magic") {
          const isMagic = await isMagicRelated(mess);
          if (!isMagic) {
            await client.chat.postEphemeral({
              channel: channelToPost,
              user: user,
              thread_ts: timestamp,
              text: `That's not a magic-related move, please try again or change your answer.`,
            });
            return;
          }
        }

        // Determine winner against previous move
        const winner = await determineWinner(game.current_input, mess);
        const winCondition = winner.split("wins")[0];

        if (winCondition.toLowerCase().includes(mess.toLowerCase())) {
          // Player wins, continue game
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `${winner}\n\nSo, what would win against "${mess}"?`,
          });

          const newInputsList = [...inputsList, mess];
          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, score = ?, inputs_list = ?
             WHERE game_id = ?`,
            [mess, game.score + 1, JSON.stringify(newInputsList), timestamp]
          );
        } else if (winCondition.toLowerCase().includes(game.current_input.toLowerCase())) {
          // Player loses, end game
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `Unfortunately ${winner}\n\nYou achieved a score of ${game.score}!`,
          });

          const newInputsList = [...inputsList, mess];
          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, finished = 1, inputs_list = ?
             WHERE game_id = ?`,
            [mess, JSON.stringify(newInputsList), timestamp]
          );
        } else {
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `Something went wrong: ${winner}, please try again.`,
          });
        }
      }
    } else {
      // MULTIPLAYER MODE
      // Check if it's the correct player's turn
      if (game.player1 !== user || game.turn !== 1) {
        if (game.player2 !== user || game.turn !== 2) {
          return;
        }
      }

      // First move in multiplayer mode
      if (!game.current_input || game.current_input === "") {
        // Validate magic move if needed
        if (game.type === "magic") {
          const isMagic = await isMagicRelated(mess);
          if (!isMagic) {
            await client.chat.postEphemeral({
              channel: channelToPost,
              user: user,
              thread_ts: timestamp,
              text: `That's not a magic-related move, please try again or change your answer.`,
            });
            return;
          }
        }

        // First player makes a move
        await client.chat.postMessage({
          channel: channelToPost,
          thread_ts: timestamp,
          text: `So, player 2, what would win against "${mess}"?`,
        });

        const newInputsList = [...inputsList, mess];
        await dbRun(
          `UPDATE MultiRPSGames 
           SET current_input = ?, inputs_list = ?, turn = 2
           WHERE game_id = ?`,
          [mess, JSON.stringify(newInputsList), timestamp]
        );
      } else {
        // Subsequent moves - check for reused answers
        for (let i = 0; i < inputsList.length; i++) {
          if (mess === inputsList[i]) {
            await client.chat.postMessage({
              channel: channelToPost,
              thread_ts: timestamp,
              text: `You can't reuse answers! Try again!`,
            });
            return;
          }
        }

        // Validate magic move if needed
        if (game.type === "magic") {
          const isMagic = await isMagicRelated(mess);
          if (!isMagic) {
            await client.chat.postEphemeral({
              channel: channelToPost,
              user: user,
              thread_ts: timestamp,
              text: `That's not a magic-related move, please try again or change your answer.`,
            });
            return;
          }
        }

        // Determine winner
        const winner = await determineWinner(game.current_input, mess);
        const winCondition = winner.split("wins")[0];

        if (winCondition.toLowerCase().includes(mess.toLowerCase())) {
          // Current player wins, switch turns
          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `${winner}\n\nSo, what would win against "${mess}"?`,
          });

          const newTurn = game.turn === 1 ? 2 : 1;
          const newInputsList = [...inputsList, mess];

          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, inputs_list = ?, turn = ?
             WHERE game_id = ?`,
            [mess, JSON.stringify(newInputsList), newTurn, timestamp]
          );
        } else if (winCondition.toLowerCase().includes(game.current_input.toLowerCase())) {
          // Current player loses, end game
          let winner_user = "";
          let loser_user = "";
          
          if (game.turn === 1) {
            winner_user = game.player2;
            loser_user = game.player1;
          } else {
            winner_user = game.player1;
            loser_user = game.player2;
          }

          await client.chat.postMessage({
            channel: channelToPost,
            thread_ts: timestamp,
            text: `Unfortunately ${winner}\n\n<@${winner_user}> wins against <@${loser_user}>!`,
          });

          const newInputsList = [...inputsList, mess];
          await dbRun(
            `UPDATE MultiRPSGames 
             SET current_input = ?, finished = 1, inputs_list = ?
             WHERE game_id = ?`,
            [mess, JSON.stringify(newInputsList), timestamp]
          );
        }
      }
    }
  } catch (error) {
    logger.error(error);
  }
};

export { omnirespond };
