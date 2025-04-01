import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  minimize: () => ipcRenderer.send("minimize-window"),
  maximize: () => ipcRenderer.send("maximize-window"),
  close: () => ipcRenderer.send("close-window"),
  quit: () => ipcRenderer.send("quit-app"),

  takeScreenshot: () => ipcRenderer.invoke("take-screenshot"),
  processScreenshots: () => ipcRenderer.invoke("process-screenshots"),
  resetQueue: () => ipcRenderer.invoke("reset-queue"),
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config: {
    apiKey: string;
    language: string;
    provider: string;
  }) => ipcRenderer.invoke("save-config", config),

  toggleVisibility: () => ipcRenderer.send("toggle-visibility"),

  onProcessingComplete: (callback: (result: string) => void) => {
    ipcRenderer.on("processing-complete", (_, result) => callback(result));
  },
  onScreenshotTaken: (callback: (data: any) => void) => {
    ipcRenderer.on("screenshot-taken", (_, data) => callback(data));
  },
  onProcessingStarted: (callback: () => void) => {
    ipcRenderer.on("processing-started", () => callback());
  },
  onQueueReset: (callback: () => void) => {
    ipcRenderer.on("queue-reset", () => callback());
  },
  onShowConfig: (callback: () => void) => {
    ipcRenderer.on("show-config", () => callback());
  },
});
