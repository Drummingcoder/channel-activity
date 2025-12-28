import { App, LogLevel } from '@slack/bolt';
import { config } from 'dotenv';
import { registerListeners } from './listeners/index.js';
import http from 'http';

config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: LogLevel.DEBUG,
});

registerListeners(app);

(async () => {
  try {
    await app.start();
    app.logger.info('Tanjiro Manager app is running!');
  } catch (error) {
    app.logger.error('Failed to start the app', error);
  }
  
  // Render CHECK SERVER
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end('All systems go');
  }).listen(process.env.PORT || 10000);
})();
