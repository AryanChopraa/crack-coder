# CrackCode - Invisible AI-Powered Interview Assistant

A powerful, completely invisible AI tool for solving Coding questions during technical interviews. The tool runs 100% undetectably in the background - no screen recording or monitoring software can identify its presence. 

Open-source Alternative to Interview Coder

## Demo
https://github.com/user-attachments/assets/179701eb-0fcf-4e33-86f3-c92688f508a5



## Features

- 🔒 100% Undetectable - Completely invisible to all screen recording and monitoring software
- 🤖 Real-time AI assistance for solving Coding problems
- 🌐 Support for multiple programming languages
- 🎯 Precise, contextual coding suggestions
- ⚙️ Easy configuration setup


### Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/crackcode.git
   cd crackcode
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Configure environment variables:(Or set these in the Settings ⌘/Ctrl + P )
   - Copy `.env.example` to `.env`
   - Add your Gemini API key
   - Set your preferred programming language

4. Start the Application:
    ```bash
   yarn start
   ```
    

## Prerequisites

- Node.js (v14 or higher) - only for local setup
- yarn (Yarn Package Manager) - only for local setup
- Gemini API key

## Configuration

Create a `.env` file in the root directory with the following settings: ( or Just press ⌘/Ctrl + P and set it up in Settings/Config page)
```env
GEMINI_API_KEY="your-api-key-here"
APP_LANGUAGE="Java"  # Or Python, JavaScript, C++, etc.
```

## Usage

   Start the application:
   ```bash
   npm start   # For local setup
   ```

## Shortcuts

### General Shortcuts

- **Screenshot**: ⌘/Ctrl + H
- **Solution**: ⌘/Ctrl + ↵/Enter
- **Reset**: ⌘/Ctrl + R
- **Show/Hide**: ⌘/Ctrl + B
- **Settings/Config (Configure your preferred coding language and Gemini API key)**: ⌘/Ctrl + P 
- **Quit**: ⌘/Ctrl + Q
- **Move Around**: ⌘/Ctrl + Arrow Keys

## Contributing
We welcome contributions! Please feel free to submit a Pull Request.

## Support
If you find this tool helpful, please consider giving it a star ⭐️
