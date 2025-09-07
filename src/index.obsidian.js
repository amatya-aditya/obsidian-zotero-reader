import { WindowMessenger, connect } from "penpal";
import ReaderAdapter from "./index.obsidian.reader.js";

/**
 * -----------------------------------------------------------
 * Load Obsidian App.css but scope with .obsidian-app
 * -----------------------------------------------------------
 */
(() => {
	const processRuleList = (ruleList, prefix) => {
		let out = "";
		for (const rule of Array.from(ruleList || [])) {
			switch (rule.type) {
				case CSSRule.STYLE_RULE: {
					out += prefixStyleRule(rule, prefix) + "\n";
					break;
				}
				case CSSRule.MEDIA_RULE: {
					const inner = processRuleList(rule.cssRules, prefix);
					if (inner.trim())
						out += `@media ${rule.conditionText}{\n${inner}}\n`;
					break;
				}
				case CSSRule.SUPPORTS_RULE: {
					const inner = processRuleList(rule.cssRules, prefix);
					if (inner.trim())
						out += `@supports ${rule.conditionText}{\n${inner}}\n`;
					break;
				}
				case CSSRule.IMPORT_RULE: {
					try {
						out +=
							processRuleList(rule.styleSheet.cssRules, prefix) +
							"\n";
					} catch (e) {
						console.warn("Could not access @import stylesheet:", e);
					}
					break;
				}
				case CSSRule.KEYFRAMES_RULE:
				case CSSRule.FONT_FACE_RULE:
				case CSSRule.PAGE_RULE:
				case CSSRule.COUNTER_STYLE_RULE:
				default: {
					// Copy as-is (we do not prefix @keyframes names, @font-face, etc.)
					out += rule.cssText + "\n";
				}
			}
		}
		return out;
	};

	const prefixStyleRule = (rule, prefix) => {
		const sel = rule.selectorText;

		const block = rule.style.cssText;

		const prefixedSelector = prefixSelectors(sel, prefix);
		return `${prefixedSelector}{${block}}`;
	};

	function splitSelectorList(sel) {
		const out = [];
		let buf = "";
		let p = 0,
			b = 0;
		let str = null,
			esc = false;
		for (let i = 0; i < sel.length; i++) {
			const ch = sel[i];
			if (str) {
				buf += ch;
				if (esc) {
					esc = false;
					continue;
				}
				if (ch === "\\") {
					esc = true;
					continue;
				}
				if (ch === str) str = null;
				continue;
			}
			if (ch === '"' || ch === "'") {
				str = ch;
				buf += ch;
				continue;
			}
			if (ch === "(") {
				p++;
				buf += ch;
				continue;
			}
			if (ch === ")") {
				p = Math.max(0, p - 1);
				buf += ch;
				continue;
			}
			if (ch === "[") {
				b++;
				buf += ch;
				continue;
			}
			if (ch === "]") {
				b = Math.max(0, b - 1);
				buf += ch;
				continue;
			}
			if (ch === "," && p === 0 && b === 0) {
				if (buf.trim()) out.push(buf.trim());
				buf = "";
				continue;
			}
			buf += ch;
		}
		if (buf.trim()) out.push(buf.trim());
		return out;
	}

	// Pull a trailing pseudo-element (e.g., ::after) off the end of a selector
	function extractTrailingPseudo(s) {
		const m = s.match(
			/^(.*?)(::[a-z-]+(?:\([^)]*\))?|:(?:before|after|first-line|first-letter))\s*$/i
		);
		if (m) return { base: m[1].trim(), pseudo: m[2] };
		return { base: s.trim(), pseudo: "" };
	}

	// Safely prefix a selector list.
	// But if a selector starts with html/body/:root, we must replace that leftmost part.
	const prefixSelectors = (selectorText, prefix) => {
		const selectors = splitSelectorList(selectorText);
		const transformed = selectors.map((sel) => {
			const { base, pseudo } = extractTrailingPseudo(sel);

			// Replace a leading html/body/:root with the prefix
			const rooty = /^(?:\s*)(:root|html|body)\b/i;
			let baseWithPrefix;
			if (rooty.test(base)) {
				baseWithPrefix = base.replace(rooty, prefix); // e.g., "body.foo" -> ".scoped.foo"
			} else {
				baseWithPrefix = `${prefix} ${base}`; // e.g., ".scoped .list-bullet:hover"
			}
			return `${baseWithPrefix}${pseudo}`;
		});
		return transformed.join(", ");
	};

	const cssChunks = [];
	const appSheets = Array.from(
		window.parent?.document?.styleSheets || []
	).filter(
		(sheet) =>
			sheet.href &&
			sheet.href.startsWith(window.location.origin) &&
			sheet.href.includes("app.css")
	);

	for (const sheet of appSheets) {
		try {
			cssChunks.push(processRuleList(sheet.cssRules, ".obsidian-app"));
		} catch (e) {
			// Cross-origin or protected stylesheet will throw here.
			console.warn("Could not access stylesheet rules:", e);
		}
	}

	const cssText = cssChunks.join("\n");
	const constructed = new document.defaultView.CSSStyleSheet();
	constructed.replaceSync(cssText);
	document.adoptedStyleSheets = [...document.adoptedStyleSheets, constructed];
	return constructed;
})();

