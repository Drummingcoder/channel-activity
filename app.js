import { App, LogLevel } from '@slack/bolt';
import { config } from 'dotenv';
import { registerListeners } from './listeners/index.js';
import cron from 'node-cron';
import { DateTime } from 'luxon';
import http from 'http';
import { turso, dbRun, dbGet } from './listeners/database.js';

config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: LogLevel.DEBUG,
});

registerListeners(app);

await turso.execute(`
  CREATE TABLE IF NOT EXISTS timeUsers (
    id NUMBER PRIMARY KEY,
    slack_id STRING,
    coins NUMBER DEFAULT 0,
    timeOnline NUMBER DEFAULT 0,
    timeOffline NUMBER DEFAULT 0,
    spentCoins NUMBER DEFAULT 0
  )
`);

const usertomonitor = "U091EPSQ3E3";
const jesterchannel = "C09GDF8ETQB";
const personalchan = "C09AHN6V1U7";

// Cloudflare AI configuration
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

// Runs every minute, but only executes at 8:00 pm America/Los_Angeles (PST/PDT)
cron.schedule('* * * * *', async () => {
  const now = DateTime.now().setZone('America/Los_Angeles');
  if (now.hour === 20 && now.minute === 0) {
    let getResp = await dbGet('SELECT * FROM timeUsers WHERE slack_id = ?', usertomonitor);

    const getHackatime = await fetch(`https://hackatime.hackclub.com/api/hackatime/v1/users/current/statusbar/today`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.HACKATIME_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await getHackatime.json();
    console.log(data);

    const hoursSlack = Math.floor(getResp.timeOnline / 60);
    const hoursSlackdec = getResp.timeOnline / 60;
    const minSlack = getResp.timeOnline % 60;

    const seconds = data.data.grand_total.total_seconds;
    const hourshack = Math.floor(seconds / 3600);
    const hoursdecimal = seconds / 3600.0;
    const minshack = Math.floor((seconds % 3600) / 60);

    const airesponse1 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${AI_MODEL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: `The user is a Hack Club member who has spent ${hoursSlackdec} hours on Slack messaging and ${hoursdecimal} hours coding today. Could you provide some comments fitting a cheerful, quirky, sometimes awkward, welcoming, jokester, fun-to-be-around person named Kit. Make some bad winter jokes, some bad puns, and just be Kit. Try to encourage the user to either do better or to congratulate them and help them spend more time on Hackatime. Please provide a short 100-word response.`}
        ],
        max_tokens: 300, 
        temperature: 0.8,
      }),
    });

    const thedata = await airesponse1.json();
    console.log(thedata);
    const text = thedata.result.response.trim();

    const threadfirst = await app.client.chat.postMessage({
      channel: personalchan,
      text: `Hey <@${usertomonitor}>, here are your stats for today:\nTime spent on Slack: ${hoursSlack} hours and ${minSlack} minutes.\nHackatime stats: ${hourshack} hours and ${minshack} minutes.\n\nHere's what I think: ${text}`,
    });

    await app.client.chat.postMessage({
      channel: personalchan,
      text: "Tell us about your day, and don't be shy!",
      thread_ts: threadfirst.ts,
    });
  } else if (now.hour === 0 && now.minute === 0) {
    let getResp = await dbGet('SELECT * FROM timeUsers WHERE slack_id = ?', usertomonitor);

    const hours = Math.floor(getResp.timeOffline / 60);
    let coins = 0;
    if ((hours - 7) < 0) {
      coins = 0;
    } else {
      coins = hours - 7;
    }

    await dbRun(
      'UPDATE timeUsers SET coins = ?, timeOnline = ?, timeOffline = ? WHERE slack_id = ?',
      (getResp.coins + coins),
      0,
      0,
      usertomonitor
    );

    await app.client.chat.postMessage({
      channel: jesterchannel,
      text: "Coins have been counted and the times have been reset. Let's see how well you can do today."
    });
  } else {
    let getResp = await dbGet('SELECT * FROM timeUsers WHERE slack_id = ?', usertomonitor);

    const getStatus = await app.client.users.getPresence({
      user: getResp.slack_id,
    });
    if (getStatus.presence == "active") {
      await dbRun(
        'UPDATE timeUsers SET timeOnline = ? WHERE slack_id = ?',
        (getResp.timeOnline + 1),
        usertomonitor
      );

      if ((getResp.spentCoins > 0) && (getResp.timeOnline + 1) % 30 == 0) {
        await dbRun(
          'UPDATE timeUsers SET spentCoins = ? WHERE slack_id = ?',
          (getResp.spentCoins - 1),
          usertomonitor
        );
      } else {
        const time = getResp.timeOnline + 1;
        if (time == 30) {
          await app.client.chat.postMessage ({
            channel: jesterchannel,
            text: `Hey, <@${usertomonitor}>, you've been on Slack for 30 minutes now...`,
          });
        } else if (time == 60) {
          await app.client.chat.postMessage ({
            channel: jesterchannel,
            text: `Hey, <@${usertomonitor}>, your Slack time has reached 1 hour.`,
          });
        } else if (time == 90) {
          await app.client.chat.postMessage ({
            channel: jesterchannel,
            text: `Hey, <@${usertomonitor}>, your Slack time is now 1 hour and 30 mins.`,
          });
        } else if (time == 120) {
          await app.client.chat.postMessage ({
            channel: jesterchannel,
            text: `Hey, <@${usertomonitor}>. You've been here for 2 hours now, maybe it's time to get off?`,
          });
        } else if (time == 150) {
          await app.client.chat.postMessage ({
            channel: jesterchannel,
            text: `Hmm, <@${usertomonitor}>. It's been 2 hours and 30 minutes, it's really time to get off now ya know.`,
          });
        } else if (time == 180) {
          await app.client.chat.postMessage ({
            channel: jesterchannel,
            text: `<@${usertomonitor}> Haa...this is so disappointing. How could you want my help and still stay online for 3 HOURS? Just let me sleep twin...`,
          });
        } else if (time % 30 == 0) {
          const hours = Math.floor(time / 60);
          const mins = time % 60;
          await app.client.chat.postMessage ({
            channel: jesterchannel,
            text: `Let's just get to the point, <@${usertomonitor}>. You've been online for ${hours} hours and ${mins} minutes today.`,
          });
        }
      }
    } else if (getStatus.presence == "away") {
      await dbRun(
        'UPDATE timeUsers SET timeOffline = ? WHERE slack_id = ?',
        (getResp.timeOffline + 1),
        usertomonitor
      );
    }
  }
});

(async () => {
  try {
    await app.start();
    app.logger.info('Kit app is running!');
  } catch (error) {
    app.logger.error('Failed to start the app', error);
  }
  
  // Render CHECK SERVER
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end('All systems go');
  }).listen(process.env.PORT || 10000);
})();
