import { deathb } from './deathbyai.js';
import { derespond } from './deathresponder.js';
import { play } from './regularrps.js';
import { playOmni } from './omnirps.js';
import { messy } from './messytext.js';
import { whisper } from './whispertext.js';

export const register = (app) => {
  app.command('/deathbyai', deathb);
  app.command('/deathrespond', derespond);
  app.command('/playRPS', play);
  app.command('/playOmniRPS', playOmni);
  app.command('/messytext', messy);
  app.command('/whispertext', whisper);
};
