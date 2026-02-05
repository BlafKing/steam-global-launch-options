<div align="center">

# Global Launch Options Plugin

A Millennium plugin that automatically applies custom launch options to all Steam games.

</div>

## ✨ Features

- **Global Launch Options**: Apply launch options to all games automatically
- **Smart Merging**: Combines global options with existing game-specific launch options
- **Game Exclusions**: Exclude specific games from global options
- **Universal Launch Detection**: Works regardless of launch source (Steam UI, desktop shortcuts, Steam URLs, etc.)
- **Real-time Config**: Edit settings without restarting Steam
- **Zero Interference**: Temporarily applies options during game launch, doesn't permanently modify Steam data

## 🚀 Installation

1. Open Steam with Millennium installed
2. Navigate to **Millennium** → **Plugins**
3. Click **Install a plugin**
4. Click the URL and search for "Global Launch Options"
5. Copy the Plugin ID and click **Download & Install** in Steam
6. Restart Steam when prompted

## ⚙️ Configuration

Configure the plugin directly in Steam through the Millennium settings interface:

1. Open **Millennium Library Manager**
2. Click on **Global Launch Options**
3. Configure the following settings:

### Settings

- **Global Launch Options**: Launch options to apply to all games (e.g., `MANGOHUD=1 %command%`)
  - Use `%command%` as a placeholder for the game executable
  - You can add environment variables, wrappers, or game arguments
  
- **Excluded Game IDs**: Comma-separated Steam App IDs to exclude from global options (e.g., `730,440,570`)
  - Find App IDs on [SteamDB](https://steamdb.info/)

### Example Configuration

**Enable MangoHUD for all games:**
```
MANGOHUD=1 %command%
```

## 🔧 How It Works

The plugin hooks into Steam's game launch process and:
1. Detects when any game is launched (from Steam UI, desktop shortcuts, Steam URLs, etc.)
2. Gets the current launch options for the game
3. Parses and merges them with your global options
4. Temporarily applies the combined options during launch
5. Restores original options after launch

## 📋 Requirements

- Millennium v2.34.0 or higher
- Steam Client (any recent version)

## 📝 Changelog

### v1.1.0:
    - Changed game detection method so global launch options apply regardless of launch source
      (Steam UI, desktop shortcuts, Steam URLs, etc.)
      
    - Switched from local config file to Millennium's in-steam config UI
    
### v1.0.0:
    - Initial release

## 📄 License

MIT License - See LICENSE file for details