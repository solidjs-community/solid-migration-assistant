declare const pending: () => boolean;

export const view = <aside aria-busy={pending() ? "true" : "false"} data-selected={pending() ? "true" : "false"} />;
