import { addperson } from '../messages/deathadder.js';
import { flipcoin } from '../messages/aflipper.js';
import { eightball } from '../messages/ball.js';
import { nextminute } from '../messages/zoom.js';

export const register = (app) => {
  app.message(/^(me|Me|I|i).*/, addperson);
  app.message(/^start$/i, addperson);
  app.message(/flip\s+(a\s+)?(\d+\s+)?coins?/i, flipcoin);
  app.message(/(eight|8).*ball|ball.*(eight|8)/i, eightball);
  app.message(/^oneminutelaterpastnonececil934$/, nextminute);
};
