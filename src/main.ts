import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import openaiService from './services/openai';

const execFileAsync = promisify(execFile);

interface Screenshot {
  id: number;
  preview: string;
  path: string;
}

let mainWindow: BrowserWindow | null = null;
let screenshotQueue: Screenshot[] = [];
let isProcessing = false;
const MAX_SCREENSHOTS = 4;
const SCREENSHOT_DIR = path.join(app.getPath('temp'), 'screenshots');

async function ensureScreenshotDir() {
  try {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating screenshot directory:', error);
  }
}

function createWindow() {
  // Create the browser window with invisibility and transparency settings
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,           // Removes window chrome/frame
    transparent: true,      // Enables window transparency
    backgroundColor: "#00000000",  // Fully transparent background
    hasShadow: false,      // Removes window shadows
    alwaysOnTop: true,     // Keeps window above others
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
  globalShortcut.register('CommandOrControl+Shift+I', () => {
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
  globalShortcut.register('CommandOrControl+H', handleTakeScreenshot);
  globalShortcut.register('CommandOrControl+Enter', handleProcessScreenshots);
  globalShortcut.register('CommandOrControl+R', handleResetQueue);
  globalShortcut.register('CommandOrControl+Q', () => app.quit());
  
  // Window visibility
  globalShortcut.register('CommandOrControl+B', handleToggleVisibility);
  
  // Window movement
  globalShortcut.register('CommandOrControl+Left', () => moveWindow('left'));
  globalShortcut.register('CommandOrControl+Right', () => moveWindow('right'));
  globalShortcut.register('CommandOrControl+Up', () => moveWindow('up'));
  globalShortcut.register('CommandOrControl+Down', () => moveWindow('down'));
}

async function captureScreenshot(): Promise<Buffer> {
  if (process.platform === 'darwin') {
    const tmpPath = path.join(SCREENSHOT_DIR, `${Date.now()}.png`);
    await execFileAsync('screencapture', ['-x', tmpPath]);
    const buffer = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath);
    return buffer;
  } else {
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
  if (screenshotQueue.length >= MAX_SCREENSHOTS) return;

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
  } catch (error) {
    console.error('Error taking screenshot:', error);
    mainWindow?.show();
  }
}

async function handleProcessScreenshots() {
  if (isProcessing || screenshotQueue.length === 0) return;
  
  isProcessing = true;
  mainWindow?.webContents.send('processing-started');

  try {
    const result = await openaiService.processScreenshots(screenshotQueue);
    // Check if processing was cancelled
    if (!isProcessing) return;
    mainWindow?.webContents.send('processing-complete', JSON.stringify(result));
  } catch (error) {
    console.error('Error processing screenshots:', error);
    // Check if processing was cancelled
    if (!isProcessing) return;
    mainWindow?.webContents.send('processing-complete', JSON.stringify({
      approach: 'Error processing screenshots',
      code: 'Error occurred',
      timeComplexity: 'N/A',
      spaceComplexity: 'N/A'
    }));
  } finally {
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
    } catch (error) {
      console.error('Error deleting screenshot:', error);
    }
  }
  
  screenshotQueue = [];
  mainWindow?.webContents.send('queue-reset');
}

function handleToggleVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
  }
}

function moveWindow(direction: 'left' | 'right' | 'up' | 'down') {
  if (!mainWindow) return;
  
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
app.whenReady().then(async () => {
  await ensureScreenshotDir();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  handleResetQueue();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('take-screenshot', handleTakeScreenshot);
ipcMain.handle('process-screenshots', handleProcessScreenshots);
ipcMain.handle('reset-queue', handleResetQueue);

// Window control events
ipcMain.on('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('close-window', () => {
  mainWindow?.close();
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('toggle-visibility', handleToggleVisibility); 