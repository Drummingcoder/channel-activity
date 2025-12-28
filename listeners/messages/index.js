import { addperson } from './deathadder.js';
import { flipcoin } from './aflipper.js';
import { eightball } from './ball.js';
import { nextminute } from './zoom.js';

export const register = (app) => {
  app.message(/^(me|Me|I|i).*/, addperson);
  app.message(/flip\s+(a\s+)?(\d+\s+)?coins?/i, flipcoin);
  app.message(/(eight|8).*ball|ball.*(eight|8)/i, eightball);
  app.message(/^oneminutelaterpastnonececil934$/, nextminute);
};
