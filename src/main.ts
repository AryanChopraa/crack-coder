import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import * as path from "path";
import * as fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import openaiService from "./services/openai";
import geminiService from "./services/gemini";

const execFileAsync = promisify(execFile);

interface Screenshot {
  id: number;
  preview: string;
  path: string;
}

const CONFIG_FILE = path.join(app.getPath("userData"), "config.json");
console.log(CONFIG_FILE);

interface Config {
  apiKey: string;
  language: string;
  provider: string;
}

let config: Config | null = null;

let mainWindow: BrowserWindow | null = null;
let screenshotQueue: Screenshot[] = [];
let isProcessing = false;
const MAX_SCREENSHOTS = 4;
const SCREENSHOT_DIR = path.join(app.getPath("temp"), "screenshots");

async function ensureScreenshotDir() {
  try {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating screenshot directory:", error);
  }
}

async function loadConfig(): Promise<Config | null> {
  try {
    const envApiKey = process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY;
    const envLanguage = process.env.APP_LANGUAGE;
    const envProvider = process.env.AI_PROVIDER || "openai";

    if (envApiKey && envLanguage) {
      const envConfig = {
        apiKey: envApiKey,
        language: envLanguage,
        provider: envProvider,
      };

      if (envProvider === "openai") {
        openaiService.updateConfig(envConfig);
      } else if (envProvider === "gemini") {
        geminiService.updateConfig(envConfig);
      }

      return envConfig;
    }

    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    const loadedConfig = JSON.parse(data);
    if (loadedConfig && loadedConfig.apiKey && loadedConfig.language) {
      // Update the appropriate service based on provider
      if (loadedConfig.provider === "openai") {
        openaiService.updateConfig(loadedConfig);
      } else if (loadedConfig.provider === "gemini") {
        geminiService.updateConfig(loadedConfig);
      }
      return loadedConfig;
    }
    return null;
  } catch (error) {
    console.error("Error loading config:", error);
    return null;
  }
}

