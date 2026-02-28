import React from 'react';
import cx from 'classnames';
import ObsidianEditor from './obsidian-editor';

function ExpandableObsidianEditor(props) {
	return (
		<div className={cx('expandable-editor', { expanded: props.expanded })}>
			<div className={cx('editor-view')}>
				<ObsidianEditor{...props}/>
			</div>
		</div>
	);
}

export default ExpandableObsidianEditor;
