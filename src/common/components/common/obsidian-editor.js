import React, { useId, useEffect, useRef } from "react";
import cx from "classnames";

function ObsidianEditor(props) {
	let editorRef = useRef();
	const editorId = `${props.id}_${useId()}`;

	const options = {
		value: props.text,
		placeholder: props.placeholder,
		cls: "content",
	};

	useEffect(() => {
		editorRef.current.empty();
		obsidianAdapter.createAnnotationEditor(editorId, props.id, options);
		editorRef.current = document.getElementById(editorId);
	}, [props.id]);

	return (
		<div className={cx("editor", { "read-only": props.readOnly })}>
			<div id={editorId} style={{ fontSize: "1em" }} ref={editorRef} />
		</div>
	);
}

export default ObsidianEditor;
