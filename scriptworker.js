importScripts("nsslexer.js",
              "nssparser.js",
              "nssinterpreter.js");

var interpreter = null;

onmessage = function(ev) {
	switch(ev.data.type) {
    case "run_script":
      interpreter = new NSSInterpreter(ev.data.script);
      interpreter.run();
      break;
    case "keypress":
    case "click":
      interpreter.handleInput(ev.data.type);
      break;
    case "halt":
      interpreter.isHalted = true;
      break;
    default:
      // throw new SomethingException
  }
};