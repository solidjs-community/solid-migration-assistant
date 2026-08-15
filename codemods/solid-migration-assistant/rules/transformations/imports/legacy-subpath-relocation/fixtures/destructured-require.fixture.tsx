// fixture: destructured-require
const [require] = [null];
require("solid-js/h");

function takesArray([require]) {
  return require("solid-js/html");
}

const { require = null } = {};
require("solid-js/universal");

void takesArray;
