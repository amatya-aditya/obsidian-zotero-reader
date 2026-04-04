import React, { useEffect, useRef } from "react";
import cx from "classnames";
import { ObsidianBridge } from "../../../obsidian-adapter";

/**
 * Lightweight read-only markdown display for annotation comments.
 * Uses Obsidian's MarkdownRenderer (via the bridge) to render directly
 * into the container DOM element, avoiding a full CodeMirror 6 editor.
 * Includes the expandable-editor wrapper (always collapsed) so existing
 * line-clamp CSS applies automatically.
 */
function CommentDisplay(props) {
	const containerRef = useRef();
	const handleRef = useRef(null);

	useEffect(() => {
		if (!containerRef.current) return;

		// Clean up previous render if any
		if (handleRef.current) {
			handleRef.current.unload();
			handleRef.current = null;
		}

		const text = props.text;
		if (!text) return;
        
		handleRef.current = ObsidianBridge.renderMarkdownToContainer(
			containerRef.current,
			text,
		);

		return () => {
			if (handleRef.current) {
				handleRef.current.unload();
				handleRef.current = null;
			}
		};
	}, [props.text]);


	return (
		<div className="editor obsidian-app" style={{ fontSize: "1em", contain: "content" }}>
			<div className="content" ref={containerRef} />
		</div>
	);
}

export default CommentDisplay;
