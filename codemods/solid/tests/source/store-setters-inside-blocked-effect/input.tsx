import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";

const [constraints, setConstraints] = createStore<MediaStreamConstraints>({});

createEffect(() => {
  if (microphones().length > 0) {
    setConstraints("audio", { deviceId: microphones()[0].deviceId });
    foundDevice(true);
  }

  if (cameras().length > 0) {
    setConstraints("video", { deviceId: cameras()[0].deviceId });
    foundDevice(true);
  }
});