async function saveConfig(newConfig: Config): Promise<void> {
  try {
    if (!newConfig.apiKey || !newConfig.language || !newConfig.provider) {
      throw new Error("Invalid configuration");
    }
    await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    config = newConfig;

    if (newConfig.provider === "openai") {
      openaiService.updateConfig(newConfig);
    } else if (newConfig.provider === "gemini") {
      geminiService.updateConfig(newConfig);
    }
  } catch (error) {
    console.error("Error saving config:", error);
    throw error;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  globalShortcut.register("CommandOrControl+Shift+I", () => {
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.setContentProtection(true);

  if (process.platform === "darwin") {
    mainWindow.setHiddenInMissionControl(true);
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    mainWindow.setAlwaysOnTop(true, "floating");
  }

  mainWindow.loadFile(path.join(__dirname, "../dist/renderer/index.html"));

  registerShortcuts();
}

function registerShortcuts() {
  globalShortcut.register("CommandOrControl+H", handleTakeScreenshot);
  globalShortcut.register("CommandOrControl+Enter", handleProcessScreenshots);
  globalShortcut.register("CommandOrControl+R", handleResetQueue);
  globalShortcut.register("CommandOrControl+Q", () => app.quit());

  globalShortcut.register("CommandOrControl+B", handleToggleVisibility);

  globalShortcut.register("CommandOrControl+Left", () => moveWindow("left"));
  globalShortcut.register("CommandOrControl+Right", () => moveWindow("right"));
  globalShortcut.register("CommandOrControl+Up", () => moveWindow("up"));
  globalShortcut.register("CommandOrControl+Down", () => moveWindow("down"));

  globalShortcut.register("CommandOrControl+P", () => {
    mainWindow?.webContents.send("show-config");
  });
}

async function captureScreenshot(): Promise<Buffer> {
  if (process.platform === "darwin") {
    const tmpPath = path.join(SCREENSHOT_DIR, `${Date.now()}.png`);
    await execFileAsync("screencapture", ["-x", tmpPath]);
    const buffer = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath);
    return buffer;
  } else {
    const tmpPath = path.join(SCREENSHOT_DIR, `${Date.now()}.png`);
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
      $bitmap.Save('${tmpPath.replace(/\\/g, "\\\\")}')
      $graphics.Dispose()
      $bitmap.Dispose()
    `;
    await execFileAsync("powershell", ["-command", script]);
    const buffer = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath);
    return buffer;
  }
}

async function handleTakeScreenshot() {
  if (screenshotQueue.length >= MAX_SCREENSHOTS) return;

  try {
    mainWindow?.hide();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const buffer = await captureScreenshot();
    const id = Date.now();
    const screenshotPath = path.join(SCREENSHOT_DIR, `${id}.png`);

    await fs.writeFile(screenshotPath, buffer);
    const preview = `data:image/png;base64,${buffer.toString("base64")}`;

    const screenshot = { id, preview, path: screenshotPath };
    screenshotQueue.push(screenshot);

    mainWindow?.show();
    mainWindow?.webContents.send("screenshot-taken", screenshot);
  } catch (error) {
    console.error("Error taking screenshot:", error);
    mainWindow?.show();
  }
}

async function handleProcessScreenshots() {
  if (isProcessing || screenshotQueue.length === 0) return;

  isProcessing = true;
  mainWindow?.webContents.send("processing-started");

  try {
    let result;

    if (!config) {
      throw new Error(
        "No configuration found. Please set up your API key first."
      );
    }

    if (config.provider === "openai") {
      result = await openaiService.processScreenshots(screenshotQueue);
    } else if (config.provider === "gemini") {
      result = await geminiService.processScreenshots(screenshotQueue);
    } else {
      throw new Error("Invalid provider configuration");
    }

    if (!isProcessing) return;
    mainWindow?.webContents.send("processing-complete", JSON.stringify(result));
  } catch (error: any) {
    console.error("Error processing screenshots:", error);
    if (!isProcessing) return;

    let errorMessage = "Error processing screenshots";
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    mainWindow?.webContents.send(
      "processing-complete",
      JSON.stringify({
        error: errorMessage,
        approach: "Error occurred while processing",
        code: "Error: " + errorMessage,
        timeComplexity: "N/A",
        spaceComplexity: "N/A",
      })
    );
  } finally {
    isProcessing = false;
  }
}

async function handleResetQueue() {
  if (isProcessing) {
    isProcessing = false;
    mainWindow?.webContents.send(
      "processing-complete",
      JSON.stringify({
        approach: "Processing cancelled",
        code: "",
        timeComplexity: "",
        spaceComplexity: "",
      })
    );
  }

  for (const screenshot of screenshotQueue) {
    try {
      await fs.unlink(screenshot.path);
    } catch (error) {
      console.error("Error deleting screenshot:", error);
    }
  }

  screenshotQueue = [];
  mainWindow?.webContents.send("queue-reset");
}

function handleToggleVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
  }
}

function moveWindow(direction: "left" | "right" | "up" | "down") {
  if (!mainWindow) return;

  const [x, y] = mainWindow.getPosition();
  const moveAmount = 50;

  switch (direction) {
    case "left":
      mainWindow.setPosition(x - moveAmount, y);
      break;
    case "right":
      mainWindow.setPosition(x + moveAmount, y);
      break;
    case "up":
      mainWindow.setPosition(x, y - moveAmount);
      break;
    case "down":
      mainWindow.setPosition(x, y + moveAmount);
      break;
  }
}

app.whenReady().then(async () => {
  await ensureScreenshotDir();
  config = await loadConfig();
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  handleResetQueue();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("take-screenshot", handleTakeScreenshot);
ipcMain.handle("process-screenshots", handleProcessScreenshots);
ipcMain.handle("reset-queue", handleResetQueue);

ipcMain.on("minimize-window", () => {
  mainWindow?.minimize();
});

ipcMain.on("maximize-window", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on("close-window", () => {
  mainWindow?.close();
});

ipcMain.on("quit-app", () => {
  app.quit();
});

ipcMain.on("toggle-visibility", handleToggleVisibility);

ipcMain.handle("get-config", async () => {
  try {
    if (!config) {
      config = await loadConfig();
    }
    return config;
  } catch (error) {
    console.error("Error getting config:", error);
    return null;
  }
});

ipcMain.handle("save-config", async (_, newConfig: Config) => {
  try {
    await saveConfig(newConfig);
    return true;
  } catch (error) {
    console.error("Error in save-config handler:", error);
    return false;
  }
});
