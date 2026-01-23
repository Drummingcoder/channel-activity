import { deathb } from '../deathbyai.js';
import { derespond } from '../deathbyai.js';
import { playRPS } from '../rps.js';
import { playOmni } from '../omnirps.js';
import { messy, whisper } from '../textingcommands.js';

export const register = (app) => {
  app.command('/deathbyai', deathb);
  app.command('/deathrespond', derespond);
  app.command('/playRPS', playRPS);
  app.command('/playOmniRPS', playOmni);
  app.command('/messytext', messy);
  app.command('/whispertext', whisper);
};
