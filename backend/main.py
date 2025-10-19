import Millennium, PluginUtils # type: ignore
import os
import json

logger = PluginUtils.Logger()

class PluginConfig:
    """Manages plugin configuration file operations and caching"""
    
    def __init__(self):
        """Initialize plugin configuration with default values"""
        self.config_file = None
        self.config = {"globalLaunchOptions": "", "excludedGameIds": ""}
        self._find_config_path()
        self.load_config()
    
    def _find_config_path(self):
        """Locate the plugin's config.json file in the plugin root directory"""
        try:
            # Try to find the plugin directory (go up from backend to plugin root)
            plugin_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.config_file = os.path.join(plugin_dir, "config.json")
            logger.log(f"Config file path: {self.config_file}")
        except Exception as e:
            logger.error(f"Failed to determine config path: {e}")
            self.config_file = "config.json"
    
    def load_config(self):
        """Load configuration from config.json file"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    file_config = json.load(f)
                    self.config.update(file_config)
                    logger.log("Configuration loaded from file")
            else:
                # Create default config file
                self.save_config()
                logger.log("Created default configuration file")
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
    
    def save_config(self):
        """Save current configuration to config.json file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
            logger.log("Configuration saved to file")
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
    
    def get(self, key, default=None):
        """Get a configuration value by key"""
        return self.config.get(key, default)

plugin_config = PluginConfig()

class Backend:
    """Backend API methods for frontend-backend communication"""
    
    @staticmethod
    def get_config():
        """Get complete plugin configuration as JSON string"""
        return json.dumps(plugin_config.config, indent=2)
    
    @staticmethod
    def get_hook_config():
        """
        Get configuration for frontend hooks
        Always reloads from file to ensure real-time configuration changes
        """
        try:
            # Reload config from file to get latest changes
            plugin_config.load_config()
            
            # Return the values needed by hooks
            hook_config = {
                "globalLaunchOptions": plugin_config.config.get("globalLaunchOptions", ""),
                "excludedGameIds": plugin_config.config.get("excludedGameIds", "")
            }
            
            return json.dumps(hook_config)
        except Exception as e:
            logger.error(f"Failed to get hook config: {e}")
            # Return safe defaults on error
            return json.dumps({
                "globalLaunchOptions": "",
                "excludedGameIds": ""
            })
    
    @staticmethod
    def set_config(config_json):
        """Update plugin configuration from JSON string"""
        try:
            new_config = json.loads(config_json)
            plugin_config.config.update(new_config)
            plugin_config.save_config()
            return True
        except Exception as e:
            logger.error(f"Failed to update config: {e}")
            return False
    
    @staticmethod
    def reload_config():
        try:
            plugin_config.load_config()
            return True
        except Exception as e:
            logger.error(f"Failed to reload config: {e}")
            return False

class Plugin:
    def _front_end_loaded(self):
        pass

    def _load(self):
        logger.log("Plugin ready!")
        Millennium.ready()

    def _unload(self):
        pass