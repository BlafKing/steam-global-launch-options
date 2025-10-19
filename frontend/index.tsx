import { Millennium, definePlugin } from '@steambrew/client';

// Plugin state tracking
let hooksInjected = false;

// Configuration caching to avoid excessive backend calls
let configCache: any = null;
let lastConfigFetch = 0;
const CONFIG_CACHE_TTL = 1000; // Cache timeout in milliseconds

const plugin = {
	prefix: '%cGlobal Launch Options:%c',
	style: 'color: #cdd6f4; background-color: #cba6f7; padding: 2px 4px; border-radius: 3px;',

	log(...args: any[]): void {
		console.log(plugin.prefix, plugin.style, '', ...args);
	},

	error(...args: any[]): void {
		console.error(plugin.prefix, plugin.style, '', ...args);
	},
};

/**
 * Fetches current plugin configuration from backend with caching
 * @returns Current plugin configuration object
 */
async function fetchCurrentConfig() {
	const now = Date.now();

	// Return cached config if still fresh
	if (configCache && (now - lastConfigFetch) < CONFIG_CACHE_TTL) {
		return configCache;
	}

	try {
		// Fetch live config from backend
		const configJson = await Millennium.callServerMethod("Backend.get_hook_config");
		const config = JSON.parse(configJson);

		// Update cache
		configCache = config;
		lastConfigFetch = now;

		return config;
	} catch (error) {
		plugin.error('Failed to fetch config from backend:', error);

		// Fallback to safe defaults
		const defaultConfig = {
			globalLaunchOptions: '',
			excludedGameIds: ''
		};

		configCache = defaultConfig;
		lastConfigFetch = now;
		return defaultConfig;
	}
}

/**
 * Retrieves current launch options for a specific Steam app
 * Uses Steam's RegisterForAppDetails API to get real-time app data
 * @param appId - Steam App ID as string
 * @returns Promise resolving to current launch options string
 */
async function getCurrentLaunchOptions(appId: string): Promise<string> {
	return new Promise((resolve, reject) => {
		try {
			const numericAppId = parseInt(appId);

			// Register for app details callback
			const unregister = window.SteamClient.Apps.RegisterForAppDetails(numericAppId, (appDetails) => {
				try {
					const launchOptions = appDetails.strLaunchOptions || '';
					unregister.unregister();
					resolve(launchOptions);
				} catch (error) {
					unregister.unregister();
					reject(error);
				}
			});

			// Timeout protection in case callback never fires
			setTimeout(() => {
				unregister.unregister();
				reject(new Error(`Timeout waiting for app details for app ${appId}`));
			}, 5000);

		} catch (error) {
			reject(error);
		}
	});
}

interface ParsedLaunchOptions {
	preCommand: string[];   // Environment vars and wrappers (before %command%)
	postCommand: string[];  // Game executable arguments (after %command%)
	hasCommand: boolean;    // Whether %command% placeholder was present
}

/**
 * Parses launch options string into structured components
 * Launch options format: [pre-command] %command% [post-command]
 * - Pre-command: Environment variables, wrappers (e.g., MANGOHUD=1, gamemoderun)
 * - %command%: Placeholder for game executable (should appear only once)
 * - Post-command: Game arguments (e.g., -novid, -windowed)
 * 
 * @param options - Raw launch options string
 * @returns Parsed launch options structure
 */
function parseLaunchOptions(options: string): ParsedLaunchOptions {
	if (!options.trim()) {
		return { preCommand: [], postCommand: [], hasCommand: false };
	}

	const parts = options.split('%command%');

	if (parts.length === 1) {
		// No %command% found - treat as post-command arguments
		return {
			preCommand: [],
			postCommand: parts[0].trim().split(/\s+/).filter(p => p.length > 0),
			hasCommand: false
		};
	} else if (parts.length === 2) {
		// Normal case: single %command% found
		const preCommand = parts[0].trim().split(/\s+/).filter(p => p.length > 0);
		const postCommand = parts[1].trim().split(/\s+/).filter(p => p.length > 0);

		return {
			preCommand,
			postCommand,
			hasCommand: true
		};
	} else {
		// Multiple %command% found - merge post-command parts
		const preCommand = parts[0].trim().split(/\s+/).filter(p => p.length > 0);
		const postCommand = parts.slice(1).join(' ').trim().split(/\s+/).filter(p => p.length > 0);

		return {
			preCommand,
			postCommand,
			hasCommand: true
		};
	}
}

