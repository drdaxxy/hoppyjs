var NSSParseException = function(message) {
  this.name = "NSSParseException";
  this.message = message;
};

var NSSParser = function (input) {
  this.input = [];
  do {
    token = input.nextToken();
    this.input.push(token);
  }
  while(token.type != "eof");
  this.cursor = 0;
};

NSSParser.prototype.peek = function(tokens) {
  var ret = this.input[this.cursor + (typeof tokens === 'undefined' ? 0 : tokens)];
  if(ret == null || ret.type == null) ret = { type: "eof", content: "" };
  return ret;
};

NSSParser.prototype.match = function() {
  var content = null;
  for(var i = 0; i < arguments.length; i++) {
    var t = this.peek();
    if(t.type != arguments[i])
      throw new NSSParseException("expected " + arguments[i] + ", got " + t.type);
    content = t.content;
    this.cursor++;
  }
  return content;
}

NSSParser.prototype.script = function() {
  var node = { chapters: {}, functions: {} };
  while(true) {
    var t = this.peek();
    if(t.type == "eof") return node;

    switch(t.type) {
      case "chapter":
        node.chapters.main = this.chapter().block;
        break;
      case "function":
        var f = this.func();
        node.functions[f.name] = f;
        break;
      default:
        throw new NSSParseException("expected chapter or function, got " + t.type);
    }
  }
  return node;
};

NSSParser.prototype.chapter = function() {
  var node = { type: "chapter" };
  this.match("chapter", "main", "lbrace");
  node.block = this.block();
  this.match("rbrace");
  return node;
};

NSSParser.prototype.func = function() {
  var node = { type: "function" };
  this.match("function");
  node.name = this.match("name");
  this.match("lparen");
  node.args = this.def_arguments();
  this.match("rparen", "lbrace");
  node.block = this.block();
  this.match("rbrace");
  return node;
};

NSSParser.prototype.def_arguments = function() {
  // yeah being able to have arguments would be nice wouldn't it
  return [];
};

NSSParser.prototype.block = function() {
  var node = [];
  while(this.peek().type != "rbrace") {
    node.push(this.stmt());
  }
  return node;
};

NSSParser.prototype.stmt = function() {
  var t = this.peek();
  if(t.type == "name" && this.peek(1).type == "lparen") {
    var ret = this.func_call();
    this.match("semicolon");
    return ret;
  } else if(t.type == "while") {
    return this.while_block();
  } else throw new NSSParseException("expected STMT, got " + t.type);
};

NSSParser.prototype.while_block = function() {
  var node = { type: "while" };
  this.match("while", "lparen");
  node.predicate = this.predicate();
  this.match("rparen", "lbrace");
  node.block = this.block();
  this.match("rbrace");
  return node;
};

NSSParser.prototype.predicate = function() {
  // ¯\_(ツ)_/¯
  return this.match("number");
};

NSSParser.prototype.func_call = function() {
  var node = { type: "func_call" };
  node.name = this.match("name");
  this.match("lparen");
  node.args = this.call_args();
  this.match("rparen");
  return node;
};

NSSParser.prototype.call_args = function() {
  if(this.peek().type == "rparen") return [];
  var node = [];
  while(true) {
    node.push(this.call_arg());
    if(this.peek().type == "comma") {
      this.match("comma");
    } else break;
  }
  return node;
};

NSSParser.prototype.call_arg = function() {
  var types = ["name", "number", "literal", "null", "true", "false"];
  var t = this.peek();
  if(types.indexOf(t.type) === -1)
    throw new NSSParseException("expected one of " + JSON.stringify(types) + ", got " + t.type);
  this.cursor++;
  return t;
};