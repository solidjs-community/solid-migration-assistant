import { render } from "@solidjs/web";
import { createDashboardRouter, Shell } from "./app.tsx";
import { ruleManifest } from "./manifest.ts";
import { readEmbeddedReport } from "../shared/report.ts";
import "./styles.css";

const mount = document.getElementById("app");
if (!mount) throw new Error("Dashboard mount element was not found.");

try {
  const report = readEmbeddedReport(document);
  const Router = createDashboardRouter(report, ruleManifest);
  render(
    () => <Router>{(props) => <Shell>{props.children}</Shell>}</Router>,
    mount,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown report error";
  render(
    () => (
      <main class="site-main">
        <h1>Report unavailable</h1>
        <p class="error-state">{message}</p>
      </main>
    ),
    mount,
  );
}
