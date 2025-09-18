import React, { useId, useEffect, useRef } from "react";
import { ObsidianBridge } from "../../lib/obsidian-adapter";
import cx from "classnames";

function ObsidianEditor(props) {
	let editorRef = useRef();
	const editorId = `${props.id}_${useId()}`;
	const [editor, setEditor] = React.useState(null);

	const options = {
		value: props.text,
		placeholder: props.placeholder,
		cls: "content",
		onChange: (update) => props.onChange(update.state.doc.toString()),
	};

	useEffect(() => {
		setEditor(
			ObsidianBridge.createAnnotationEditor(editorRef.current, options)
		);
	}, []);

	useEffect(() => {
		if (editor) {
			editor.set(props.text);
		}
	}, [props.text, editor]);

	return (
		<div className={cx("editor", { "read-only": props.readOnly })}>
			<div id={editorId} style={{ fontSize: "1em" }} ref={editorRef} />
		</div>
	);
}

export default ObsidianEditor;
