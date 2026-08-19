import type { JSX } from "@solidjs/web";
import { useLocation } from "@solidjs/router";
import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import {
  filterFindings,
  paginateFindings,
} from "./finding-model.ts";

export type FindingView = {
  readonly filename: string;
  readonly location: string;
  readonly label: JSX.Element;
  readonly snippet: string;
  readonly guidance: string;
};

export function RuleFindings(props: { readonly findings: readonly FindingView[] }) {
  const location = useLocation();
  const [requestedPage, setRequestedPage] = createSignal(1);
  const filenameFilter = () =>
    typeof location.query.filename === "string" ? location.query.filename : "";
  let previousFilter = filenameFilter();

  createEffect(
    filenameFilter,
    (nextFilter) => {
      if (nextFilter !== previousFilter) {
        previousFilter = nextFilter;
        setRequestedPage(1);
      }
    },
  );

  const matches = createMemo(() => filterFindings(props.findings, filenameFilter()));
  const resultPage = createMemo(() => paginateFindings(matches(), requestedPage()));

  function updateFilter(value: string) {
    const search = new URLSearchParams(location.search);
    if (value) search.set("filename", value);
    else search.delete("filename");
    const query = search.toString();
    window.location.replace(`#${location.pathname}${query ? `?${query}` : ""}`);
  }

  return (
    <section class="rule-findings">
      <label class="filename-filter">
        <span>Filter by filename</span>
        <input
          type="search"
          value={filenameFilter()}
          placeholder="src/components"
          onInput={(event) => updateFilter(event.currentTarget.value)}
        />
      </label>
      <p class="result-count" aria-live="polite">
        {matches().length} of {props.findings.length} findings match
      </p>
      <Show
        when={matches().length > 0}
        fallback={(
          <p class="zero-state">
            {props.findings.length === 0
              ? "This rule found no migration sites in this run."
              : "No findings match this filename filter."}
          </p>
        )}
      >
        <ol class="finding-list" start={(resultPage().page - 1) * 100 + 1}>
          <For each={resultPage().items}>
            {(finding) => (
              <li>
                <FindingDisclosure {...finding} />
              </li>
            )}
          </For>
        </ol>
        <Show when={resultPage().pageCount > 1}>
          <nav class="pagination" aria-label="Finding pages">
            <button
              type="button"
              disabled={resultPage().page === 1}
              onClick={() => setRequestedPage(resultPage().page - 1)}
            >
              Previous
            </button>
            <span>Page {resultPage().page} of {resultPage().pageCount}</span>
            <button
              type="button"
              disabled={resultPage().page === resultPage().pageCount}
              onClick={() => setRequestedPage(resultPage().page + 1)}
            >
              Next
            </button>
          </nav>
        </Show>
      </Show>
    </section>
  );
}

function FindingDisclosure(props: FindingView) {
  return (
    <details class="finding-disclosure">
      <summary>
        <code>{props.location}</code>
        <span>{props.label}</span>
      </summary>
      <CopyLocationButton location={props.location} />
      <details class="snippet-disclosure">
        <summary>Source context</summary>
        <pre class="source-snippet">{props.snippet}</pre>
      </details>
      <pre>{props.guidance}</pre>
    </details>
  );
}

function CopyLocationButton(props: { readonly location: string }) {
  const [copied, setCopied] = createSignal(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    if (resetTimer !== undefined) clearTimeout(resetTimer);
  });

  async function copyLocation() {
    await copyText(props.location);
    setCopied(true);
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <button class="copy-location" type="button" onClick={copyLocation}>
      {copied() ? "Copied" : "Copy location"}
    </button>
  );
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Could not copy the location.");
  }
}
