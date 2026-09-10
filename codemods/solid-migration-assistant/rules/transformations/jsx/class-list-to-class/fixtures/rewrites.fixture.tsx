// fixture: rewrites
const flags = { active: true };
const computedKey = "computed";
const condition = true;
const dynamicFlags = () => ({ ready: true });

export function View() {
  return (
    <section classList={{ active: true, hidden: false }}>
      <div id="first" classList={flags}>
        <span classList={{ nested: true }}>nested</span>
      </div>
      <input classList={dynamicFlags()} />
      <my-element classList={flags} />
      <li
        data-index="1"
        classList={
          // A comment inside the container must survive byte-for-byte.
          flags
        }
        style={{ color: "red" }}
      />
      <p classList={condition ? flags : { fallback: true }} />
      <b classList={flags as Record<string, boolean>} />
      <i classList={{ "spaced key": true, [computedKey]: false }} />
      <em style:color="red" classList={flags} />
      <u on:click={() => undefined} classList={flags} />
      <svg>
        <foreignObject classList={flags} />
      </svg>
    </section>
  );
}
