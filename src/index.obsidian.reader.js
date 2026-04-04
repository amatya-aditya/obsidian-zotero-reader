import Reader from "./common/reader";
import { ObsidianBridge } from "./obsidian-adapter";

/**
 * -----------------------------------------------------------
 * Adapter for the reader
 * -----------------------------------------------------------
 */

export default class ZoteroReaderAdapter {
	reader;
	listeners = new Set();

	on(cb) {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}
	emit(e) {
		this.listeners.forEach((l) => l(e));
	}

	secondaryViewInitialized = false;

	async createReader(opts) {
		const defaults = {
			readOnly: false,
			annotations: [],
			primaryViewState: {},
			sidebarWidth: 240,
			sidebarOpen: false,
			toolbarPlaceholderWidth: 0,
			showAnnotations: true,
			onOpenContextMenu: (params) => {
				this.reader.openContextMenu(params);
			},
			onAddToNote: () => {
				this.emit({ type: "addToNote" });
			},
			onSaveAnnotations: (annotations) => {
				console.log("Save annotations", annotations);
				this.emit({ type: "annotationsSaved", annotations });
			},
			onUpdateAnnotation: (annotation) => {
				this.emit({ type: "annotationUpdated", annotation });
			},
			onDeleteAnnotations: (ids) => {
				this.emit({ type: "annotationsDeleted", ids });
			},
			onChangeViewState: (state, primary) => {
				if (state && !this.reader._state.splitType) {
					this.secondaryViewInitialized = false;
					this.reader._secondaryViewContainer.style.opacity = "0";
				}

				if (
					state &&
					!this.secondaryViewInitialized &&
					this.reader._state.splitType
				) {
					this.adoptObsidianStyles(
						window.OBSIDIAN_THEME_VARIABLES,
						this.reader._secondaryView?._iframeWindow.document
					);
					this.applyColorScheme(
						opts.colorScheme,
						this.reader._secondaryView?._iframeWindow.document
					);
					this.applyPageBackgroundColor(
						this.reader._secondaryView?._iframeWindow.document
					);
					this.reader._secondaryViewContainer.style.opacity = "1";
					this.secondaryViewInitialized = true;
				}

				this.emit({ type: "viewStateChanged", state, primary });
			},
			onOpenTagsPopup: (annotationID, left, top) => {
				this.emit({ type: "openTagsPopup", annotationID, left, top });
			},
			onClosePopup: (data) => {
				this.emit({ type: "closePopup", data });
			},
			onOpenLink: (url) => {
				this.emit({ type: "openLink", url });
			},
			onToggleSidebar: (open) => {
				this.emit({ type: "sidebarToggled", open });
			},
			onChangeSidebarView: (view) => {
			},
			onChangeSidebarWidth: (width) => {
			},
			onSetDataTransferAnnotations: (
				dataTransfer,
				annotations,
				fromText
			) => {
				ObsidianBridge.handleSetDataTransferAnnotations(dataTransfer, annotations, fromText);
			},
			onConfirm: (title, text, confirmationButtonTitle) => {
				this.emit({
					type: "confirm",
					title,
					text,
					confirmationButtonTitle,
				});
			},
			onRotatePages: (pageIndexes, degrees) => {
				this.emit({ type: "rotatePages", pageIndexes, degrees });
			},
			onDeletePages: (pageIndexes, degrees) => {
				this.emit({ type: "deletePages", pageIndexes, degrees });
			},
			onToggleContextPane: () => {
				this.emit({ type: "toggleContextPane" });
			},
			onTextSelectionAnnotationModeChange: (mode) => {
				this.emit({ type: "textSelectionAnnotationModeChanged", mode });
			},
			onSaveCustomThemes: (customThemes) => {
				this.reader.setCustomThemes(customThemes);
				this.emit({ type: "saveCustomThemes", customThemes });
			},
			onSetLightTheme: (theme) => {
				this.reader.setLightTheme(theme);
				this.emit({ type: "setLightTheme", theme });
			},
			onSetDarkTheme: (theme) => {
				this.reader.setDarkTheme(theme);
				this.emit({ type: "setDarkTheme", theme });
			},
			onForwardHotkey: (event) => {
				this.emit({
					type: "forwardHotkey",
					key: event.key,
					code: event.code,
					ctrlKey: event.ctrlKey,
					metaKey: event.metaKey,
					shiftKey: event.shiftKey,
					altKey: event.altKey,
				});
			}
		};

		const config = { ...defaults, ...opts };

		// Inject Obsidian CSS variables into the main reader document FIRST
		// so generateObsidianTheme() can read them
		this.adoptObsidianStyles(window.OBSIDIAN_THEME_VARIABLES, document);
		this.applyColorScheme(opts.colorScheme, document);

		config.customThemes = this.getCustomThemes(config.customThemes || []);
		config.lightTheme = opts.lightTheme || "original_fallback";
		config.darkTheme = opts.darkTheme || "original_fallback";

		// The "obsidian" custom theme is always available via customThemes.
		// The user chooses which theme to use via the light/dark theme settings.

		// Build data argument from Source
		if (
			!config.data ||
			!(config.data.buf || config.data.url) ||
			!config.type
		) {
			throw new Error(
				"Reader data is required (one of data.buf and data.url, and data.type must be provided in options)"
			);
		}

		// Extract the existing annotation from pdf
		if(config.type === "pdf") {

		}

		// Apply sidebar position
		if (config.sidebarPosition === "end") {
			document.body.classList.toggle("sidebar-position-end", true);
		}

		// Create the reader
		this.reader = new Reader(config);
		await this.reader.initializedPromise;
		window._reader = this.reader;

		// adopt obsidian styles into view iframes
		this.adoptObsidianStyles(
			window.OBSIDIAN_THEME_VARIABLES,
			this.reader._primaryView._iframeWindow.document
		);
		this.applyColorScheme(
			opts.colorScheme,
			this.reader._primaryView._iframeWindow.document
		);
		this.applyPageBackgroundColor(
			this.reader._primaryView._iframeWindow.document
		);

		// Regenerate the synthetic Obsidian theme once the iframe styles exist.
		this.reader.setCustomThemes(
			this.getCustomThemes(this.reader._state.customThemes || [])
		);

		this.reader._primaryViewContainer.style.opacity = "1";

		if (this.reader._state.splitType) {
			this.adoptObsidianStyles(
				window.OBSIDIAN_THEME_VARIABLES,
				this.reader._secondaryView?._iframeWindow.document
			);
			this.applyColorScheme(
				opts.colorScheme,
				this.reader._secondaryView?._iframeWindow.document
			);
			this.applyPageBackgroundColor(
				this.reader._secondaryView?._iframeWindow.document
			);
			this.reader._secondaryViewContainer.style.opacity = "1";
			this.secondaryViewInitialized = true;
		}

		this.emit({ type: "ready" });
	}

