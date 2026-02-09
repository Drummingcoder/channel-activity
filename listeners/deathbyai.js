// initialize database
import { turso, dbRun, dbGet } from './database.js';

// Initialize database schema
(async () => {
  try {
    await turso.execute(`
    CREATE TABLE IF NOT EXISTS DeathByAI (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_number INTEGER UNIQUE NOT NULL,
      ts TEXT NOT NULL,
      channel TEXT,
      player1 TEXT NOT NULL,
      player2 TEXT,
      player3 TEXT,
      player4 TEXT,
      player5 TEXT,
      player6 TEXT,
      player7 TEXT,
      player8 TEXT,
      player9 TEXT,
      player10 TEXT,
      p1score INTEGER DEFAULT 0,
      p2score INTEGER DEFAULT 0,
      p3score INTEGER DEFAULT 0,
      p4score INTEGER DEFAULT 0,
      p5score INTEGER DEFAULT 0,
      p6score INTEGER DEFAULT 0,
      p7score INTEGER DEFAULT 0,
      p8score INTEGER DEFAULT 0,
      p9score INTEGER DEFAULT 0,
      p10score INTEGER DEFAULT 0,
      playersEntered INTEGER DEFAULT 1,
      numofinputs INTEGER DEFAULT 0,
      round INTEGER DEFAULT 0,
      finished INTEGER DEFAULT 0,
      type TEXT DEFAULT 'general',
      lastquestion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    `);

    await turso.execute(`
    CREATE TABLE IF NOT EXISTS DeathResponses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_number INTEGER UNIQUE NOT NULL,
      player1rep TEXT,
      player1ans TEXT,
      player2rep TEXT,
      player2ans TEXT,
      player3rep TEXT,
      player3ans TEXT,
      player4rep TEXT,
      player4ans TEXT,
      player5rep TEXT,
      player5ans TEXT,
      player6rep TEXT,
      player6ans TEXT,
      player7rep TEXT,
      player7ans TEXT,
      player8rep TEXT,
      player8ans TEXT,
      player9rep TEXT,
      player9ans TEXT,
      player10rep TEXT,
      player10ans TEXT,
      FOREIGN KEY (game_number) REFERENCES DeathByAI(game_number)
    )
    `);
    console.log('Database table "DeathGames" ready');
  } catch (err) {
    console.error('Error during database initialization:', err);
  }
})();

// commands
const deathb = async ({ ack, command, logger, client }) => {
  try {
    await ack();
    const userId = command.user_id;
    
    const view = await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        callback_id: "death_go_modal",
        private_metadata: JSON.stringify({ user_id: userId }),
        title: {
          type: "plain_text",
          text: "Death by AI"
        },
        submit: {
          type: "plain_text",
          text: "Start!"
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "plain_text",
              text: "Do you have what it takes to survive?"
            }
          },
          {
            type: "input",
            block_id: "channel_block",
            label: {
              type: "plain_text",
              text: "What channel to play in?"
            },
            element: {
              type: "channels_select",
              action_id: "channel_select",
              placeholder: {
                type: "plain_text",
                text: "Pick any channel!"
              }
            }
          },
          {
            type: "input",
            block_id: "type_block",
            label: {
              type: "plain_text",
              text: "What kind of game to play"
            },
            element: {
              type: "static_select",
              action_id: "type_select",
              placeholder: {
                type: "plain_text",
                text: "Select game type"
              },
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "General"
                  },
                  value: "general"
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Magic"
                  },
                  value: "magic"
                }
              ]
            },
            hint: {
              type: "plain_text",
              text: "General is any scenario can happen, magic is that magical scenarios will happen."
            }
          }
        ]
      }
    });
    logger.info(view);
  } catch (error) {
    logger.error('Error creating Death by AI game:', error);
  }
};

