"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const openai_1 = __importDefault(require("./services/openai"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const CONFIG_FILE = path.join(electron_1.app.getPath('userData'), 'config.json');
console.log(CONFIG_FILE);
let config = null;
let mainWindow = null;
let screenshotQueue = [];
let isProcessing = false;
const MAX_SCREENSHOTS = 4;
const SCREENSHOT_DIR = path.join(electron_1.app.getPath('temp'), 'screenshots');
async function ensureScreenshotDir() {
    try {
        await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    }
    catch (error) {
        console.error('Error creating screenshot directory:', error);
    }
}
async function loadConfig() {
    try {
        // First try loading from environment variables
        const envApiKey = process.env.OPENAI_API_KEY;
        const envLanguage = process.env.APP_LANGUAGE;
        if (envApiKey && envLanguage) {
            const envConfig = {
                apiKey: envApiKey,
                language: envLanguage
            };
            openai_1.default.updateConfig(envConfig);
            return envConfig;
        }
        // If env vars not found, try loading from config file
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        const loadedConfig = JSON.parse(data);
        if (loadedConfig && loadedConfig.apiKey && loadedConfig.language) {
            openai_1.default.updateConfig(loadedConfig);
            return loadedConfig;
        }
        return null;
    }
    catch (error) {
        console.error('Error loading config:', error);
        return null;
    }
}
async function saveConfig(newConfig) {
    try {
        if (!newConfig.apiKey || !newConfig.language) {
            throw new Error('Invalid configuration');
        }
        await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
        config = newConfig;
        // Update OpenAI service with new config
        openai_1.default.updateConfig(newConfig);
    }
    catch (error) {
        console.error('Error saving config:', error);
        throw error;
    }
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
            preload: path.join(__dirname, 'preload.js')
        }
    });
    // Open DevTools by default in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    // Register DevTools shortcut
    electron_1.globalShortcut.register('CommandOrControl+Shift+I', () => {
        if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
        }
    });
    // Enable content protection to prevent screen capture
    mainWindow.setContentProtection(true);
    // Platform specific enhancements for macOS
    if (process.platform === 'darwin') {
        mainWindow.setHiddenInMissionControl(true);
        mainWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true
        });
        mainWindow.setAlwaysOnTop(true, "floating");
    }
    // Load the index.html file from the dist directory
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
    // Register global shortcuts
    registerShortcuts();
}
function registerShortcuts() {
    // Screenshot & Processing shortcuts
    electron_1.globalShortcut.register('CommandOrControl+H', handleTakeScreenshot);
    electron_1.globalShortcut.register('CommandOrControl+Enter', handleProcessScreenshots);
    electron_1.globalShortcut.register('CommandOrControl+R', handleResetQueue);
    electron_1.globalShortcut.register('CommandOrControl+Q', () => electron_1.app.quit());
    // Window visibility
    electron_1.globalShortcut.register('CommandOrControl+B', handleToggleVisibility);
    // Window movement
    electron_1.globalShortcut.register('CommandOrControl+Left', () => moveWindow('left'));
    electron_1.globalShortcut.register('CommandOrControl+Right', () => moveWindow('right'));
    electron_1.globalShortcut.register('CommandOrControl+Up', () => moveWindow('up'));
    electron_1.globalShortcut.register('CommandOrControl+Down', () => moveWindow('down'));
    // Config shortcut
    electron_1.globalShortcut.register('CommandOrControl+P', () => {
        mainWindow?.webContents.send('show-config');
    });
}
async function captureScreenshot() {
    if (process.platform === 'darwin') {
        const tmpPath = path.join(SCREENSHOT_DIR, `${Date.now()}.png`);
        await execFileAsync('screencapture', ['-x', tmpPath]);
        const buffer = await fs.readFile(tmpPath);
        await fs.unlink(tmpPath);
        return buffer;
    }
    else {
        // Windows implementation
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
        await execFileAsync('powershell', ['-command', script]);
        const buffer = await fs.readFile(tmpPath);
        await fs.unlink(tmpPath);
        return buffer;
    }
}
async function handleTakeScreenshot() {
    if (screenshotQueue.length >= MAX_SCREENSHOTS)
        return;
    try {
        // Hide window before taking screenshot
        mainWindow?.hide();
        await new Promise(resolve => setTimeout(resolve, 100));
        const buffer = await captureScreenshot();
        const id = Date.now();
        const screenshotPath = path.join(SCREENSHOT_DIR, `${id}.png`);
        await fs.writeFile(screenshotPath, buffer);
        const preview = `data:image/png;base64,${buffer.toString('base64')}`;
        const screenshot = { id, preview, path: screenshotPath };
        screenshotQueue.push(screenshot);
        mainWindow?.show();
        mainWindow?.webContents.send('screenshot-taken', screenshot);
    }
    catch (error) {
        console.error('Error taking screenshot:', error);
        mainWindow?.show();
    }
}
async function handleProcessScreenshots() {
    if (isProcessing || screenshotQueue.length === 0)
        return;
    isProcessing = true;
    mainWindow?.webContents.send('processing-started');
    try {
        const result = await openai_1.default.processScreenshots(screenshotQueue);
        // Check if processing was cancelled
        if (!isProcessing)
            return;
        mainWindow?.webContents.send('processing-complete', JSON.stringify(result));
    }
    catch (error) {
        console.error('Error processing screenshots:', error);
        // Check if processing was cancelled
        if (!isProcessing)
            return;
        // Extract the most relevant error message
        let errorMessage = 'Error processing screenshots';
        if (error?.error?.message) {
            errorMessage = error.error.message;
        }
        else if (error?.message) {
            errorMessage = error.message;
        }
        mainWindow?.webContents.send('processing-complete', JSON.stringify({
            error: errorMessage,
            approach: 'Error occurred while processing',
            code: 'Error: ' + errorMessage,
            timeComplexity: 'N/A',
            spaceComplexity: 'N/A'
        }));
    }
    finally {
        isProcessing = false;
    }
}
async function handleResetQueue() {
    // Cancel any ongoing processing
    if (isProcessing) {
        isProcessing = false;
        mainWindow?.webContents.send('processing-complete', JSON.stringify({
            approach: 'Processing cancelled',
            code: '',
            timeComplexity: '',
            spaceComplexity: ''
        }));
    }
    // Delete all screenshot files
    for (const screenshot of screenshotQueue) {
        try {
            await fs.unlink(screenshot.path);
        }
        catch (error) {
            console.error('Error deleting screenshot:', error);
        }
    }
    screenshotQueue = [];
    mainWindow?.webContents.send('queue-reset');
}
function handleToggleVisibility() {
    if (!mainWindow)
        return;
    if (mainWindow.isVisible()) {
        mainWindow.hide();
    }
    else {
        mainWindow.show();
    }
}
function moveWindow(direction) {
    if (!mainWindow)
        return;
    const [x, y] = mainWindow.getPosition();
    const moveAmount = 50;
    switch (direction) {
        case 'left':
            mainWindow.setPosition(x - moveAmount, y);
            break;
        case 'right':
            mainWindow.setPosition(x + moveAmount, y);
            break;
        case 'up':
            mainWindow.setPosition(x, y - moveAmount);
            break;
        case 'down':
            mainWindow.setPosition(x, y + moveAmount);
            break;
    }
}
// This method will be called when Electron has finished initialization
electron_1.app.whenReady().then(async () => {
    await ensureScreenshotDir();
    // Load config before creating window
    config = await loadConfig();
    createWindow();
    electron_1.app.on('activate', function () {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
    handleResetQueue();
});
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// IPC Handlers
electron_1.ipcMain.handle('take-screenshot', handleTakeScreenshot);
electron_1.ipcMain.handle('process-screenshots', handleProcessScreenshots);
electron_1.ipcMain.handle('reset-queue', handleResetQueue);
// Window control events
electron_1.ipcMain.on('minimize-window', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow?.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.on('close-window', () => {
    mainWindow?.close();
});
electron_1.ipcMain.on('quit-app', () => {
    electron_1.app.quit();
});
electron_1.ipcMain.on('toggle-visibility', handleToggleVisibility);
// Add these IPC handlers before app.whenReady()
electron_1.ipcMain.handle('get-config', async () => {
    try {
        if (!config) {
            config = await loadConfig();
        }
        return config;
    }
    catch (error) {
        console.error('Error getting config:', error);
        return null;
    }
});
electron_1.ipcMain.handle('save-config', async (_, newConfig) => {
    try {
        await saveConfig(newConfig);
        return true;
    }
    catch (error) {
        console.error('Error in save-config handler:', error);
        return false;
    }
});
