# Global Launch Options Plugin

A Millennium plugin that automatically applies custom launch options to all Steam games.

## ✨ Features

- **Global Launch Options**: Apply launch options to all games automatically
- **Smart Merging**: Combines global options with existing game-specific launch options
- **Game Exclusions**: Exclude specific games from global options
- **Real-time Config**: Edit settings without restarting Steam
- **Zero Interference**: Temporarily applies options during game launch, doesn't permanently modify Steam data

## 🚀 Installation Guide

### Method 1: Millennium Plugin Installer (Recommended)

1. **Copy Plugin ID**
   ```
   (Not yet available)
   ```

2. **Install via Millennium**
   - Open Steam with Millennium installed
   - Navigate to **Millennium** → **Plugins**
   - Click **Install a plugin**
   - Paste the Plugin ID into the installer field
   - Click **Install**
   - Restart Steam when prompted

### Method 2: Build from Source

#### Step 1: Clone the Repository

```bash
git clone https://github.com/BlafKing/steam-global-launch-options.git
cd steam-global-launch-options
```

#### Step 2: Install Dependencies

**Install Node.js dependencies:**

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install project dependencies
pnpm install
```

#### Step 3: Build the Plugin

**For development:**

```bash
pnpm run dev
```

**For production:**

```bash
pnpm run build
```

#### Step 4: Install to Steam

**Option A: Copy to plugins directory**

```bash
# Windows
copy /R . "C:\Program Files (x86)\Steam\plugins\global-launch-options"

# Linux
cp -r . ~/.local/share/millennium/plugins/global-launch-options

# macOS
cp -r . ~/Library/Application\ Support/millennium/plugins/global-launch-options
```

**Option B: Create symbolic link (for development)**

```bash
# Windows (run as Administrator)
mklink /D "C:\Program Files (x86)\Steam\plugins\global-launch-options" "%CD%"

# Linux/macOS
ln -s "$(pwd)" ~/.local/share/millennium/plugins/global-launch-options
```

#### Step 5: Activate Plugin in Steam

1. Completely close Steam (including system tray)
2. Restart Steam
3. Go to **Millennium** → **Plugins**
4. Enable "Global Launch Options"
5. Restart Steam once more

## ⚙️ Configuration

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

## 🔧 How It Works

The plugin hooks into Steam's game launch process and:
1. Gets the current launch options for the game
2. Parses and merges them with your global options
3. Temporarily applies the combined options during launch
4. Restores original options after launch

## 📋 Requirements

- Millennium (plugin made on v2.30.0+)
- Steam Client (any recent version)

## 📄 License

MIT License - See LICENSE file for details