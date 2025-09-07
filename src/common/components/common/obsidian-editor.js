import React, { useId, useEffect, useRef } from "react";
import cx from "classnames";

function ObsidianEditor(props) {
	let editorRef = useRef();
	const editorId = `${props.id}_${useId()}`;

	const options = {
		value: props.text,
		placeholder: props.placeholder,
		enableRichText: false,
		ariaLabel: props.ariaLabel,
		cls: "obsidian-app",
	};

	useEffect(() => {
		parentAdapter.createAnnotationEditor(editorId, props.id, options);
		editorRef.current = document.getElementById(editorId);
	}, [props.id]);

	return (
		<div className={cx("editor", { "read-only": props.readOnly })}>
			<div
				id={editorId}
				style={{
					height: "200px",
					overflowY: "auto",
				}}
				className="content"
			/>
			{/* 			
			<Content
				ref={contentRef}
				id={props.id}
				text={props.text}
				readOnly={props.readOnly}
				enableRichText={props.enableRichText}
				placeholder={props.placeholder}
				onChange={props.onChange}
				ariaLabel={props.ariaLabel}
			/> */}
		</div>
	);
}

export default ObsidianEditor;