	getCustomThemes(customThemes = []) {
		const obsidianTheme = this.generateObsidianTheme();
		const hasObsidianTheme = customThemes.some(
			(theme) => theme.id === "obsidian"
		);

		if (hasObsidianTheme) {
			return customThemes.map((theme) => {
				if (theme.id === "obsidian") {
					return obsidianTheme;
				}
				return theme;
			});
		}

		return [obsidianTheme, ...customThemes];
	}

	applyColorSchemeForAll(colorScheme, obsidianThemeMode) {
		// Re-inject obsidian CSS variables into all documents
		this.adoptObsidianStyles(window.OBSIDIAN_THEME_VARIABLES, document);
		this.adoptObsidianStyles(window.OBSIDIAN_THEME_VARIABLES, this.reader?._primaryView?._iframeWindow?.document);
		this.adoptObsidianStyles(window.OBSIDIAN_THEME_VARIABLES, this.reader?._secondaryView?._iframeWindow?.document);

		this.applyColorScheme(colorScheme, document);
		this.applyColorScheme(colorScheme, this.reader?._primaryView?._iframeWindow?.document);
		this.applyColorScheme(colorScheme, this.reader?._secondaryView?._iframeWindow?.document);

		this.reader?.setColorScheme(colorScheme);
		if (this.reader?._state?.customThemes) {
			this.reader.setCustomThemes(
				this.getCustomThemes(this.reader._state.customThemes)
			);
		}
		this.applyPageBackgroundColor(this.reader?._primaryView?._iframeWindow?.document);
		this.applyPageBackgroundColor(this.reader?._secondaryView?._iframeWindow?.document);

		// Theme selection is driven by the user's settings;
		// no forced override here.
	}

