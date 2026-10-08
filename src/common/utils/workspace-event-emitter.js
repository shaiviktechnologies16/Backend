import { EventEmitter } from "events";

export const workspaceRealtimeEmitter = new EventEmitter();
workspaceRealtimeEmitter.setMaxListeners(200);
