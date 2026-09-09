import ZoteroReaderAdapter from "./index.obsidian.reader.js";
import {
	disposeBridge,
	initBridge,
	ObsidianBridge,
	registerChildAPI,
} from "./obsidian-adapter.js";
import { connect, WindowMessenger } from "penpal";

/**
 * -----------------------------------------------------------
 * Bridge with the obsidian
 * -----------------------------------------------------------
 */

(async () => {
	let connection;
	const directBootstrap = window.frameElement?.__OBSIDIAN_BRIDGE__;
	if (typeof directBootstrap === "function") {
		window.__OBSIDIAN_BRIDGE__ = directBootstrap;
	} else {
		const messenger = new WindowMessenger({
			remoteWindow: window.findParentWindow(),
			allowedOrigins: ["*"],
		});
		connection = connect({ messenger });
		const parent = await connection.promise;
		await parent.shakehand();
	}
	{
		initBridge();

		// Populate OBSIDIAN_THEME_VARIABLES from parent so adoptObsidianStyles() works
		if (typeof ObsidianBridge.getObsidianThemeVariables === "function") {
			window.OBSIDIAN_THEME_VARIABLES = ObsidianBridge.getObsidianThemeVariables();
		}

		const readerAdapter = new ZoteroReaderAdapter();
		let destroyed = false;
		const childAPI = {
			async initReader(opts) {
				if (destroyed) return false;
				readerAdapter.on((evt) => ObsidianBridge.handleEvent(evt));

				// Refresh theme variables before each reader init (theme may have changed)
				if (typeof ObsidianBridge.getObsidianThemeVariables === "function") {
					window.OBSIDIAN_THEME_VARIABLES = ObsidianBridge.getObsidianThemeVariables();
				}

				// If the parent passed us an ArrayBuffer, we need to transfer the realm under us
				if (opts.data.buf) {
					const childCopy = new Uint8Array(opts.data.buf.length);
					childCopy.set(opts.data.buf);

					await readerAdapter.createReader({
						...opts,
						data: { buf: childCopy, url: opts.data.url },
					});
				} else {
					await readerAdapter.createReader(opts);
				}
				return true;
			},
			async setColorScheme(colorScheme, obsidianThemeMode) {
				// Refresh theme variables when color scheme changes
				if (typeof ObsidianBridge.getObsidianThemeVariables === "function") {
					window.OBSIDIAN_THEME_VARIABLES = ObsidianBridge.getObsidianThemeVariables();
				}
				readerAdapter.applyColorSchemeForAll(colorScheme, obsidianThemeMode);
				return true;
			},
			async addAnnotation(annotation) {
				readerAdapter.addAnnotation(annotation);
				return true;
			},
			async refreshAnnotations(annotations) {
				readerAdapter.refreshAnnotations(annotations);
				return true;
			},
			async navigate(location) {
				readerAdapter.navigate(location);
				return true;
			},
			async destroy() {
				if (destroyed) return true;
				destroyed = true;
				try {
					await readerAdapter.dispose();
				}
				finally {
					// ZotFlow: The direct child API replaced Penpal RPC after the
					// handshake; release its listener and parent-realm references.
					disposeBridge();
					connection?.destroy();
				}
				return true;
			},
		};

		await registerChildAPI(childAPI);
	}
})();
