"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalState = void 0;
let running = false;
let statusItem;
let airTerminal;
let extContext;
exports.GlobalState = {
    isRunning: () => running,
    setRunning: (v) => { running = v; },
    getStatusItem: () => statusItem,
    setStatusItem: (v) => { statusItem = v; },
    getAirTerminal: () => airTerminal,
    setAirTerminal: (v) => { airTerminal = v; },
    getContext: () => extContext,
    setContext: (v) => { extContext = v; }
};
