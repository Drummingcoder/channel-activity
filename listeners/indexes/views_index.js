import { goplay, dereply } from '../deathbyai.js';
import { basicrps } from '../rps.js';
import { p1MoveSubmission, p2MoveSubmission } from '../rps.js';
import { omnirpsSubmission, omniP1MoveSubmission, omniP2MoveSubmission } from '../omnirps.js';

export const register = (app) => {
  app.view('death_go_modal', goplay);
  app.view('death_respond_modal', dereply);
  app.view('rps_start_modal', basicrps);
  app.view('p1_inpu', p1MoveSubmission);
  app.view('p2_inpu', p2MoveSubmission);
  app.view('omni_rps_modal', omnirpsSubmission);
  app.view('omni_p1_move', omniP1MoveSubmission);
  app.view('omni_p2_move', omniP2MoveSubmission);
};
