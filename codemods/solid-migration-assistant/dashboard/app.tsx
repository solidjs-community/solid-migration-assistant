import { Errored, For, Show, createSignal, onCleanup } from "solid-js";
import type { JSX } from "@solidjs/web";
import { createRouter, hashHistory, useHref, useParams } from "@solidjs/router";
import type {
  JsonValue,
  ReportEnvelope,
  RuleSliceDescriptor,
} from "../shared/report.ts";
import { applyTheme, oppositeTheme, preferredTheme, type Theme } from "./theme.ts";
import { CopyButton } from "./copy-button.tsx";

export function createDashboardRouter(
  envelope: ReportEnvelope,
  manifest: readonly RuleSliceDescriptor[],
) {
  const groups = groupRulesByDomain(manifest);

  function IndexPage() {
    return (
      <section aria-labelledby="report-heading">
        <header class="page-heading">
          <p class="eyebrow">One immutable migration run</p>
          <h2 id="report-heading">Rule reports</h2>
          <p>Open a registered pilot slice to review its rule-owned report.</p>
        </header>
        <Show
          when={manifest.length > 0}
          fallback={<p class="empty-state">No pilot rule reports are registered.</p>}
        >
          <div class="domain-groups">
            <For each={groups}>
              {(group) => (
                <section class="domain-group" aria-labelledby={`domain-${group.slug}`}>
                  <h3 id={`domain-${group.slug}`}>{group.domain}</h3>
                  <div class="report-grid">
                    <For each={group.rules}>
                      {(descriptor) => (
                        <RuleCard
                          descriptor={descriptor}
                          payload={envelope.reports[descriptor.id]}
                          run={envelope.run}
                        />
                      )}
                    </For>
                  </div>
                </section>
              )}
            </For>
          </div>
        </Show>
      </section>
    );
  }

  function RulePage() {
    const params = useParams();
    const descriptor = () =>
      manifest.find((entry) => entry.route === params.rule);
    const payload = () => {
      const entry = descriptor();
      return entry ? envelope.reports[entry.id] : undefined;
    };
    const availablePayload = () => {
      const report = payload();
      return report === undefined ? undefined : { report };
    };

    return (
      <Show when={descriptor()} fallback={<UnknownRule route={params.rule ?? ""} />}>
        {(entry) => (
          <article>
            <p class="eyebrow">{entry().kind}</p>
            <h2>{entry().title}</h2>
            <Show
              when={availablePayload()}
              fallback={<p class="empty-state">This run has no payload for this rule.</p>}
            >
              {(available) => (
                <Errored
                  fallback={(error) => (
                    <p class="error-state">
                      This rule report could not be read: {errorMessage(error())}
                    </p>
                  )}
                >
                  <div class="rule-detail">{entry().renderDetail(available().report, envelope.run)}</div>
                </Errored>
              )}
            </Show>
          </article>
        )}
      </Show>
    );
  }

  function NotFoundPage() {
    return (
      <section>
        <h2>Page not found</h2>
        <p>The requested report page does not exist.</p>
        <InternalLink href="/">Return to all rule reports</InternalLink>
      </section>
    );
  }

  return createRouter({
    history: hashHistory(),
    routes: [
      { path: "/", component: IndexPage },
      { path: "/rules/*rule", component: RulePage },
      { path: "*404", component: NotFoundPage },
    ],
  });
}

function groupRulesByDomain(manifest: readonly RuleSliceDescriptor[]) {
  const groups = new Map<string, RuleSliceDescriptor[]>();
  for (const descriptor of manifest) {
    const rules = groups.get(descriptor.domain) ?? [];
    rules.push(descriptor);
    groups.set(descriptor.domain, rules);
  }
  return [...groups].map(([domain, rules]) => ({
    domain,
    rules,
    slug: domain.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  }));
}

function InternalLink(props: { readonly href: string; readonly children: JSX.Element }) {
  const href = useHref(() => props.href);
  return <a href={href()}>{props.children}</a>;
}

function RuleCard(props: {
  readonly descriptor: RuleSliceDescriptor;
  readonly payload: JsonValue | undefined;
  readonly run: ReportEnvelope["run"];
}) {
  const availablePayload = () =>
    props.payload === undefined ? undefined : { report: props.payload };

  return (
    <article class="report-card">
      <p class="eyebrow">{props.descriptor.kind}</p>
      <h3>
        <InternalLink href={`/rules/${props.descriptor.route}`}>
          {props.descriptor.title}
        </InternalLink>
      </h3>
      <Show
        when={availablePayload()}
        fallback={<p class="empty-state compact">No payload in this run.</p>}
      >
        {(available) => (
          <Errored
            fallback={<p class="error-state compact">Invalid rule payload.</p>}
          >
            <div class="rule-summary">
              {props.descriptor.renderSummary(available().report, props.run)}
            </div>
          </Errored>
        )}
      </Show>
    </article>
  );
}

function UnknownRule(props: { readonly route: string }) {
  return (
    <section>
      <h2>Unknown rule</h2>
      <p>
        <code>{props.route || "(empty)"}</code> is not a registered pilot rule.
      </p>
      <InternalLink href="/">Return to all rule reports</InternalLink>
    </section>
  );
}

export function Shell(props: {
  readonly children: JSX.Element;
  readonly analyzedTargetRoot: string;
}) {
  return (
    <>
      <header class="site-header">
        <div class="report-identity">
          <p class="eyebrow">Solid 2 migration assistant</p>
          <h1><InternalLink href="/">Migration report</InternalLink></h1>
          <div class="target-root">
            <span>Analyzed target</span>
            <code>{props.analyzedTargetRoot}</code>
            <CopyButton class="copy-root" value={props.analyzedTargetRoot} idleLabel="Copy root" />
          </div>
        </div>
        <div class="header-actions">
          <span class="run-badge">Single run</span>
          <ThemeSwitch />
        </div>
      </header>
      <main class="site-main">{props.children}</main>
    </>
  );
}

function ThemeSwitch() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const [theme, setTheme] = createSignal<Theme>(preferredTheme(media.matches));
  let manuallySelected = false;
  const followSystemTheme = (event: MediaQueryListEvent) => {
    if (!manuallySelected) setTheme(preferredTheme(event.matches));
  };
  media.addEventListener("change", followSystemTheme);
  onCleanup(() => media.removeEventListener("change", followSystemTheme));

  function toggleTheme() {
    manuallySelected = true;
    const next = oppositeTheme(theme());
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      class="theme-switch"
      type="button"
      aria-pressed={theme() === "dark" ? "true" : "false"}
      aria-label={`Use ${oppositeTheme(theme())} theme`}
      onClick={toggleTheme}
    >
      <span aria-hidden="true">{theme() === "dark" ? "☾" : "☀"}</span>
      {theme() === "dark" ? "Dark" : "Light"}
    </button>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown report error";
}
