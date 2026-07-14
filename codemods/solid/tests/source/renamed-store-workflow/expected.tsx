import { flush as batch, createEffect, createStore, deep, flush, snapshot, storePath } from "solid-js";

const [workspace, setWorkspace] = createStore({
  tasks: [{ id: "one", complete: false }],
});

createEffect(
  () => deep(workspace.tasks),
  (tasks) => saveTasks(tasks),
);

function completeTask() {
  flush(() => setWorkspace(storePath("tasks", 0, "complete", true)));
  saveTasks(workspace.tasks);
}

function completeAllTasks() {
  batch(() => {
    setWorkspace(
      draft => {
        for (const task of draft.tasks) task.complete = true;
      },
    );
    saveTasks(workspace.tasks);
  });
}

const serialized = JSON.stringify(snapshot(workspace));