/**
 * Intelligently merges original app launch options with global launch options
 * Ensures proper ordering and prevents duplicate %command% placeholders
 * 
 * @param originalOptions - Current launch options for the app
 * @param globalOptions - Global launch options to apply
 * @returns Merged launch options string
 */
function mergeLaunchOptions(originalOptions: string, globalOptions: string): string {
	const original = parseLaunchOptions(originalOptions);
	const global = parseLaunchOptions(globalOptions);

	// Combine pre-command parts (environment vars, wrappers)
	const combinedPreCommand = [...original.preCommand, ...global.preCommand];

	// Combine post-command parts (game arguments)
	const combinedPostCommand = [...original.postCommand, ...global.postCommand];

	// Build final launch options string
	let result = '';

	// Add pre-command parts
	if (combinedPreCommand.length > 0) {
		result += combinedPreCommand.join(' ');
	}

	// Add %command% if needed (always include if we have pre-command parts)
	if (original.hasCommand || global.hasCommand || combinedPreCommand.length > 0) {
		result += (result ? ' ' : '') + '%command%';
	}

	// Add post-command parts
	if (combinedPostCommand.length > 0) {
		result += (result ? ' ' : '') + combinedPostCommand.join(' ');
	}

	return result;
}



/**
 * Injects hooks into Steam's game launch process
 * Hooks RunGame to capture app launches and ContinueGameAction to modify launch options
 */
function injectLaunchHooks() {
	if (hooksInjected) return;

	// Track current launching app and its original launch options
	let currentLaunchingAppId: string | null = null;
	let originalLaunchOptions: string | null = null;

	// Hook Steam's RunGame method to capture app launch attempts
	if (window.SteamClient && window.SteamClient.Apps && window.SteamClient.Apps.RunGame) {
		const originalRunGame = window.SteamClient.Apps.RunGame;
		window.SteamClient.Apps.RunGame = async function (appId: string, ...args: any[]) {
			const config = await fetchCurrentConfig();

			// Check if app is in exclusion list
			const excludedAppIds = config.excludedGameIds
				? config.excludedGameIds.split(',').map((id: string) => id.trim())
				: [];

			if (excludedAppIds.includes(appId.toString())) {
				currentLaunchingAppId = null;
			} else {
				currentLaunchingAppId = appId;
			}
			plugin.log(`Launching app ${appId}`);
			return originalRunGame.apply(this, [appId, ...args]);
		};
	}

	// Hook Steam's ContinueGameAction to modify launch options during game start
	if (window.SteamClient && window.SteamClient.Apps && window.SteamClient.Apps.ContinueGameAction) {
		const originalContinueGameAction = window.SteamClient.Apps.ContinueGameAction;
		window.SteamClient.Apps.ContinueGameAction = async function (gameActionId: number, action: string) {

			// Intercept when Steam is creating the game process
			if (action === 'CreatingProcess' && currentLaunchingAppId) {
				const config = await fetchCurrentConfig();

				if (config.globalLaunchOptions) {
					try {
						// Step 1: Fetch original launch options
						originalLaunchOptions = await getCurrentLaunchOptions(currentLaunchingAppId);
						plugin.log(`Original launch options: "${originalLaunchOptions}"`);

						// Step 2: Merge with global options
						const mergedOptions = mergeLaunchOptions(originalLaunchOptions, config.globalLaunchOptions);
						plugin.log(`Launching with: "${mergedOptions}"`);

						// Step 3: Apply merged options for launch
						window.SteamClient.Apps.SetAppLaunchOptions(
							parseInt(currentLaunchingAppId),
							mergedOptions
						);

						// Step 4: Schedule restoration of original options after game starts
						const appIdToRestore = currentLaunchingAppId;
						const optionsToRestore = originalLaunchOptions;

						setTimeout(() => {
							try {
								window.SteamClient.Apps.SetAppLaunchOptions(
									parseInt(appIdToRestore),
									optionsToRestore
								);
							} catch (e) {
								plugin.error('Failed to restore launch options:', e);
							}
						}, 5000); // 5 second delay to allow game startup

					} catch (e) {
						plugin.error('Error processing launch options:', e);
					}
				}
				else {
					plugin.log('No global options configured.');
				}

				// Clean up tracking variables
				currentLaunchingAppId = null;
				originalLaunchOptions = null;
			}

			return originalContinueGameAction.call(this, gameActionId, action);
		};
	}

	hooksInjected = true;
}

/**
 * Millennium plugin entry point
 * Initializes the global launch options plugin
 */
export default definePlugin(() => {
	// Inject hooks on plugin load
	setTimeout(injectLaunchHooks, 500);

	return null; // No UI component needed
});
