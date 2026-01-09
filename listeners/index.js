import * as actions from './indexes/action_index.js';
import * as commands from './indexes/command_index.js';
import * as events from './indexes/event_index.js';
import * as messages from './indexes/message_index.js';
import * as shortcuts from './indexes/shortcut_index.js';
import * as views from './indexes/views_index.js';

export const registerListeners = (app) => {
  actions.register(app);
  commands.register(app);
  events.register(app);
  messages.register(app);
  shortcuts.register(app);
  views.register(app);
};
