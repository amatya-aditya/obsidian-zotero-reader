import React, { useId, useEffect, useRef } from "react";
import { ObsidianBridge } from "../../../obsidian-adapter";
import cx from "classnames";
import CommentDisplay from "./comment-display";

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
		if (props.readOnly) return;
		const ed = ObsidianBridge.createAnnotationEditor(editorRef.current, options);
		setEditor(ed);
		return () => {
			ed.onunload();
			setEditor(null);
		};
	}, [props.readOnly]);

	useEffect(() => {
		if (editor) {
			editor.set(props.text);
		}
	}, [props.text, editor]);

	if (props.readOnly) {
		return <CommentDisplay {...props} />;
	}

	return (
		<div className={cx("editor")} style={{ fontSize:"1em" }}>
			<div id={editorId} style={{ fontSize: "1em" }} ref={editorRef} />
		</div>
	);
}

export default ObsidianEditor;
