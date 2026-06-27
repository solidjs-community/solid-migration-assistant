export const view = (
	<>
		<div tabIndex={0} />
		<input tabIndex={-1} />
		<svg tabIndex={-1}><g /></svg>
		<FocusTrap tabIndex={0} />
		<Dialog.Content tabIndex={-1} />
	</>
);
