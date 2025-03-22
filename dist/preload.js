"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    minimize: () => electron_1.ipcRenderer.send('minimize-window'),
    maximize: () => electron_1.ipcRenderer.send('maximize-window'),
    close: () => electron_1.ipcRenderer.send('close-window'),
    quit: () => electron_1.ipcRenderer.send('quit-app'),
    takeScreenshot: () => electron_1.ipcRenderer.invoke('take-screenshot'),
    processScreenshots: () => electron_1.ipcRenderer.invoke('process-screenshots'),
    resetQueue: () => electron_1.ipcRenderer.invoke('reset-queue'),
    getConfig: () => electron_1.ipcRenderer.invoke('get-config'),
    saveConfig: (config) => electron_1.ipcRenderer.invoke('save-config', config),
    toggleVisibility: () => electron_1.ipcRenderer.send('toggle-visibility'),
    onProcessingComplete: (callback) => {
        electron_1.ipcRenderer.on('processing-complete', (_, result) => callback(result));
    },
    onScreenshotTaken: (callback) => {
        electron_1.ipcRenderer.on('screenshot-taken', (_, data) => callback(data));
    },
    onProcessingStarted: (callback) => {
        electron_1.ipcRenderer.on('processing-started', () => callback());
    },
    onQueueReset: (callback) => {
        electron_1.ipcRenderer.on('queue-reset', () => callback());
    },
    onShowConfig: (callback) => {
        electron_1.ipcRenderer.on('show-config', () => callback());
    }
});
