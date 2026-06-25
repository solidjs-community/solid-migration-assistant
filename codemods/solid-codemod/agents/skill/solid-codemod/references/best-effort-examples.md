# Best-Effort Migration Examples

These examples guide the explicit best-effort AI workflow. They are not deterministic
codemod tests. Use them as few-shot migration patterns, counterexamples, and report
expectations after the safe mechanical codemod pass has run.

## Contract

Best-effort AI may rewrite semantic migration sites only when it can explain the
intent and verify the result with available checks. Preserve exported library API
shape unless public-API-breaking mode is explicitly enabled.

Each applied semantic rewrite should record:

```json
{
  "file": "src/example.tsx",
  "site": "createResource user cluster",
  "decision": "createMemo + Loading + isPending",
  "evidence": ["resource is local", "refetch used only in click handler", "value read under page Suspense"],
  "risk": "medium",
  "checks": ["pnpm test -- UserPage"]
}
```

## Effects

### Direct `on(...)` effect

Before:

```ts
createEffect(on(count, (value, prev) => {
  console.log("changed", prev, value);
}, { defer: true }));
```

After:

```ts
createEffect(
  () => count(),
  (value, prev) => {
    console.log("changed", prev, value);
  },
  { defer: true }
);
```

Reason: `on` already declares dependencies. The compute phase is the dependency
read, and the apply phase is the old callback.

### Plain effect with mixed reads and side effects

Before:

```ts
createEffect(() => {
  const title = props.title;
  document.title = title;
});
```

After:

```ts
createEffect(
  () => props.title,
  title => {
    document.title = title;
  }
);
```

Reason: read reactive inputs in compute, perform side effects in apply.

### Effect cleanup

Before:

```ts
createEffect(() => {
  const id = setInterval(() => send(count()), 1000);
  onCleanup(() => clearInterval(id));
});
```

After:

```ts
createEffect(
  () => count(),
  value => {
    const id = setInterval(() => send(value), 1000);
    return () => clearInterval(id);
  }
);
```

Counterexample: if the interval intentionally reads the latest value every tick,
do not blindly capture `value`. Preserve the live read with a clear explanation:

```ts
createEffect(
  () => undefined,
  () => {
    const id = setInterval(() => send(count()), 1000);
    return () => clearInterval(id);
  }
);
```

## Lifecycle

### `onMount` with cleanup

Before:

```ts
onMount(() => {
  const id = setInterval(tick, 1000);
  onCleanup(() => clearInterval(id));
});
```

After:

```ts
onSettled(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});
```

Reason: `onCleanup` is forbidden inside `onSettled`; cleanup is returned.

Counterexample: if the callback creates reactive primitives, do not blindly rename.
Move primitive creation to an allowed owner or report the site.

## Memos

### Initial `prev` value

Before:

```ts
const total = createMemo(prev => prev + count(), 0);
```

After:

```ts
const total = createMemo((prev = 0) => prev + count());
```

### Initial value plus options

Before:

```ts
const total = createMemo(prev => prev + count(), 0, { equals: false });
```

After:

```ts
const total = createMemo((prev = 0) => prev + count(), { equals: false });
```

Counterexample: a two-argument object may be either an old initial value or new
options. Use callback/body/type context and record the decision.

## Async Resource Clusters

### Read-only scalar resource

Before:

```tsx
const [user, { refetch }] = createResource(id, fetchUser);

return (
  <Suspense fallback={<Spinner />}>
    <Show when={user.loading}>Refreshing...</Show>
    <Profile user={user()} />
    <button onClick={refetch}>Refresh</button>
  </Suspense>
);
```

After:

```tsx
const user = createMemo(() => fetchUser(id()));

return (
  <Loading fallback={<Spinner />}>
    <Show when={isPending(() => user())}>Refreshing...</Show>
    <Profile user={user()} />
    <button onClick={() => refresh(user)}>Refresh</button>
  </Loading>
);
```

Reason: scalar async read maps to async memo. Pending UI reads the same expression
under the owning `Loading` boundary.

### Collection with optimistic mutation

Before:

```ts
const [todos, { mutate, refetch }] = createResource(fetchTodos);

async function addTodo(todo) {
  mutate(prev => [...(prev ?? []), todo]);
  await api.addTodo(todo);
  refetch();
}
```

After:

```ts
const [todos, setOptimisticTodos] = createOptimisticStore(() => fetchTodos(), []);

const addTodo = action(function* (todo) {
  setOptimisticTodos(draft => {
    draft.push(todo);
  });

  yield api.addTodo(todo);
  refresh(todos);
});
```

Reason: collection mutation needs granular optimistic state and explicit refresh.

Counterexample: if the resource tuple is exported from a library, preserve the
public API or generate a compatibility adapter unless public-API-breaking mode is
enabled.

## Stores

### Direct `produce` wrapper

Before:

```ts
setStore(produce(state => {
  state.user.name = name;
}));
```

After:

```ts
setStore(state => {
  state.user.name = name;
});
```

### Path setter compat first

Before:

```ts
setStore("user", "address", "city", city);
```

After:

```ts
setStore(storePath("user", "address", "city", city));
```

Optional AI cleanup for simple literal paths:

