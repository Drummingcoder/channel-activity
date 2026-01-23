import { addperson } from '../deathbyai.js';
import { flipcoin, eightball, rolldice } from '../smallgames.js';

export const register = (app) => {
  app.message(/^(me|Me|I|i).*/, addperson);
  app.message(/^start$/i, addperson);
  app.message(/flip\s+(a\s+)?(\d+\s+)?coins?/i, flipcoin);
  app.message(/\broll\b\s+\d+\s+(dice|die)|\broll\b.*(dice|die)/i, rolldice);
  app.message(/\b(eight|8)\s*ball|ball\s*(eight|8)\b/i, eightball);
};
