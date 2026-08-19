import { render } from "@solidjs/web";

function Dashboard() {
  return (
    <main>
      <h1>Solid Migration Report</h1>
      <p>The dashboard build is ready for a report envelope.</p>
    </main>
  );
}

const mount = document.getElementById("app");
if (!mount) throw new Error("Dashboard mount element was not found.");

render(() => <Dashboard />, mount);
