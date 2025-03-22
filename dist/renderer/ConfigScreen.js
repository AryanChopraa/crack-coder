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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
require("./ConfigScreen.css");
const ConfigScreen = ({ onSave, initialConfig }) => {
    const [apiKey, setApiKey] = (0, react_1.useState)(initialConfig?.apiKey || '');
    const [language, setLanguage] = (0, react_1.useState)(initialConfig?.language || 'Python');
    const [showApiKey, setShowApiKey] = (0, react_1.useState)(false);
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ apiKey: apiKey.trim(), language });
    };
    return (react_1.default.createElement("div", { className: "config-screen" },
        react_1.default.createElement("div", { className: "config-container" },
            react_1.default.createElement("h2", null, "Configuration"),
            react_1.default.createElement("form", { onSubmit: handleSubmit },
                react_1.default.createElement("div", { className: "form-group" },
                    react_1.default.createElement("label", { htmlFor: "apiKey" }, "OpenAI API Key"),
                    react_1.default.createElement("div", { className: "api-key-input" },
                        react_1.default.createElement("input", { type: showApiKey ? "text" : "password", id: "apiKey", value: apiKey, onChange: (e) => setApiKey(e.target.value), required: true, placeholder: "sk-...", spellCheck: "false", autoComplete: "off" }),
                        react_1.default.createElement("button", { type: "button", className: "toggle-visibility", onClick: () => setShowApiKey(!showApiKey) }, showApiKey ? 'Hide' : 'Show'))),
                react_1.default.createElement("div", { className: "form-group" },
                    react_1.default.createElement("label", { htmlFor: "language" }, "Preferred Language"),
                    react_1.default.createElement("select", { id: "language", value: language, onChange: (e) => setLanguage(e.target.value), required: true },
                        react_1.default.createElement("option", { value: "Python" }, "Python"),
                        react_1.default.createElement("option", { value: "JavaScript" }, "JavaScript"),
                        react_1.default.createElement("option", { value: "TypeScript" }, "TypeScript"),
                        react_1.default.createElement("option", { value: "Java" }, "Java"),
                        react_1.default.createElement("option", { value: "C++" }, "C++"),
                        react_1.default.createElement("option", { value: "C" }, "C"),
                        react_1.default.createElement("option", { value: "Go" }, "Go"),
                        react_1.default.createElement("option", { value: "Rust" }, "Rust"))),
                react_1.default.createElement("div", { className: "form-actions" },
                    react_1.default.createElement("button", { type: "submit", className: "save-button" }, "Save Configuration"))))));
};
exports.default = ConfigScreen;
