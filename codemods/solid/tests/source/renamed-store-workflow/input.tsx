import { batch, createEffect } from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";

const [workspace, setWorkspace] = createStore({
  tasks: [{ id: "one", complete: false }],
});

createEffect(() => {
  saveTasks(workspace.tasks);
});

function completeTask() {
  setWorkspace("tasks", 0, "complete", true);
  saveTasks(workspace.tasks);
}

function completeAllTasks() {
  batch(() => {
    setWorkspace(
      produce(draft => {
        for (const task of draft.tasks) task.complete = true;
      }),
    );
    saveTasks(workspace.tasks);
  });
}

const serialized = JSON.stringify(unwrap(workspace));
