import { Errored, For, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { createRouter, hashHistory, useParams } from "@solidjs/router";
import type {
  JsonValue,
  ReportEnvelope,
  RuleSliceDescriptor,
} from "../shared/report.ts";

export function createDashboardRouter(
  envelope: ReportEnvelope,
  manifest: readonly RuleSliceDescriptor[],
) {
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
          <div class="report-grid">
            <For each={manifest}>
              {(descriptor) => (
                <RuleCard
                  descriptor={descriptor}
                  payload={envelope.reports[descriptor.id]}
                />
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
                  <div class="rule-detail">{entry().renderDetail(available().report)}</div>
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
        <a href="/">Return to all rule reports</a>
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

function RuleCard(props: {
  readonly descriptor: RuleSliceDescriptor;
  readonly payload: JsonValue | undefined;
}) {
  const availablePayload = () =>
    props.payload === undefined ? undefined : { report: props.payload };

  return (
    <article class="report-card">
      <p class="eyebrow">{props.descriptor.kind}</p>
      <h3>
        <a href={`/rules/${props.descriptor.route}`}>
          {props.descriptor.title}
        </a>
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
              {props.descriptor.renderSummary(available().report)}
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
      <a href="/">Return to all rule reports</a>
    </section>
  );
}

export function Shell(props: { readonly children: JSX.Element }) {
  return (
    <>
      <header class="site-header">
        <div>
          <p class="eyebrow">Solid 2 migration assistant</p>
          <h1><a href="/">Migration report</a></h1>
        </div>
        <span class="run-badge">Single run</span>
      </header>
      <main class="site-main">{props.children}</main>
    </>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown report error";
}
