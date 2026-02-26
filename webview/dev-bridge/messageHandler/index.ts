import type { WebSocket } from 'ws';
import type { IPCMessage } from '../index';
import { log, error, label, magenta } from '../log';
import { sendMessageHandler } from './sendMessageHandler';
import { stopGenerationHandler } from './stopGenerationHandler';
import { newSessionHandler } from './newSessionHandler';
import { getSessionsHandler } from './getSessionsHandler';
import { getProjectsHandler } from './getProjectsHandler';
import { loadSessionHandler } from './loadSessionHandler';
import { openFileHandler } from './openFileHandler';
import { openSettingsHandler } from './openSettingsHandler';
import { getSettingsHandler } from './getSettingsHandler';
import { saveSettingsHandler } from './saveSettingsHandler';
import { getUsageHandler } from './getUsageHandler';

export {
  sendMessageHandler,
  stopGenerationHandler,
  newSessionHandler,
  getSessionsHandler,
  getProjectsHandler,
  loadSessionHandler,
  openFileHandler,
  openSettingsHandler,
  getSettingsHandler,
  saveSettingsHandler,
  getUsageHandler,
};

export async function handleMessage(ws: WebSocket, data: Buffer) {
  console.log('\n');
  try {
    const message: IPCMessage = JSON.parse(data.toString());
    log(label('Received:'), magenta(message.type));

    switch (message.type) {
      case 'SEND_MESSAGE':
        sendMessageHandler(ws, message);
        break;
      case 'STOP_GENERATION':
        stopGenerationHandler(ws, message);
        break;
      case 'NEW_SESSION':
        newSessionHandler(ws, message);
        break;
      case 'GET_SESSIONS':
        await getSessionsHandler(ws, message);
        break;
      case 'GET_PROJECTS':
        await getProjectsHandler(ws, message);
        break;
      case 'LOAD_SESSION':
        await loadSessionHandler(ws, message);
        break;
      case 'OPEN_FILE':
        openFileHandler(ws, message);
        break;
      case 'OPEN_SETTINGS':
        openSettingsHandler(ws, message);
        break;
      case 'GET_SETTINGS':
        await getSettingsHandler(ws, message);
        break;
      case 'SAVE_SETTINGS':
        await saveSettingsHandler(ws, message);
        break;
      case 'GET_USAGE':
        await getUsageHandler(ws, message);
        break;
      default:
        log('Unknown message type:', message.type);
    }
  } catch (err) {
    error('Error parsing message:', err);
  }
}