	applyColorScheme(colorScheme, document) {
		if (!document) return;

		document.documentElement.classList.toggle(
			"obsidian-theme-dark",
			colorScheme === "dark"
		);
		document.documentElement.classList.toggle(
			"obsidian-theme-light",
			colorScheme === "light"
		);
	}

	adoptObsidianStyles(obsidianThemeVariables, document) {
		if (!obsidianThemeVariables || !document) return;

		// Remove previously injected obsidian styles to avoid stacking
		document.querySelectorAll("[data-obsidian-injected]").forEach(el => el.remove());

		const varsStyle = document.createElement("style");
		varsStyle.setAttribute("data-obsidian-injected", "vars");
		varsStyle.textContent = Object.entries(obsidianThemeVariables)
			.map(
				([sel, map]) =>
					`${sel}{${Object.entries(map)
						.filter(([k]) => !["--page-border"].includes(k))
						.map(([k, v]) => `${k}:${v};`)
						.join("")}}`
			)
			.join("");

		// Override reader UI CSS variables with Obsidian theme colors
		const overrideStyle = document.createElement("style");
		overrideStyle.setAttribute("data-obsidian-injected", "overrides");
		overrideStyle.textContent = `
			:root.obsidian-theme-dark[data-color-scheme=dark],
			:root.obsidian-theme-light:not([data-color-scheme=dark]) {
				--color-background: var(--background-primary) !important;
				--color-background50: var(--background-primary) !important;
				--color-background70: var(--background-primary) !important;
				--color-toolbar: var(--background-secondary) !important;
				--color-sidepane: var(--background-secondary-alt, var(--background-secondary)) !important;
				--color-tabbar: var(--background-primary) !important;
				--color-menu: var(--background-secondary) !important;
				--color-panedivider: var(--background-modifier-border) !important;
				--color-border: var(--background-modifier-border) !important;
				--color-border50: var(--background-modifier-border) !important;
				--color-button: var(--interactive-normal) !important;
				--color-control: var(--text-muted) !important;
				--fill-primary: var(--text-normal) !important;
				--fill-secondary: var(--text-muted) !important;
				--fill-tertiary: var(--text-faint) !important;
				--material-background: var(--background-primary) !important;
				--material-toolbar: var(--background-secondary) !important;
				--material-sidepane: var(--background-secondary-alt, var(--background-secondary)) !important;
				--material-tabbar: var(--background-primary) !important;
				--material-menu: var(--background-secondary) !important;
				--material-button: var(--interactive-normal) !important;
			}

			:root.obsidian-theme-dark[data-color-scheme=dark] body,
			:root.obsidian-theme-dark[data-color-scheme=dark] body #viewerContainer,
			:root.obsidian-theme-light:not([data-color-scheme=dark]) body,
			:root.obsidian-theme-light:not([data-color-scheme=dark]) body #viewerContainer {
				background-color: var(--background-primary) !important;
				color: var(--text-normal) !important;
			}
		`;

		const scrollbarStyle = document.createElement("style");
		scrollbarStyle.setAttribute("data-obsidian-injected", "scrollbar");
		scrollbarStyle.textContent = `
				::-webkit-scrollbar {
					background-color: var(--scrollbar-bg);
					width: var(--scrollbar-width);
					height: var(--scrollbar-height);
					-webkit-border-radius: var(--scrollbar-radius);
					background-color: transparent;
				}

				::-webkit-scrollbar-track {
					background-color: transparent;
				}

				::-webkit-scrollbar-thumb {
					background-color: var(--scrollbar-thumb-bg);
					-webkit-border-radius: var(--scrollbar-radius);
					background-clip: padding-box;
					border: 2px solid transparent;
					border-width: var(--scrollbar-border-width);
					min-height: 45px;
				}

				::-webkit-scrollbar-thumb:active {
					-webkit-border-radius: var(--scrollbar-radius);
				}

				::-webkit-scrollbar-thumb:hover,
				::-webkit-scrollbar-thumb:active {
					background-color: var(--scrollbar-active-thumb-bg);
				}

				::-webkit-scrollbar-corner {
					background: transparent;
				}
				@supports not selector(::-webkit-scrollbar) {
					:root {
						scrollbar-width: thin;
						scrollbar-color: var(--scrollbar-thumb-bg) var(--scrollbar-bg);
					}
				}`;

		document.head.appendChild(varsStyle);
		document.head.appendChild(overrideStyle);
		document.head.appendChild(scrollbarStyle);
	}

