"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalState = void 0;
let running = false;
let statusItem;
let airTerminal;
let extContext;
let disposables = [];
exports.GlobalState = {
    isRunning: () => running,
    setRunning: (v) => { running = v; },
    getStatusItem: () => statusItem,
    setStatusItem: (v) => { statusItem = v; },
    getAirTerminal: () => airTerminal,
    setAirTerminal: (v) => { airTerminal = v; },
    getContext: () => extContext,
    setContext: (v) => { extContext = v; },
    addDisposable: (d) => { disposables.push(d); },
    removeDisposable: (d) => {
        const idx = disposables.indexOf(d);
        if (idx >= 0)
            disposables.splice(idx, 1);
    },
    disposeAll: () => {
        for (const d of disposables) {
            d.dispose();
        }
        disposables = [];
    }
};
