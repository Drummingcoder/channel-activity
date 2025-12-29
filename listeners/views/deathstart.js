import { db, dbRun, dbGet, dbAll } from '../commands/deathbyai.js';

const goplay = async ({ ack, view, body, client, logger }) => {
  try {
    await ack();

    const formValues = view.state.values;
    // Get user ID from private metadata or body
    const metadata = JSON.parse(view.private_metadata);
    const userId = metadata.user_id;
    
    // Get channel from form
    const channel = formValues.channel_block.channel_select.selected_channel;
    const type = formValues.type_block.type_select.selected_option.value;
    
    logger.info(`User ${userId} starting game in channel ${channel}`);

    // Find the next available game number
    const maxGame = await dbGet('SELECT MAX(game_number) as max_game FROM DeathByAI');
    const gameNumber = (maxGame?.max_game || 0) + 1;

    // Post the game message
    const mess = await client.chat.postMessage({
      channel: channel,
      text: `Game number: ${gameNumber}\n<@${userId}> wants to play a game of magical Death by AI! Anyone who wants to play with them, reply to this message.`
    });

    // Insert the game into the database
    await dbRun(
      `INSERT INTO DeathByAI 
       (game_number, ts, channel, player1, p1score, playersEntered, numofinputs, round, finished, type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      gameNumber,
      mess.ts,
      channel,
      userId,
      0,
      1,
      0,
      0,
      0,
      type,
    );

    logger.info(`Created Death by AI game #${gameNumber}`);
  } catch (error) {
    logger.error(error);
  }
};

export { goplay };
