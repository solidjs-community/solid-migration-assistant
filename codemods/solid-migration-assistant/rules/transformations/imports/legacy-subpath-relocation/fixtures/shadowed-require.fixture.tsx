// fixture: shadowed-require
function require(name: string): unknown {
  return name;
}
const localFunction = require("solid-js/h");

const localVariable = (() => {
  const require = (name: string) => name;
  return require("solid-js/html");
})();

const localParameter = ((require: (name: string) => unknown) =>
  require("solid-js/universal"))((name: string) => name);

void localFunction;
void localVariable;
void localParameter;
