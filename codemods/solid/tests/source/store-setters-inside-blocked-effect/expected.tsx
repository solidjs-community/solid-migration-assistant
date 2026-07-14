import { createEffect, createStore, storePath } from "solid-js";

const [constraints, setConstraints] = createStore<MediaStreamConstraints>({});

// TODO(solid-2 S2-EFFECT-001): Split this unsupported one-argument createEffect into compute and apply phases.
createEffect(() => {
  if (microphones().length > 0) {
    setConstraints(storePath("audio", { deviceId: microphones()[0].deviceId }));
    foundDevice(true);
  }

  if (cameras().length > 0) {
    setConstraints(storePath("video", { deviceId: cameras()[0].deviceId }));
    foundDevice(true);
  }
});
