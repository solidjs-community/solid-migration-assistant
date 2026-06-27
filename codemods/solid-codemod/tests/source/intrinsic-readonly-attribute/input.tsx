export const view = (
	<>
		<input readOnly={form.isReadOnly()} />
		<textarea readOnly />
		<CustomInput readOnly={value()} />
	</>
);
