export let ObsidianBridge = null;

let registerRef = null;
let tokenRef = null;
let registered = false;

/**
 * Call this once, as early as possible in your child entrypoint,
 *
 * Throws if the parent hasn’t installed the bootstrap yet.
 */
export function InitBridge() {
	const fn = window.__OBSIDIAN_BRIDGE__;
	if (typeof fn !== "function") {
		throw new Error(
			"Bridge bootstrap not installed yet. Ensure the parent installs it before the child script runs."
		);
	}

	const { token, parent, register } = fn();

	// Hide the bootstrap immediately; no callable objects remain on window.
	try {
		delete window.__OBSIDIAN_BRIDGE__;
	} catch {}

	ObsidianBridge = parent;
	registerRef = register;
	tokenRef = token;
}

/**
 * Complete the handshake by giving the Parent our ChildAPI.
 * Fire-and-forget; still returns a Promise for callers that care.
 */
export function RegisterChildAPI(childAPI) {
	if (registered) return Promise.resolve();
	if (!registerRef || !tokenRef) {
		return Promise.reject(
			new Error("Bridge not initialized. Call InitBridge() first.")
		);
	}
	registered = true;
	return registerRef(childAPI, tokenRef).then(() => {});
}
