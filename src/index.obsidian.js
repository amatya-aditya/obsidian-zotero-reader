import ZoteroReaderAdapter from "./index.obsidian.reader.js";
import {
	InitBridge,
	ObsidianBridge,
	RegisterChildAPI,
} from "./common/lib/obsidian-adapter";
import { connect, WindowMessenger } from "penpal";

/**
 * -----------------------------------------------------------
 * Bridge with the obsidian
 * -----------------------------------------------------------
 */
(async () => {
	const messenger = new WindowMessenger({
		remoteWindow: window.parent,
		allowedOrigins: ["*"],
	});

	const connection = connect({
		messenger,
	});
	const parent = await connection.promise;
	parent.shakehand().then(() => {
		InitBridge();

		const readerAdapter = new ZoteroReaderAdapter();
		const childAPI = {
			async initReader(opts) {
				readerAdapter.on((evt) => ObsidianBridge.handleEvent(evt));
				await readerAdapter.createReader(opts);
				return true;
			},
			async setColorScheme(colorScheme) {
				readerAdapter.applyColorSchemeForAll(colorScheme);
				return true;
			},
			async updateAnnotation(annotation) {
				await readerAdapter.updateAnnotation(annotation);
				return true;
			},
			async navigate(location) {
				readerAdapter.navigate(location);
				return true;
			},
		};

		RegisterChildAPI(childAPI);
	});
})();
