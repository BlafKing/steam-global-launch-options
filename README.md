# Global Launch Options Plugin

A Millennium plugin that automatically applies custom launch options to all Steam games.

## Features

- **Global Launch Options**: Apply launch options to all games automatically
- **Smart Merging**: Combines global options with existing game-specific launch options
- **Game Exclusions**: Exclude specific games from global options
- **Real-time Config**: Edit settings without restarting Steam
- **Zero Interference**: Temporarily applies options during game launch, doesn't permanently modify Steam data

## Installation

1. Download the latest release
2. Extract to your Millennium plugins directory
3. Restart Steam or reload Millennium

## Configuration

Edit `config.json` in the plugin directory:

```json
{
  "globalLaunchOptions": "MANGOHUD=1 %command%",
  "excludedGameIds": "730,440"
}
```

### Settings

- **globalLaunchOptions**: Launch options to apply to all games
- **excludedGameIds**: Comma-separated Steam app IDs to exclude

## How It Works

The plugin hooks into Steam's game launch process and:
1. Gets the current launch options for the game
2. Parses and merges them with your global options
3. Temporarily applies the combined options during launch
4. Restores original options after launch

## Requirements

- Millennium (plugin made on v2.30.0+)
- Steam Client (any recent version)

## License

MIT License - See LICENSE file for details