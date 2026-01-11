const https = require("https");
const JSZip = require("jszip");
const Terser = require("terser");
const { Compilation, sources } = require("webpack");

class PdfWorkerPlugin {
	constructor(options) {
		this.commitHash = options.commitHash;
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap("PdfWorkerPlugin", (compilation) => {
			compilation.hooks.processAssets.tapPromise(
				{
					name: "PdfWorkerPlugin",
					stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
				},
				async () => {
					try {
						if (!this.cachedCode) {
							console.log("[PdfWorkerPlugin] Downloading and building worker...");
							const workerContent = await this.getWorkerContent();
							const minified = await Terser.minify(workerContent);
							
							if (minified.error) {
								throw minified.error;
							}
							this.cachedCode = minified.code;
						}

						compilation.emitAsset(
							"pdf/zotero-pdf-worker.js",
							new sources.RawSource(this.cachedCode)
						);
					} catch (error) {
						compilation.errors.push(
							new Error(`PdfWorkerPlugin: ${error.message}`)
						);
					}
				}
			);
		});
	}

	async getWorkerContent() {
		const url = `https://zotero-download.s3.amazonaws.com/ci/document-worker/${this.commitHash}.zip`;
		const zipBuffer = await this.download(url);
		return this.extract(zipBuffer);
	}

	download(url) {
		return new Promise((resolve, reject) => {
			const options = {
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				},
			};

			https
				.get(url, options, (res) => {
					if (res.statusCode !== 200) {
						// Consume response data to free up memory
						res.resume();
						reject(
							new Error(
								`Failed to download worker from ${url}: ${res.statusCode}`
							)
						);
						return;
					}

					const chunks = [];
					res.on("data", (chunk) => chunks.push(chunk));
					res.on("end", () => resolve(Buffer.concat(chunks)));
					res.on("error", reject);
				})
				.on("error", reject);
		});
	}

	async extract(buffer) {
		const zip = await JSZip.loadAsync(buffer);
		const file = zip.file("worker.js");
		if (!file) {
			throw new Error("worker.js not found in zip");
		}
		return file.async("string");
	}
}

module.exports = PdfWorkerPlugin;
