import ZoteroReaderAdapter from "./index.obsidian.reader.js";
import {
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
window.findParentWindow = () => {
    // Try to get opener (in Obsidian standalone window mode, opener is the BrowserWindow that hosts the View)
    try {
        if (window.parent && window.parent.opener && !window.parent.opener.closed) {
            return window.parent.opener;
        }
    } catch (e) {
        // Capture cross-origin security error
        console.warn("Access to opener blocked:", e);
    }

    // If there is no opener (e.g., in the main interface sidebar, or the opener is closed),
    // or access fails, then fallback to the standard parent
    return window.parent;
}

(async () => {
	const messenger = new WindowMessenger({
		remoteWindow: window.findParentWindow(),
		allowedOrigins: ["*"],
	});

	const connection = connect({
		messenger,
	});
	const parent = await connection.promise;
	parent.shakehand().then(() => {
		initBridge();

		const readerAdapter = new ZoteroReaderAdapter();
		const childAPI = {
			async initReader(opts) {
				readerAdapter.on((evt) => ObsidianBridge.handleEvent(evt));
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
			async setColorScheme(colorScheme) {
				readerAdapter.applyColorSchemeForAll(colorScheme);
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
			}
		};

		registerChildAPI(childAPI);
	});
})();