```ts
setStore(state => {
  state.user.address.city = city;
});
```

Use the compat form when filters, ranges, dynamic keys, or delete semantics make a
draft rewrite risky.

### Rest-only `splitProps`

Before:

```ts
const [, rest] = splitProps(props, ["class", "style"]);
```

After:

```ts
const rest = omit(props, "class", "style");
```

Selected-prop usage requires broader migration:

```tsx
const [local, rest] = splitProps(props, ["class", "style"]);
return <button class={local.class} style={local.style} {...rest} />;
```

Better:

```tsx
const rest = omit(props, "class", "style");
return <button class={props.class} style={props.style} {...rest} />;
```

## Selectors

### Tight local common pattern

Before:

```tsx
const isSelected = createSelector(selectedId);

<For each={items()}>
  {item => <Row selected={isSelected(item.id)} item={item} />}
</For>;
```

After:

```tsx
let previousSelectedId: string | number | undefined;

const selected = createProjection(draft => {
  const id = selectedId();

  if (previousSelectedId !== undefined) {
    delete draft[previousSelectedId];
  }

  draft[id] = true;
  previousSelectedId = id;
}, {} as Record<string | number, true>);

<For each={items()}>
  {item => <Row selected={selected[item.id]} item={item} />}
</For>;
```

Counterexample: do not rewrite exported selectors, custom comparators, object-key
selectors, or sites where the predicate is passed as a function.

## Context

### Private redundant context hook

Before:

```ts
const TodosContext = createContext<TodosContextValue>();

const useTodos = () => {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error("missing TodosContext.Provider");
  return ctx;
};

const todos = useTodos();
```

After:

```ts
const TodosContext = createContext<TodosContextValue>();

const todos = useContext(TodosContext);
```

### Exported hook preservation

Before:

```ts
export const useTodos = () => {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error("missing TodosContext.Provider");
  return ctx;
};
```

After:

```ts
export const useTodos = () => useContext(TodosContext);
```

Reason: exported API shape is preserved.

## Error Boundaries

Before:

```tsx
<ErrorBoundary fallback={(err, reset) => (
  <Fallback error={err} stack={err.stack} retry={reset}>{String(err)}</Fallback>
)}>
  <Child />
</ErrorBoundary>
```

After:

```tsx
<Errored fallback={(err, reset) => (
  <Fallback error={err()} stack={err().stack} retry={reset}>{String(err())}</Fallback>
)}>
  <Child />
</Errored>
```

Avoid rewriting declarations, type positions, shadowed variables, or already-called
accessors.

## Dynamic Components

### One-shot deterministic equivalent

Before:

```ts
createDynamic(source, props);
```

After:

```ts
createComponent(dynamic(source), props);
```

Optional AI cleanup when expression context permits:

```tsx
const Active = dynamic(source);
return <Active {...props} />;
```

Do not replace `createDynamic(source, props)` with `dynamic(source)` alone. That
drops props and returns a component, not an element.

## DOM and Directives

### Static namespace rewrites

Before:

```tsx
<button
  class:active={active()}
  style:color={color()}
  attr:aria-label={label()}
  bool:disabled={disabled()}
  on:click={handleClick}
/>
```

After:

```tsx
<button
  class={{ active: active() }}
  style={{ color: color() }}
  aria-label={label()}
  disabled={disabled()}
  onClick={handleClick}
/>
```

Capture events, custom/dashed events, and listener options should become ref
callbacks with `addEventListener` options.

### Directives

Before:

```tsx
<button use:tooltip={{ content: "Save" }} />
```

After:

```tsx
<button ref={tooltip({ content: "Save" })} />
```

When an element already has refs, compose with arrays:

```tsx
<button ref={[existingRef, tooltip({ content: "Save" })]} />
```

Audit directive definitions for the two-phase pattern: owned setup returns an
unowned element application callback.

### `/*@once*/`

Do not blindly use `untrack`.

Normal reactive value:

```tsx
<Component value={/*@once*/ props.value} />
```

Usually becomes:

```tsx
<Component value={props.value} />
```

DOM initial state:

```tsx
<input value={/*@once*/ props.initialValue} />
```

Usually becomes:

```tsx
<input defaultValue={props.initialValue} />
```

Rare intentional snapshot:

```ts
const value = untrack(() => props.value);
```

## Props and Strict Reads

Before:

```tsx
function Title({ title }) {
  return <h1>{title}</h1>;
}
```

After:

```tsx
function Title(props) {
  return <h1>{props.title}</h1>;
}
```

Counterexample: default values, rest props, renames, and public component prop
types require careful migration and should be verified with Solid 2 diagnostics.

## Interop

Internal `observable` usage may become an effect push:

```ts
observable(count).subscribe(value => external.update(value));
```

```ts
createEffect(
  () => count(),
  value => external.update(value)
);
```

Exported observable APIs must preserve their external contract, usually by adding
a compatibility adapter rather than changing consumers to Solid accessors.

## Review-Only Examples

Do not auto-rewrite these without explicit evidence or public-API-breaking mode:

```ts
export const state = createMutable({ count: 0 });
export const deferred = createDeferred(search);
enableScheduling();
writeSignal(signal, value);
```

Record them as unresolved review-only migration sites with suggested follow-up.
