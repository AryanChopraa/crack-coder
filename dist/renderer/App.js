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
const react_1 = __importStar(require("react"));
require("./App.css");
const ConfigScreen_1 = __importDefault(require("./ConfigScreen"));
const App = () => {
    const [isProcessing, setIsProcessing] = (0, react_1.useState)(false);
    const [result, setResult] = (0, react_1.useState)(null);
    const [screenshots, setScreenshots] = (0, react_1.useState)([]);
    const [showConfig, setShowConfig] = (0, react_1.useState)(false);
    const [config, setConfig] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const loadConfig = async () => {
            const savedConfig = await window.electron.getConfig();
            setConfig(savedConfig);
            if (!savedConfig) {
                setShowConfig(true);
            }
        };
        loadConfig();
    }, []);
    (0, react_1.useEffect)(() => {
        console.log('Setting up event listeners...');
        // Listen for show config events
        window.electron.onShowConfig(() => {
            setShowConfig(prev => !prev);
        });
        // Listen for processing started events
        window.electron.onProcessingStarted(() => {
            console.log('Processing started');
            setIsProcessing(true);
            setResult(null);
        });
        // Keyboard event listener
        const handleKeyDown = async (event) => {
            console.log('Key pressed:', event.key);
            // Check if Cmd/Ctrl is pressed
            const isCmdOrCtrl = event.metaKey || event.ctrlKey;
            switch (event.key.toLowerCase()) {
                case 'h':
                    console.log('Screenshot hotkey pressed');
                    await handleTakeScreenshot();
                    break;
                case 'enter':
                    console.log('Process hotkey pressed');
                    await handleProcess();
                    break;
                case 'r':
                    console.log('Reset hotkey pressed');
                    await handleReset();
                    break;
                case 'p':
                    if (isCmdOrCtrl) {
                        console.log('Toggle config hotkey pressed');
                        setShowConfig(prev => !prev);
                    }
                    break;
                case 'b':
                    if (isCmdOrCtrl) {
                        console.log('Toggle visibility hotkey pressed');
                        // Toggle visibility logic here
                    }
                    break;
                case 'q':
                    if (isCmdOrCtrl) {
                        console.log('Quit hotkey pressed');
                        handleQuit();
                    }
                    break;
            }
        };
        // Add keyboard event listener
        window.addEventListener('keydown', handleKeyDown);
        // Listen for processing complete events
        window.electron.onProcessingComplete((resultStr) => {
            console.log('Processing complete. Result:', resultStr);
            try {
                const parsedResult = JSON.parse(resultStr);
                setResult(parsedResult);
            }
            catch (error) {
                console.error('Error parsing result:', error);
            }
            setIsProcessing(false);
        });
        // Listen for new screenshots
        window.electron.onScreenshotTaken((screenshot) => {
            console.log('New screenshot taken:', screenshot);
            setScreenshots(prev => {
                const newScreenshots = [...prev, screenshot];
                console.log('Updated screenshots array:', newScreenshots);
                return newScreenshots;
            });
        });
        // Listen for queue reset
        window.electron.onQueueReset(() => {
            console.log('Queue reset triggered');
            setScreenshots([]);
            setResult(null);
        });
        // Cleanup
        return () => {
            console.log('Cleaning up event listeners...');
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
            }, 5000); // Hide error after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [error]);
    const handleTakeScreenshot = async () => {
        console.log('Taking screenshot, current count:', screenshots.length);
        if (screenshots.length >= 4) {
            console.log('Maximum screenshots reached');
            return;
        }
        try {
            await window.electron.takeScreenshot();
            console.log('Screenshot taken successfully');
        }
        catch (error) {
            console.error('Error taking screenshot:', error);
        }
    };
    const handleProcess = async () => {
        console.log('Starting processing. Current screenshots:', screenshots);
        if (screenshots.length === 0) {
            console.log('No screenshots to process');
            return;
        }
        setIsProcessing(true);
        setResult(null);
        setError(null);
        try {
            await window.electron.processScreenshots();
            console.log('Process request sent successfully');
        }
        catch (error) {
            console.error('Error processing screenshots:', error);
            setError(error?.message || 'Error processing screenshots');
            setIsProcessing(false);
        }
    };
    const handleReset = async () => {
        console.log('Resetting queue...');
        await window.electron.resetQueue();
    };
    const handleQuit = () => {
        console.log('Quitting application...');
        window.electron.quit();
    };
    const handleConfigSave = async (newConfig) => {
        try {
            const success = await window.electron.saveConfig(newConfig);
            if (success) {
                setConfig(newConfig);
                setShowConfig(false);
                setError(null);
            }
            else {
                setError('Failed to save configuration');
            }
        }
        catch (error) {
            console.error('Error saving configuration:', error);
            setError(error?.message || 'Error saving configuration');
        }
    };
    // Log state changes
    (0, react_1.useEffect)(() => {
        console.log('State update:', {
            isProcessing,
            result,
            screenshotCount: screenshots.length
        });
    }, [isProcessing, result, screenshots]);
    const formatCode = (code) => {
        return code.split('\n').map((line, index) => (react_1.default.createElement("div", { key: index, className: "code-line" },
            react_1.default.createElement("span", { className: "line-number" }, index + 1),
            line)));
    };
    return (react_1.default.createElement("div", { className: "app" },
        error && (react_1.default.createElement("div", { className: "error-bar" },
            react_1.default.createElement("span", null, error),
            react_1.default.createElement("button", { onClick: () => setError(null) }, "\u00D7"))),
        showConfig && (react_1.default.createElement(ConfigScreen_1.default, { onSave: handleConfigSave, initialConfig: config || undefined })),
        react_1.default.createElement("div", { className: "shortcuts-row" },
            react_1.default.createElement("div", { className: "shortcut" },
                react_1.default.createElement("code", null, "\u2318/Ctrl + H"),
                " Screenshot"),
            react_1.default.createElement("div", { className: "shortcut" },
                react_1.default.createElement("code", null, "\u2318/Ctrl + \u21B5"),
                " Solution"),
            react_1.default.createElement("div", { className: "shortcut" },
                react_1.default.createElement("code", null, "\u2318/Ctrl + R"),
                " Reset"),
            react_1.default.createElement("div", { className: "hover-shortcuts" },
                react_1.default.createElement("div", { className: "hover-shortcuts-content" },
                    react_1.default.createElement("div", { className: "shortcut" },
                        react_1.default.createElement("code", null, "\u2318/Ctrl + B"),
                        " Show/Hide"),
                    react_1.default.createElement("div", { className: "shortcut" },
                        react_1.default.createElement("code", null, "\u2318/Ctrl + P"),
                        " Settings"),
                    react_1.default.createElement("div", { className: "shortcut" },
                        react_1.default.createElement("code", null, "\u2318/Ctrl + Q"),
                        " Quit"),
                    react_1.default.createElement("div", { className: "shortcut" },
                        react_1.default.createElement("code", null, "\u2318/Ctrl + Arrow Keys"),
                        " Move Around")))),
        react_1.default.createElement("div", { className: "preview-row" }, screenshots.map(screenshot => (react_1.default.createElement("div", { key: screenshot.id, className: "preview-item" },
            react_1.default.createElement("img", { src: screenshot.preview, alt: "Screenshot preview" }))))),
        react_1.default.createElement("div", { className: "status-row" }, isProcessing ? (react_1.default.createElement("div", { className: "processing" },
            "Processing... (",
            screenshots.length,
            " screenshots)")) : result ? (react_1.default.createElement("div", { className: "result" },
            react_1.default.createElement("div", { className: "solution-section" },
                react_1.default.createElement("h3", null, "Approach"),
                react_1.default.createElement("p", null, result.approach)),
            react_1.default.createElement("div", { className: "solution-section" },
                react_1.default.createElement("h3", null, "Solution"),
                react_1.default.createElement("pre", null,
                    react_1.default.createElement("code", null, formatCode(result.code)))),
            react_1.default.createElement("div", { className: "solution-section" },
                react_1.default.createElement("h3", null, "Complexity"),
                react_1.default.createElement("p", null,
                    "Time: ",
                    result.timeComplexity),
                react_1.default.createElement("p", null,
                    "Space: ",
                    result.spaceComplexity)),
            react_1.default.createElement("div", { className: "hint" }, "(Press \u2318/Ctrl + R to reset)"))) : (react_1.default.createElement("div", { className: "empty-status" }, screenshots.length > 0
            ? `Press ⌘/Ctrl + ↵ to process ${screenshots.length} screenshot${screenshots.length > 1 ? 's' : ''}`
            : 'Press ⌘/Ctrl + H to take a screenshot')))));
};
exports.default = App;
