import type { JSX } from "@solidjs/web";
import type { SourceSnippet } from "../shared/report.ts";
import { useLocation } from "@solidjs/router";
import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import {
  createEditorActions,
  filterFindings,
  formatFindingLocation,
  paginateFindings,
  type EditorTarget,
} from "./finding-model.ts";
import { CopyButton } from "./copy-button.tsx";

export type FindingView = {
  readonly filename: string;
  readonly location: string;
  readonly label: JSX.Element;
  readonly snippet: SourceSnippet;
  readonly details: JSX.Element;
  readonly editorTarget: EditorTarget;
};

export function GuidanceSections(props: {
  readonly summary: string;
  readonly reason: string;
  readonly nextSteps: readonly string[];
  readonly cautions: readonly string[];
  readonly validation: readonly string[];
  readonly officialGuideUrl: string;
}) {
  return (
    <div class="guidance-sections">
      <p class="finding-summary">{props.summary}</p>
      <section>
        <h4>Why this was flagged</h4>
        <p>{props.reason}</p>
      </section>
      <section>
        <h4>Next steps</h4>
        <ol><For each={props.nextSteps}>{(step) => <li>{step}</li>}</For></ol>
      </section>
      <Show when={props.cautions.length > 0}>
        <section class="caution-section">
          <h4><span class="section-badge">Caution</span> Stop conditions</h4>
          <ul><For each={props.cautions}>{(caution) => <li>{caution}</li>}</For></ul>
        </section>
      </Show>
      <Show when={props.validation.length > 0}>
        <section>
          <h4>Validate</h4>
          <ul><For each={props.validation}>{(item) => <li>{item}</li>}</For></ul>
        </section>
      </Show>
      <p><a href={props.officialGuideUrl}>Open the official Solid 2 migration guide</a></p>
    </div>
  );
}

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

function SourceCode(props: { readonly snippet: SourceSnippet }) {
  const lines = () => props.snippet.text.split("\n");
  return (
    <pre
      class="source-snippet"
      tabindex="0"
      aria-label={`Source context lines ${props.snippet.startLine} to ${props.snippet.endLine}; matched lines ${props.snippet.matchStartLine} to ${props.snippet.matchEndLine}`}
    ><code><For each={lines()}>{(line, index) => {
      const lineNumber = () => props.snippet.startLine + index();
      const matched = () => lineNumber() >= props.snippet.matchStartLine && lineNumber() <= props.snippet.matchEndLine;
      return (
        <span class={matched() ? "source-line matched" : "source-line"}>
          <span class="line-number" aria-hidden="true">{lineNumber()}</span>
          <span class="visually-hidden">{matched() ? "Matched " : ""}Line {lineNumber()}: </span>
          <span class="line-content">{line || " "}</span>
        </span>
      );
    }}</For></code></pre>
  );
}

function FindingDisclosure(props: FindingView) {
  return (
    <article class="finding-entry">
      <header class="finding-heading">
        <div>
          <code>{props.location}</code>
          <span>{props.label}</span>
        </div>
<EditorActionMenu target={props.editorTarget} />
      </header>
      <details class="finding-disclosure">
        <summary>Source and guidance</summary>
        <h4>Source context</h4>
        <SourceCode snippet={props.snippet} />
        {props.details}
      </details>
    </article>
  );
}

function EditorActionMenu(props: { readonly target: EditorTarget }) {
  const actions = createEditorActions(props.target);
  const primaryAction = actions[0]!;
  return (
    <div class="finding-actions">
      <a class="open-editor" href={primaryAction.href}>Open in VS Code</a>
      <details class="overflow-actions">
        <summary aria-label="More finding actions"><span aria-hidden="true">•••</span></summary>
        <ul>
          <For each={actions.slice(1)}>
            {(action) => <li><a href={action.href}>Open in {action.label}</a></li>}
          </For>
          <li>
            <CopyButton
              class="copy-location"
              value={formatFindingLocation(props.target.filename, props.target.line, props.target.column)}
              idleLabel="Copy location"
            />
          </li>
        </ul>
      </details>
    </div>
  );
}
