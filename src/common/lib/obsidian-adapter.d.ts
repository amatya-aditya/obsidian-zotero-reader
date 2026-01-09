import { ChildAPI, ParentAPI } from "../../../../../src/types/zotero-reader";

export function initBridge(): void;
export function registerChildAPI(childAPI: ChildAPI): Promise<void>;
export let ObsidianBridge: ParentAPI | null;