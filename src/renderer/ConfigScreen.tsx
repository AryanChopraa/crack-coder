import React, { useState, useEffect } from "react";
import "./ConfigScreen.css";

interface ConfigProps {
  onSave: (config: {
    apiKey: string;
    language: string;
    provider: string;
  }) => void;
  initialConfig?: { apiKey: string; language: string; provider: string };
}

const ConfigScreen: React.FC<ConfigProps> = ({ onSave, initialConfig }) => {
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || "");
  const [geminiapiKey, setGeminiApiKey] = useState(initialConfig?.apiKey || "");
  const [language, setLanguage] = useState(initialConfig?.language || "Python");
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    initialConfig?.provider || "openai"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProvider === "openai") {
      onSave({ apiKey: apiKey.trim(), language, provider: selectedProvider });
    } else if (selectedProvider === "gemini") {
      onSave({
        apiKey: geminiapiKey.trim(),
        language,
        provider: selectedProvider,
      });
    }
  };

  const handleClear = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey("");
    setGeminiApiKey("");
  };

  return (
    <div className="config-screen">
      <div className="config-container">
        <h2>Configuration</h2>
        <div className="form-group">
          <label>Select AI Provider</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="provider"
                value="openai"
                checked={selectedProvider === "openai"}
                onChange={(e) => setSelectedProvider(e.target.value)}
              />
              OpenAI
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="provider"
                value="gemini"
                checked={selectedProvider === "gemini"}
                onChange={(e) => setSelectedProvider(e.target.value)}
              />
              Google Gemini
            </label>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          {selectedProvider === "openai" && (
            <div className="form-group">
              <label htmlFor="apiKey">OpenAI API Key</label>
              <div className="api-key-input">
                <input
                  type={showApiKey ? "text" : "password"}
                  id="apiKey"
                  name="apiKey"
                  placeholder="Enter your OpenAI API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}
          {selectedProvider === "gemini" && (
            <div className="form-group">
              <label htmlFor="googleApiKey">Google Gemini API Key</label>
              <div className="api-key-input">
                <input
                  type={showApiKey ? "text" : "password"}
                  id="googleApiKey"
                  name="googleApiKey"
                  placeholder="Enter your Google Gemini API key"
                  value={geminiapiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
              </div>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="language">Preferred Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
            >
              <option value="Python">Python</option>
              <option value="JavaScript">JavaScript</option>
              <option value="TypeScript">TypeScript</option>
              <option value="Java">Java</option>
              <option value="C++">C++</option>
              <option value="C">C</option>
              <option value="Go">Go</option>
              <option value="Rust">Rust</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="save-button" onClick={handleClear}>
              Clear Configuration
            </button>
            <button type="submit" className="save-button">
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigScreen;
