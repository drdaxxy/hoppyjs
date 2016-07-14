var NSSInterpreter = function(file, logger) {
  this.parse = new NSSParser(new NSSLexer(file)).script();
  postMessage({type: "log", message: "Parsed script:" + JSON.stringify(this.parse) + "\n"});
  this.flowStack = [ { block: this.parse.chapters.main , position: 0 } ];
  this.isHalted = false;
  this.inputHandlers = [];
};

NSSInterpreter.prototype.nss_CreateText = function(args) {
  postMessage({
    type: "CreateText",
    objectName: args[0],
    zLevel: args[1],
    xOffset: args[2],
    yOffset: args[3],
    unk4: args[4], // max width/height?
    unk5: args[5], // would make sense for wordwrap/scrolling maybe
    text: args[6]
  });
};
NSSInterpreter.prototype.nss_Request = function(args) {
  postMessage({
    type: "Request",
    objectGlob: args[0],
    operation: args[1]
  });
};
NSSInterpreter.prototype.nss_Wait = function(args) {
  var ms = args[0];
  this.isHalted = true;
  var obj = this;
  setTimeout(function() {
    obj.isHalted = false;
    obj.run();
  }, ms);
};
NSSInterpreter.prototype.nss_CreateTexture = function(args) {
  postMessage({
    type: "CreateTexture",
    objectName: args[0],
    zLevel: args[1],
    xOffset: args[2],
    yOffset: args[3],
    filePath: args[4],
  });
};
NSSInterpreter.prototype.nss_Fade = function(args) {
  postMessage({
    type: "Fade",
    objectGlob: args[0],
    time: args[1],
    alpha: args[2],
    unk3: args[3],
    unk4: args[4]
  });
};
NSSInterpreter.prototype.nss_WaitKey = function(args) {
  var ms = args[0];
  this.isHalted = true;
  var obj = this;
  var timer = null;
  var handler = function() {
    obj.isHalted = false;
    obj.run();
    obj.inputHandlers.splice(obj.inputHandlers.indexOf(handler), 1);
    clearTimeout(timer);
  };
  this.inputHandlers.push(handler);
  timer = setTimeout(function() {
    obj.isHalted = false;
    obj.run();
    obj.inputHandlers.splice(obj.inputHandlers.indexOf(handler), 1);
  }, ms);
};
NSSInterpreter.prototype.nss_Delete = function(args) {
  postMessage({
    type: "Delete",
    objectGlob: args[0]
  });
};

// using setTimeout() so events get through even in busy-loops

NSSInterpreter.prototype.run = function() {
  if(!this.isHalted) {
    var obj = this;
    setTimeout(function() {
        // ...and this is so we don't have to bother the execution queue
        // for every single step
        for(var i = 0; i < 10; i++) {
          if(obj.isHalted) break;
          obj.step();
        }
        obj.run();
    }, 0);
  }
};

NSSInterpreter.prototype.step = function() {
  var stmtExecuted = false;

  while(!stmtExecuted) {
    var current = this.flowStack.pop();
    if(current == null) {
      this.isHalted = true;
      return;
    }
    var curNode = current.block[current.position];

    switch(curNode.type) {
      case "while":
        // todo: actually implement conditions lel
        if(true) {
          this.flowStack.push(current);
          this.flowStack.push({ block: curNode.block, position: 0 });
        }
        break;

      case "func_call":
        stmtExecuted = this.func_call(current);
        break;

      default:
        // throw new SomethingException();
    }
  }

  if(current.position < current.block.length - 1) {
    var next = current;
    next.position++;
    this.flowStack.push(next);
  }
};

NSSInterpreter.prototype.func_call = function(current) {
  var node = current.block[current.position];

  if("nss_" + node.name in NSSInterpreter.prototype) {
    this["nss_" + node.name](this.resolve(node.args));
    
    return true;

  } else if(node.name in this.parse.functions) {
    if(current.position < current.block.length - 1) {
      var next = current;
      next.position++;
      this.flowStack.push(next);
    }
    
    // what are arguments anyway
    this.flowStack.push({ block: this.parse.functions[node.name].block, position: 0 })
    
    return false;

  } else {
    // throw new SomethingException();
  }
};

NSSInterpreter.prototype.resolve = function(inputs) {
  var outputs = [];
  for(var i = 0; i < inputs.length; i++) {
    var input = inputs[i];
    switch(input.type) {
      case "literal":
      case "number":
      case "name":
      case "true":
      case "null":
        outputs.push(input.content);
        break;
      default:
        // throw new SomethingException();
    }
  }
  return outputs;
};

NSSInterpreter.prototype.handleInput = function(type) {
  for(var i = 0; i < this.inputHandlers.length; i++) {
    this.inputHandlers[i]();
  }
};