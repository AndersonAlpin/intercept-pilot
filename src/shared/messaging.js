export const MSG = {
  STATE_GET: 'state:get',
  SETTINGS_UPDATE: 'settings:update',
  RELEASE_NOTES_MARK_SEEN: 'releaseNotes:markSeen',
  APP_OPEN_FULL: 'app:openFullApp',

  DEBUG_ATTACH: 'debugger:attachActiveTab',
  DEBUG_DETACH: 'debugger:detach',
  TAB_RELOAD: 'tab:reload',

  COLLECTIONS_CREATE: 'collections:create',
  COLLECTIONS_UPDATE: 'collections:update',
  COLLECTIONS_REPLACE_CONTENTS: 'collections:replaceContents',
  COLLECTIONS_DELETE: 'collections:delete',
  COLLECTIONS_DELETE_MANY: 'collections:deleteMany',

  RULES_CREATE: 'rules:create',
  RULES_UPDATE: 'rules:update',
  RULES_DELETE: 'rules:delete',
  RULES_DELETE_MANY: 'rules:deleteMany',
  RULES_MOVE: 'rules:move',
  RULES_DUPLICATE: 'rules:duplicate',
  RULES_TOGGLE: 'rules:toggle',

  NETWORK_CLEAR: 'network:clear',
  NETWORK_GET_BODY: 'network:getBody',
  LOGS_CLEAR: 'logs:clear',
  RULE_CREATE_FROM_REQUEST: 'rule:createFromRequest',

  AI_BRIDGE_GET_SESSION: 'aiBridge:getSession',
  AI_BRIDGE_START_SESSION: 'aiBridge:startSession',
  AI_BRIDGE_REVOKE_SESSION: 'aiBridge:revokeSession'
}

export async function sendMessage(message) {
  return chrome.runtime.sendMessage(message)
}
