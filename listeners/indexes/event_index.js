import { omnirespond } from '../omnirps.js';
import { memberjoin, memberleave } from '../member_join_and_leave.js';

export const register = (app) => {
  app.event("message", omnirespond);
  
  app.event('member_joined_channel', memberjoin);
  app.event('member_left_channel', memberleave);
};
