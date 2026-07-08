declare module "solid-js/web" {
  interface RequestEventLocals {}
}

vi.mock("solid-js/web", async importOriginal => {
  const actual = await importOriginal<typeof import("solid-js/web")>();
  return actual;
});

export default {
  external: ["solid-js", "solid-js/web", "solid-js/store"],
};
