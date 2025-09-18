import { ChildAPI, ParentAPI } from "../../../../../src/types/zotero-reader";

export function InitBridge(): void;
export function RegisterChildAPI(childAPI: ChildAPI): Promise<void>;
export let ObsidianBridge: ParentAPI | null;