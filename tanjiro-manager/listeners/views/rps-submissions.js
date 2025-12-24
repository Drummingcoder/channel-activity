import { db, dbRun, dbGet, dbAll } from '../commands/deathbyai.js';

// Determine RPS winner
const determineWinner = (p1Move, p2Move) => {
  if (p1Move === p2Move) return 'tie';
  if (
    (p1Move === 'rock' && p2Move === 'scissors') ||
    (p1Move === 'scissors' && p2Move === 'paper') ||
    (p1Move === 'paper' && p2Move === 'rock')
  ) {
    return 'p1';
  }
  return 'p2';
};

// Handler for P1 move submission
const p1MoveSubmission = async ({ ack, view, body, client, logger }) => {
  try {
    await ack();

    const metadata = JSON.parse(view.private_metadata || "{}");
    const state = view.state?.values;
    
    let selectedMove = "";
    if (state) {
      for (const blockId in state) {
        if (state[blockId].rps_choice && state[blockId].rps_choice.selected_option) {
          selectedMove = state[blockId].rps_choice.selected_option.value;
          break;
        }
      }
    }

    if (!selectedMove) {
      logger.error('No move selected');
      return;
    }

    const gameNumber = metadata.gameNumber;
    
    // Get current game state
    const game = await dbGet('SELECT * FROM RPSGames WHERE game_number = ?', gameNumber);
    
    if (!game) {
      logger.error(`Game #${gameNumber} not found`);
      return;
    }

    // Update P1's move
    await dbRun('UPDATE RPSGames SET p1input = ? WHERE game_number = ?', selectedMove, gameNumber);
    
    logger.info(`P1 chose ${selectedMove} for game #${gameNumber}`);

    // Check if both players have submitted
    if (game.p2input) {
      // Both players have submitted - determine winner
      await dbRun('UPDATE RPSGames SET finished = 1 WHERE game_number = ?', gameNumber);
      
      const winner = determineWinner(selectedMove, game.p2input);
      
      if (winner === 'tie') {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `It's a tie! Both players chose *${selectedMove}*.`,
        });
      } else if (winner === 'p1') {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `<@${game.player1}> wins! They threw ${selectedMove} while <@${game.player2}> threw ${game.p2input}.`,
        });
      } else {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `<@${game.player2}> wins! They threw ${game.p2input} while <@${game.player1}> threw ${selectedMove}.`,
        });
      }
    }
  } catch (error) {
    logger.error('Error processing P1 move:', error);
  }
};

// Handler for P2 move submission
const p2MoveSubmission = async ({ ack, view, body, client, logger }) => {
  try {
    await ack();

    const metadata = JSON.parse(view.private_metadata || "{}");
    const state = view.state?.values;
    
    let selectedMove = "";
    if (state) {
      for (const blockId in state) {
        if (state[blockId].rps_choice && state[blockId].rps_choice.selected_option) {
          selectedMove = state[blockId].rps_choice.selected_option.value;
          break;
        }
      }
    }

    if (!selectedMove) {
      logger.error('No move selected');
      return;
    }

    const gameNumber = metadata.gameNumber;
    
    // Get current game state
    const game = await dbGet('SELECT * FROM RPSGames WHERE game_number = ?', gameNumber);
    
    if (!game) {
      logger.error(`Game #${gameNumber} not found`);
      return;
    }

    // Update P2's move
    await dbRun('UPDATE RPSGames SET p2input = ? WHERE game_number = ?', selectedMove, gameNumber);
    
    logger.info(`P2 chose ${selectedMove} for game #${gameNumber}`);

    // Check if both players have submitted
    if (game.p1input) {
      // Both players have submitted - determine winner
      await dbRun('UPDATE RPSGames SET finished = 1 WHERE game_number = ?', gameNumber);
      
      const winner = determineWinner(game.p1input, selectedMove);
      
      if (winner === 'tie') {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `It's a tie! Both players chose *${selectedMove}*.`,
        });
      } else if (winner === 'p1') {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `<@${game.player1}> wins! They threw ${game.p1input} while <@${game.player2}> threw ${selectedMove}.`,
        });
      } else {
        await client.chat.postMessage({
          channel: metadata.channelId,
          thread_ts: metadata.messageTs,
          text: `<@${game.player2}> wins! They threw ${selectedMove} while <@${game.player1}> threw ${game.p1input}.`,
        });
      }
    }
  } catch (error) {
    logger.error('Error processing P2 move:', error);
  }
};

export { p1MoveSubmission, p2MoveSubmission };
