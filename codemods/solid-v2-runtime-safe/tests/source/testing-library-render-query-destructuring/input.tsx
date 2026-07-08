import { render } from "@solidjs/testing-library";

it("uses queries from render", () => {
	render(() => <button>Save</button>);
	const button = getByRole("button");
	expect(button).toBeTruthy();
});

it("leaves renders without getByRole alone", () => {
	render(() => <span>Save</span>);
	expect(true).toBe(true);
});

it("leaves existing destructuring alone", () => {
	const { getByRole } = render(() => <button>Save</button>);
	expect(getByRole("button")).toBeTruthy();
});