/**
 * -----------------------------------------------------------
 * Extract Obsidian theme variables
 * -----------------------------------------------------------
 */
(() => {
	const extractObsidianStylesVars = () => {
		const extractCSSVariables = (selector) => {
			const variables = {};

			Array.from(window.parent.document.styleSheets)
				.filter(
					(sheet) =>
						sheet.href === null ||
						sheet.href.startsWith(window.location.origin)
				)
				.forEach((sheet) => {
					try {
						Array.from(sheet.cssRules).forEach((rule) => {
							const styleRule = rule;
							if (
								styleRule.selectorText &&
								styleRule.selectorText
									.split(",")
									.map((s) => s.trim())
									.includes(selector) &&
								styleRule.style
							) {
								Array.from(styleRule.style).forEach((name) => {
									if (name.startsWith("--")) {
										variables[name] =
											styleRule.style.getPropertyValue(
												name
											);
									}
								});
							}
						});
					} catch (e) {
						console.warn("Could not access stylesheet rules:", e);
					}
				});

			return variables;
		};
		const bodyVariables = extractCSSVariables("body");
		const themeLightVariables = extractCSSVariables(".theme-light");
		const themeDarkVariables = extractCSSVariables(".theme-dark");

		return {
			":root, :root > .obsidian-app": bodyVariables,
			"html.obsidian-theme-light, html.obsidian-theme-light .obsidian-app":
				themeLightVariables,
			"html.obsidian-theme-dark, html.obsidian-theme-dark .obsidian-app":
				themeDarkVariables,
		};
	};
	// Extract Obsidian theme variables and apply them to the document
	window.OBSIDIAN_THEME_VARIABLES = extractObsidianStylesVars();
	const varsStyle = document.createElement("style");
	varsStyle.textContent = Object.entries(window.OBSIDIAN_THEME_VARIABLES)
		.map(
			([sel, map]) =>
				`${sel}{${Object.entries(map)
					.map(([k, v]) => `${k}:${v};`)
					.join("")}}`
		)
		.join("");

	const constructed = new document.defaultView.CSSStyleSheet();
	constructed.replaceSync(varsStyle.textContent);
	document.adoptedStyleSheets = [...document.adoptedStyleSheets, constructed];

	const theme = getComputedStyle(window.parent.document.body).colorScheme;

	document.documentElement.classList.toggle(
		"obsidian-theme-dark",
		theme === "dark"
	);
	document.documentElement.classList.toggle(
		"obsidian-theme-light",
		theme === "light"
	);

	return constructed;
})();


/**
 * -----------------------------------------------------------
 * Penpal bridge with the obsidian
 * -----------------------------------------------------------
 */

const adapter = new ReaderAdapter();

await (async () => {
	const messenger = new WindowMessenger({
		remoteWindow: window.parent,
		allowedOrigins: ["*"],
	});

	const connection = connect({
		messenger,
		methods: {
			async initReader(opts) {
				await adapter.createReader(opts);
				return { ok: true };
			},
			async setColorScheme(colorScheme) {
				adapter.applyColorScheme(colorScheme);
				return { ok: true };
			},
			async updateAnnotation(annotation) {
				await adapter.updateAnnotation(annotation);
				return { ok: true };
			}
		},
	});

	// Event pipe child → parent
	const parent = await connection.promise;
	adapter.on((evt) => parent.handleEvent(evt));
	window.obsidianAdapter = parent;
})();
