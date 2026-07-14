declare const pending: () => boolean;

export const view = <aside aria-busy={pending()} data-selected={pending()} />;
