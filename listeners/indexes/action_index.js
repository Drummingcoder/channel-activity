import { p1InputHandler, p2InputHandler } from '../rps.js';
import { omniP1InputHandler, omniP2InputHandler } from '../omnirps.js';
import { yesser, nooer } from '../member_join_and_leave.js';

export const register = (app) => {
  app.action('p1_input', p1InputHandler);
  app.action('p2_input', p2InputHandler);
  app.action('omni_p1_input', omniP1InputHandler);
  app.action('omni_p2_input', omniP2InputHandler);
  app.action('yespost', yesser);
  app.action('noout', nooer);
};