	applyPageBackgroundColor(document) {
		if (!document) return;

		const computedStyle = getComputedStyle(document.documentElement);
		const pageBackground =
			computedStyle.getPropertyValue("--color-toolbar").trim() ||
			computedStyle.getPropertyValue("--background-secondary").trim() ||
			computedStyle.getPropertyValue("--background-primary").trim();

		if (pageBackground) {
			document.documentElement.style.setProperty(
				"--pdf-page-background-color",
				pageBackground
			);
		}
	}

	generateObsidianTheme() {
		const expandShortHex = (hex) => {
			// Convert #abc to #aabbcc
			return hex.replace(
				/^#([a-f\d])([a-f\d])([a-f\d])$/i,
				(m, r, g, b) => "#" + r + r + g + g + b + b
			);
		};

		const convertAnyColorToHex = (color) => {
			// Already hex
			if (color.startsWith("#")) {
				return color.length === 4 ? expandShortHex(color) : color;
			}

			// Named colors, rgb(), rgba(), hsl(), etc.
			const canvas = document.createElement("canvas");
			canvas.width = canvas.height = 1;
			const ctx = canvas.getContext("2d");

			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 1, 1);

			const imageData = ctx.getImageData(0, 0, 1, 1).data;
			const r = imageData[0];
			const g = imageData[1];
			const b = imageData[2];

			return (
				"#" +
				((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
			);
		};

		const computedStyle = getComputedStyle(document.documentElement);
		const getVariableFallback = (name) => {
			if (typeof window.findParentWindow !== "function") {
				return "";
			}

			const parent = window.findParentWindow();
			if (!parent || parent === window) {
				return "";
			}

			return parent.getComputedStyle(parent.document.body).getPropertyValue(name)?.trim() || "";
		};

		let background = computedStyle
			.getPropertyValue("--background-primary")
			.trim();
		let foreground = computedStyle.getPropertyValue("--text-normal").trim();

		if (!background) {
			background = getVariableFallback("--background-primary");
		}
		if (!foreground) {
			foreground = getVariableFallback("--text-normal");
		}

		return {
			background: convertAnyColorToHex(
				background ||
				(document.documentElement.classList.contains("obsidian-theme-dark")
					? "#000000"
					: "#FFFFFF")
			),
			foreground: convertAnyColorToHex(
				foreground ||
				(document.documentElement.classList.contains("obsidian-theme-dark")
					? "#FFFFFF"
					: "#000000")
			),
			id: "obsidian",
			label: "Obsidian",
		};
	}

	addAnnotation(annotation) {
		if (this.reader) {
			this.reader._annotationManager.addAnnotation(annotation);
		}
	}

	async refreshAnnotations(annotations) {
		if (this.reader) {
			// Unset all annotations not in the new list, and set the new ones
			const newIDs = new Set(annotations.map((a) => a.id));
			const annotationsToRemove = this.reader._annotationManager._annotations.filter(x => !newIDs.has(x.id)).map(x => x.id);
			this.reader._annotationManager.unsetAnnotations(annotationsToRemove);
			this.reader.setAnnotations(annotations);
		}
	}

	async navigate(location) {
		if (this.reader) {
			this.reader.navigate(location, { behavior: "smooth" });
		}
	}

	async dispose() {
		this.reader = undefined;
	}
}
