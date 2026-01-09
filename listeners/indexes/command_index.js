import { deathb } from '../commands/deathbyai.js';
import { derespond } from '../commands/deathresponder.js';
import { playRPS } from '../rps.js';
import { playOmni } from '../commands/omnirps.js';
import { messy } from '../commands/messytext.js';
import { whisper } from '../commands/whispertext.js';

export const register = (app) => {
  app.command('/deathbyai', deathb);
  app.command('/deathrespond', derespond);
  app.command('/playRPS', playRPS);
  app.command('/playOmniRPS', playOmni);
  app.command('/messytext', messy);
  app.command('/whispertext', whisper);
};
