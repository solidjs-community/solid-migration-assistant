// TODO(solid-2): Review semantic migration sites in this file: /*@once*/, oncapture:.
export const view = <button ref={focus} title="Save" disabled={isDisabled()} onClick={handleClick} oncapture:click={handleCapture} class={{ active: active() }} style={{ color: "red" }}>{/*@once*/ label()}</button>;
