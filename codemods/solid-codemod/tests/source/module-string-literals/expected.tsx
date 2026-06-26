declare module "@solidjs/web" {
  interface RequestEventLocals {}
}

vi.mock("@solidjs/web", async importOriginal => {
  const actual = await importOriginal<typeof import("@solidjs/web")>();
  return actual;
});

export default {
  external: ["solid-js", "@solidjs/web", "solid-js"],
};
