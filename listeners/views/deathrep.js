import { db, dbRun, dbGet, dbAll } from '../commands/deathbyai.js';

const dereply = async ({ ack, view, body, client, logger }) => {
  try {
    await ack();

    const formValues = view.state.values;
    const metadata = JSON.parse(view.private_metadata);
    const userId = metadata.user_id;
    
    const gameNumber = parseInt(formValues.gamenum_block.gamenum_input.value);
    const userResponse = formValues.respond_block.respond_input.value;
    
    logger.info(`User ${userId} responding to game #${gameNumber}`);

    // Get the game
    const game = await dbGet('SELECT * FROM DeathByAI WHERE game_number = ?', gameNumber);

    if (!game) {
      logger.error(`Game #${gameNumber} not found`);
      return;
    }

    if (game.finished) {
      logger.error(`Game #${gameNumber} is already finished`);
      return;
    }

    if (!game.player1) {
      logger.error(`Game #${gameNumber} has no players`);
      return;
    }

    // Find which player this user is
    let playerNum = null;
    for (let i = 1; i <= 10; i++) {
      if (game[`player${i}`] === userId) {
        playerNum = i;
        break;
      }
    }

    if (!playerNum) {
      logger.error(`User ${userId} is not in game #${gameNumber}`);
      return;
    }

    // Get Cloudflare API key from env
    const cfKey = process.env.CLOUDFLARE_API_KEY;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;

    // Call AI to judge the response
    const airesponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfKey}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfToken}`,
      },
      body: JSON.stringify({
        messages: [
          { 
            role: "system", 
            content: 'You are a survival expert. Analyze the provided scenario and the proposed response. Answer with a simple yes or no, followed by a 1 to 3 sentence justification. You MUST strictly adhere to one of the following two formats and no others: "yes because [insert 1-3 sentence reason]" or "no because [insert 1-3 sentence reason]". Do not add any extra text or commentary.' 
          },
          { 
            role: "user", 
            content: `This is a survival scenario: ${game.lastquestion}\n\nWill this response survive the scenario provided: ${userResponse}.`
          }
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    const aiData = await airesponse.json();
    logger.info('AI response:', aiData);
    
    const aiText = aiData.result.response.trim().replaceAll("\n", "");
    const verdict = aiText.split("because")[0];
    const survived = verdict.toLowerCase().includes("yes") ? 1 : 0;

    // Update player score in game table
    await dbRun(
      `UPDATE DeathByAI SET p${playerNum}score = ?, numofinputs = numofinputs + 1 WHERE game_number = ?`,
      survived,
      gameNumber
    );

    // Get or create response record
    let responses = await dbGet('SELECT * FROM DeathResponses WHERE game_number = ?', gameNumber);
    
    if (!responses) {
      // Create new response record
      await dbRun('INSERT INTO DeathResponses (game_number) VALUES (?)', gameNumber);
      responses = await dbGet('SELECT * FROM DeathResponses WHERE game_number = ?', gameNumber);
    }

    // Update response for this player
    await dbRun(
      `UPDATE DeathResponses SET player${playerNum}rep = ?, player${playerNum}ans = ? WHERE game_number = ?`,
      userResponse,
      aiText,
      gameNumber
    );

    // Get updated game
    const updatedGame = await dbGet('SELECT * FROM DeathByAI WHERE game_number = ?', gameNumber);

    // Check if all players have responded
    if (updatedGame.numofinputs >= updatedGame.playersEntered) {
      // Mark game as finished
      await dbRun('UPDATE DeathByAI SET finished = 1 WHERE game_number = ?', gameNumber);

      // Get all responses
      const allResponses = await dbGet('SELECT * FROM DeathResponses WHERE game_number = ?', gameNumber);

      // Post results
      const post = await client.chat.postMessage({
        channel: updatedGame.channel,
        text: `Here are the results of game #${gameNumber}!`,
      });

      // Post results for each player
      for (let i = 1; i <= 10; i++) {
        if (updatedGame[`player${i}`]) {
          const playerRep = allResponses[`player${i}rep`];
          const playerAns = allResponses[`player${i}ans`];
          const playerScore = updatedGame[`p${i}score`];

          await client.chat.postMessage({
            channel: updatedGame.channel,
            text: `<@${updatedGame[`player${i}`]}>, with your response of "${playerRep}"...`,
            thread_ts: post.ts,
          });

          if (playerScore === 1) {
            await client.chat.postMessage({
              channel: updatedGame.channel,
              text: `You have succeeded! The AI says, "${playerAns}"`,
              thread_ts: post.ts,
            });
          } else {
            await client.chat.postMessage({
              channel: updatedGame.channel,
              text: `You have failed! The AI says, "${playerAns}"`,
              thread_ts: post.ts,
            });
          }
        }
      }

      await client.chat.postMessage({
        channel: updatedGame.channel,
        text: `Thank you for playing! See ya next time!`,
        thread_ts: post.ts,
      });
    }

    logger.info(`Player ${playerNum} response recorded for game #${gameNumber}`);
  } catch (error) {
    logger.error('Error processing death response:', error);
  }
};

export { dereply };
