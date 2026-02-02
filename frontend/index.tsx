import { definePlugin, Field, TextField, IconsModule } from '@steambrew/client';
import React, { useState, useEffect } from 'react';

// JSX namespace declaration for JSX factory
declare global {
	namespace JSX {
		interface IntrinsicElements {
			[elemName: string]: any;
		}
	}
}

// Plugin state tracking
let hooksInjected = false;

// Plugin configuration with defaults
interface PluginConfig {
	globalLaunchOptions: string;
	excludedGameIds: string;
}

let pluginConfig: PluginConfig = {
	globalLaunchOptions: '',
	excludedGameIds: ''
};

const plugin = {
	prefix: '%cGlobal Launch Options%c',
	style: 'color: #cdd6f4; background-color: #746292; padding: 2px 4px; border-radius: 3px;',

	log(...args: any[]): void {
		console.log(plugin.prefix, plugin.style, '', ...args);
	},

	error(...args: any[]): void {
		console.error(plugin.prefix, plugin.style, '', ...args);
	},
};

/**
 * Gets the current configuration from memory
 * @returns Current plugin configuration object
 */
function getCurrentConfig() {
	return pluginConfig;
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
 * Uses RegisterForGameActionUserRequest to detect launches from any source
 */
function injectLaunchHooks() {
	if (hooksInjected) return;
	plugin.log('Injecting launch hooks...');

	// Track current launching app and its original launch options
	let currentLaunchingAppId: string | null = null;
	let originalLaunchOptions: string | null = null;

	// Register for game action user requests - this fires for ALL launch sources
	// (Steam UI, desktop shortcuts, Steam URLs, etc.)
	if (window.SteamClient?.Apps?.RegisterForGameActionUserRequest) {
		window.SteamClient.Apps.RegisterForGameActionUserRequest((_gameActionId, appId, action, _requestedAction, _appId2) => {
			// Only process LaunchApp actions
			if (action !== 'LaunchApp') {
				return;
			}

			const config = getCurrentConfig();

			// Check if app is in exclusion list
			const excludedAppIds = config.excludedGameIds
				? config.excludedGameIds.split(',').map((id: string) => id.trim())
				: [];

			if (excludedAppIds.includes(appId.toString())) {
				currentLaunchingAppId = null;
				plugin.log(`App ${appId} is excluded from global launch options, skipping modifications.`);
			} else {
				currentLaunchingAppId = appId;
				plugin.log(`Launching app ${appId}`);
			}
		});

		plugin.log('Registered for GameActionUserRequest events');
	} else {
		plugin.error('RegisterForGameActionUserRequest API not available');
	}

	// Hook Steam's ContinueGameAction to modify launch options during game start
	if (window.SteamClient && window.SteamClient.Apps && window.SteamClient.Apps.ContinueGameAction) {
		const originalContinueGameAction = window.SteamClient.Apps.ContinueGameAction;
		window.SteamClient.Apps.ContinueGameAction = async function (gameActionId: number, action: string) {
			// Intercept when Steam is creating the game process
			if (action === 'CreatingProcess' && currentLaunchingAppId) {
				const config = getCurrentConfig();

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
						}, 20000);

					} catch (e) {
						plugin.error('Error processing launch options:', e);
					}
				} else {
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
	plugin.log('Launch hooks injected successfully.');
}

/**
 * Settings component for the in-steam config UI
 */
const SingleSetting = (props: { name: keyof PluginConfig; type: string; label: string; description: string; }) => {
	const [textValue, setTextValue] = useState('');

	const saveConfig = () => {
		localStorage.setItem("global_launch_options.config", JSON.stringify(pluginConfig));
		plugin.log('Configuration saved:', pluginConfig);
	};

	useEffect(() => {
		if (props.type === "text") {
			setTextValue(pluginConfig[props.name]);
		}
	}, []);

	if (props.type === "text") {
		return (
			<Field label={props.label} description={props.description} bottomSeparator="standard" focusable>
				<TextField 
					value={textValue} 
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
						const value = e.currentTarget.value;
						setTextValue(value);
						pluginConfig[props.name] = value; 
						saveConfig(); 
					}} 
				/>
			</Field>
		);
	}
	return null;
};

const SettingsContent = () => {
	return (
		<div>
			<SingleSetting 
				name="globalLaunchOptions" 
				type="text" 
				label="Global Launch Options" 
				description="Launch options to apply to all games (e.g., MANGOHUD=1 %command%). Use %command% as placeholder for the game executable." 
			/>
			<SingleSetting 
				name="excludedGameIds" 
				type="text" 
				label="Excluded Game IDs" 
				description="Comma-separated list of Steam App IDs to exclude from global launch options (e.g., 570,730,440)" 
			/>
		</div>
	);
};

/**
 * Millennium plugin entry point
 * Initializes the global launch options plugin
 */
export default definePlugin(() => {
	plugin.log('Global Launch Options plugin initializing...');
	
	// Load configuration from localStorage
	const storedConfig = JSON.parse(localStorage.getItem("global_launch_options.config") || "{}");
	pluginConfig = { ...pluginConfig, ...storedConfig };
	plugin.log('Loaded config:', pluginConfig);
	
	// Inject hooks on plugin load
	setTimeout(injectLaunchHooks, 500);
	
	plugin.log('Plugin initialization complete');

	return {
		title: "Global Launch Options",
		icon: <IconsModule.Settings />,
		content: <SettingsContent />,
	};
});
