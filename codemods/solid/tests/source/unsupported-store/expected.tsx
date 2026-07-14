// TODO(solid-2 S2-BLOCKER-STORE-001): Unsupported removed store API "createMutable"; manual migration required.
const state = createMutable({ count: 0 });
state.count += 1;