const derespond = async ({ ack, command, logger, client }) => {
  try {
    await ack();
    const userId = command.user_id;
    const view = await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        callback_id: "death_respond_modal",
        private_metadata: JSON.stringify({ user_id: userId }),
        title: {
          type: "plain_text",
          text: "Death by AI responder"
        },
        submit: {
          type: "plain_text",
          text: "Go!"
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "plain_text",
              text: "Do you have what it takes to survive?"
            }
          },
          {
            type: "input",
            block_id: "gamenum_block",
            label: {
              type: "plain_text",
              text: "What game number?"
            },
            element: {
              type: "plain_text_input",
              action_id: "gamenum_input",
              placeholder: {
                type: "plain_text",
                text: "Which game are you responding to?"
              }
            }
          },
          {
            type: "input",
            block_id: "respond_block",
            label: {
              type: "plain_text",
              text: "What will you do?"
            },
            element: {
              type: "plain_text_input",
              action_id: "respond_input",
              multiline: true,
              placeholder: {
                type: "plain_text",
                text: "This is where you respond to the scenario"
              }
            },
            hint: {
              type: "plain_text",
              text: "Describe how you'll survive the magical scenario!"
            }
          }
        ]
      }
    });

    logger.info(`Opened response modal for user ${userId}`);
    logger.info(view);
  } catch (error) {
    logger.error('Error creating Death by AI game:', error);
  }
};

// views
const goplay = async ({ ack, view, client, logger }) => {
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
      text: `Game number: ${gameNumber}\n<@${userId}> wants to play a game of magical Death by AI! Anyone who wants to play with them, reply to this message.`,
      username: "The Dokeshi",
      icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
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
const dereply = async ({ ack, view, client, logger }) => {
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
      `UPDATE DeathByAI SET p${playerNum}score = p${playerNum}score + ?, numofinputs = numofinputs + 1 WHERE game_number = ?`,
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
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
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
            username: "The Dokeshi",
            icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
          });

          if (playerScore === 1) {
            await client.chat.postMessage({
              channel: updatedGame.channel,
              text: `You have succeeded! The AI says, "${playerAns}"`,
              thread_ts: post.ts,
              username: "The Dokeshi",
              icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
            });
          } else {
            await client.chat.postMessage({
              channel: updatedGame.channel,
              text: `You have failed! The AI says, "${playerAns}"`,
              thread_ts: post.ts,
              username: "The Dokeshi",
              icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
            });
          }
        }
      }

      await client.chat.postMessage({
        channel: updatedGame.channel,
        text: `Thank you for playing! See ya next time!`,
        thread_ts: post.ts,
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
      });
    }

    logger.info(`Player ${playerNum} response recorded for game #${gameNumber}`);
  } catch (error) {
    logger.error('Error processing death response:', error);
  }
};

// messages
const addperson = async ({ message, client, logger }) => {
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
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
      });
      
      await dbRun('UPDATE DeathByAI SET round = ? WHERE game_number = ?', 1, game.game_number);

      let airesponse1;
      if (game.type == "magic") {
        airesponse1 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${key}/ai/run/${"@cf/meta/llama-3.1-8b-instruct"}`, {
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
      } else {
        airesponse1 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${key}/ai/run/${"@cf/meta/llama-3.1-8b-instruct"}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`, 
          },
          body: JSON.stringify({
            messages: [
              { role: "user", content: `Give a scenario of any kind, it can be silly, it can be serious, it can be realistic, or it can be unrealistic. Just provide a scenario to survive, it can be of ANY kind. It can be any place, any time, any reason, and any resources. Make it around 300 characters or less. It has to end with the question, "How will you survive?" Make sure that the scenario is complete, no cut-off situations!`}
            ],
            max_tokens: 500, 
            temperature: 0.8,
          }),
        });
      }

      const thedata1 = await airesponse1.json();
      console.log(thedata1);
      const rep4 = thedata1.result.response.trim();

      await client.chat.postMessage({
        channel: channelToPost,
        text: `Alright, here's your scenario. Respond with the "/deathrespond" command.\n\n${rep4}`,
        thread_ts: timestamp,
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
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
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
      });
      return;
    }
    
    if (game.player10 || game.player10 == user) {
      await client.chat.postEphemeral({
        channel: channelToPost,
        user: user,
        text: "Sorry, the lobby is full.",
        thread_ts: timestamp,
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
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
        username: "The Dokeshi",
        icon_url: "https://cdn.hackclub.com/019c3add-359f-732c-94da-64eb92507428/jester.jpeg"
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

export { deathb, derespond, goplay, dereply, addperson };