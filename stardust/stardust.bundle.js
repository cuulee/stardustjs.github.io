(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Stardust = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require("stardust-core"));
var stardust_webgl_1 = require("stardust-webgl");
exports.WebGLPlatform = stardust_webgl_1.WebGLPlatform;

},{"stardust-core":24,"stardust-webgl":31}],2:[function(require,module,exports){
// binding.js:
// Take care of data binding.
"use strict";
var types_1 = require("./types");
var math_1 = require("./math");
// Resolve binding primitives to Value (Value = number or number[]).
function getBindingValue(value) {
    if (value instanceof math_1.MathType) {
        return value.toArray();
    }
    else {
        return value;
    }
}
exports.getBindingValue = getBindingValue;
var ShiftBinding = (function () {
    function ShiftBinding(name, offset) {
        this.name = name;
        this.offset = offset;
    }
    return ShiftBinding;
}());
exports.ShiftBinding = ShiftBinding;
// The main binding class.
var Binding = (function () {
    function Binding(typeName, value) {
        this._type = types_1.types[typeName];
        this._value = value;
    }
    Object.defineProperty(Binding.prototype, "typeName", {
        get: function () {
            return this._type.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Binding.prototype, "type", {
        get: function () {
            return this._type;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Binding.prototype, "size", {
        get: function () {
            return this._type.size;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Binding.prototype, "value", {
        get: function () {
            return this._value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Binding.prototype, "isFunction", {
        get: function () {
            return typeof (this._value) == "function";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Binding.prototype, "specValue", {
        get: function () {
            return getBindingValue(this._value);
        },
        enumerable: true,
        configurable: true
    });
    Binding.prototype.forEach = function (data, callback) {
        if (this.isFunction) {
            var f = this._value;
            for (var i = 0; i < data.length; i++) {
                callback(getBindingValue(f(data[i], i)), i);
            }
        }
        else {
            var value = getBindingValue(this._value);
            for (var i = 0; i < data.length; i++) {
                callback(value, i);
            }
        }
    };
    Binding.prototype.map = function (data) {
        if (this.isFunction) {
            var f_1 = this._value;
            return data.map(function (d, i) { return getBindingValue(f_1(d, i)); });
        }
        else {
            var value_1 = getBindingValue(this._value);
            return data.map(function () { return value_1; });
        }
    };
    Binding.prototype.fillBinary = function (data, rep, array) {
        var n = data.length;
        var p = this._type.primitiveCount;
        var ptr = 0;
        if (this.isFunction) {
            var f = this._value;
            if (p == 1) {
                for (var i = 0; i < n; i++) {
                    var result = getBindingValue(f(data[i], i));
                    for (var k = 0; k < rep; k++) {
                        array[ptr++] = result;
                    }
                }
            }
            else {
                for (var i = 0; i < n; i++) {
                    var result = getBindingValue(f(data[i], i));
                    for (var k = 0; k < rep; k++) {
                        for (var j = 0; j < p; j++) {
                            array[ptr++] = result[j];
                        }
                    }
                }
            }
        }
        else {
            var value = getBindingValue(this._value);
            if (p == 1) {
                var v = value;
                for (var i = 0; i < n; i++) {
                    for (var k = 0; k < rep; k++) {
                        array[ptr++] = v;
                    }
                }
            }
            else {
                var v = value;
                for (var i = 0; i < n; i++) {
                    for (var k = 0; k < rep; k++) {
                        for (var j = 0; j < p; j++) {
                            array[ptr++] = v[j];
                        }
                    }
                }
            }
        }
    };
    return Binding;
}());
exports.Binding = Binding;

},{"./math":13,"./types":22}],3:[function(require,module,exports){
"use strict";
var exceptions_1 = require("../exceptions");
var parser_1 = require("./parser");
var utils_1 = require("../utils");
var Intrinsics = require("../intrinsics");
var Library = require("../library/library");
var ScopeVariables = (function () {
    function ScopeVariables(owner, parentScope, argMap) {
        if (parentScope === void 0) { parentScope = null; }
        if (argMap === void 0) { argMap = null; }
        this._owner = owner;
        this._variables = new utils_1.Dictionary();
        this._parentScope = parentScope || null;
        this._argMap = argMap;
    }
    // Add a variable with name and type, shadows the ones from previous scopes.
    ScopeVariables.prototype.addVariable = function (name, type) {
        if (this._variables.has(name) || (this._argMap != null && this._argMap.has(name))) {
            // If the variable is defined in the current scope, throw exception.
            throw new exceptions_1.CompileError(name + " is already declared.");
        }
        else {
            // Create new translated name and set variable info.
            var translatedName = this._owner.newTranslatedName(name, type);
            this._variables.set(name, {
                name: name,
                type: type,
                translatedName: translatedName
            });
        }
    };
    // Create a new variable of type.
    ScopeVariables.prototype.nextVariable = function (type) {
        var _this = this;
        var name = utils_1.attemptName("tmp", function (name) { return !_this._variables.has(name) && !(_this._argMap != null && _this._argMap.has(name)); });
        this.addVariable(name, type);
        return this.getVariable(name);
    };
    ScopeVariables.prototype.getVariable = function (name) {
        if (this._variables.has(name)) {
            return this._variables.get(name);
        }
        else if (this._argMap != null && this._argMap.has(name)) {
            return this._parentScope.getVariable(this._argMap.get(name));
        }
        else if (this._parentScope) {
            return this._parentScope.getVariable(name);
        }
        else {
            throw new exceptions_1.CompileError(name + " is undefined.");
        }
    };
    Object.defineProperty(ScopeVariables.prototype, "parentScope", {
        get: function () {
            return this._parentScope;
        },
        enumerable: true,
        configurable: true
    });
    return ScopeVariables;
}());
exports.ScopeVariables = ScopeVariables;
var ScopeStack = (function () {
    function ScopeStack() {
        this._translatedNames = new utils_1.Dictionary();
        this._globalScope = new ScopeVariables(this);
        this._currentScope = this._globalScope;
    }
    // Reset scope to empty.
    ScopeStack.prototype.resetScope = function () {
        this._translatedNames = new utils_1.Dictionary();
        this._globalScope = new ScopeVariables(this);
        this._currentScope = this._globalScope;
    };
    // Push a scope.
    ScopeStack.prototype.pushScope = function (argMap) {
        if (argMap === void 0) { argMap = null; }
        this._currentScope = new ScopeVariables(this, this._currentScope, argMap);
    };
    // Pop a scope.
    ScopeStack.prototype.popScope = function () {
        this._currentScope = this._currentScope.parentScope;
    };
    // Create a new translated variable.
    ScopeStack.prototype.newTranslatedName = function (name, type) {
        var _this = this;
        var candidate = utils_1.attemptName(name, function (c) { return !_this._translatedNames.has(c); });
        this._translatedNames.set(candidate, {
            name: name,
            type: type,
            translatedName: candidate
        });
        return candidate;
    };
    // Iterate through translated variables.
    ScopeStack.prototype.forEach = function (callback) {
        this._translatedNames.forEach(function (o) {
            callback(o.translatedName, o.type);
        });
    };
    // Create a new variable in current scope, return its translated name.
    ScopeStack.prototype.nextVariableTranslatedName = function (type) {
        return this.nextVariable(type).translatedName;
    };
    // Create a new variable in current scope, return its name.
    ScopeStack.prototype.nextVariableName = function (type) {
        return this.nextVariable(type).name;
    };
    // Create a new variable in current scope, return its info.
    ScopeStack.prototype.nextVariable = function (type) {
        return this._currentScope.nextVariable(type);
    };
    // Add a new variable.
    ScopeStack.prototype.addVariable = function (name, type, scope) {
        if (scope == "global") {
            this._globalScope.addVariable(name, type);
        }
        else {
            this._currentScope.addVariable(name, type);
        }
    };
    // Translate variable from current scope to its translated name.
    ScopeStack.prototype.translateVariableName = function (name) {
        return this.getVariable(name).translatedName;
    };
    // Get variable info.
    ScopeStack.prototype.getVariable = function (name) {
        return this._currentScope.getVariable(name);
    };
    return ScopeStack;
}());
exports.ScopeStack = ScopeStack;
function typeConversionAttempt(src, dest) {
    var info = Intrinsics.getTypeConversion(src.valueType, dest);
    if (info) {
        var rank = info.rank;
        return [{
                type: "function",
                valueType: dest,
                arguments: [src],
                functionName: info.internalName,
            }, rank];
    }
    else {
        return [null, null];
    }
}
var FunctionOverloadResolver = (function () {
    function FunctionOverloadResolver(name) {
        this._name = name;
        this._functions = [];
    }
    FunctionOverloadResolver.prototype.addFunction = function (func) {
        this._functions.push(func);
    };
    FunctionOverloadResolver.prototype.resolveArguments = function (args, kwargs) {
        var result = null;
        var resultRank = null;
        for (var _i = 0, _a = this._functions; _i < _a.length; _i++) {
            var func = _a[_i];
            var funcRank = 0;
            var matched = true;
            var argExpressions = [];
            var argIndexUsed = [];
            var kwargsUsed = [];
            for (var argIndex in func.arguments) {
                var arg = func.arguments[argIndex];
                var argExpression = args[argIndex] || kwargs[arg.name];
                if (args[argIndex] != null) {
                    argIndexUsed.push(argIndex);
                }
                else if (kwargs[arg.name]) {
                    kwargsUsed.push(arg.name);
                }
                if (argExpression != null) {
                    if (argExpression.valueType != arg.type) {
                        var _b = typeConversionAttempt(argExpression, arg.type), conversion = _b[0], rank = _b[1];
                        if (conversion) {
                            argExpressions.push(conversion);
                            funcRank += rank;
                        }
                        else {
                            matched = false;
                            break;
                        }
                    }
                    else {
                        argExpressions.push(argExpression);
                    }
                }
                else {
                    if (arg.default === null || arg.default === undefined) {
                        matched = false;
                        break;
                    }
                    else {
                        argExpressions.push({
                            type: "constant",
                            value: arg.default,
                            valueType: arg.type
                        });
                    }
                }
            }
            var isAllUsed = true;
            for (var argIndex in args) {
                if (argIndexUsed.indexOf(argIndex) < 0)
                    isAllUsed = false;
            }
            for (var argName in kwargs) {
                if (kwargsUsed.indexOf(argName) < 0)
                    isAllUsed = false;
            }
            if (matched && isAllUsed) {
                if (!result || funcRank < resultRank) {
                    result = [func, argExpressions];
                    resultRank = funcRank;
                }
            }
        }
        if (result) {
            return result;
        }
        else {
            var argspec = args.map(function (x) { return x.valueType; }).join(", ");
            throw new exceptions_1.CompileError("unable to resolve function '" + this._name + "' with arguments (" + argspec + ")");
        }
    };
    return FunctionOverloadResolver;
}());
exports.FunctionOverloadResolver = FunctionOverloadResolver;
var Compiler = (function () {
    function Compiler() {
        this._scope = new ScopeStack();
        this._functions = new utils_1.Dictionary();
        this._intrinsicFunctions = new utils_1.Dictionary();
        this._constants = new utils_1.Dictionary();
        this._statements = [];
        this._lastIndex = 1;
        this.prepareIntrinsicFunctions();
        this.prepareFieldTypeRegistry();
        this.prepareConstants();
    }
    Compiler.prototype.prepareFieldTypeRegistry = function () {
        this._fieldTypeRegistry = {};
        var r = this._fieldTypeRegistry;
        for (var _i = 0, _a = ["x", "y"]; _i < _a.length; _i++) {
            var f = _a[_i];
            r[("Vector2." + f)] = "float";
        }
        for (var _b = 0, _c = ["x", "y", "z", "r", "g", "b"]; _b < _c.length; _b++) {
            var f = _c[_b];
            r[("Vector3." + f)] = "float";
        }
        for (var _d = 0, _e = ["x", "y", "z", "w", "r", "g", "b", "a"]; _d < _e.length; _d++) {
            var f = _e[_d];
            r[("Vector4." + f)] = "float";
        }
        for (var _f = 0, _g = ["r", "g", "b", "a"]; _f < _g.length; _f++) {
            var f = _g[_f];
            r[("Color." + f)] = "float";
        }
    };
    Compiler.prototype.prepareConstants = function () {
        var _this = this;
        Intrinsics.forEachConstant(function (info) {
            _this._constants.set(info.name, info);
        });
    };
    Compiler.prototype.addFunction = function (name, func) {
        if (!this._functions.has(name)) {
            var resolver = new FunctionOverloadResolver(name);
            this._functions.set(name, resolver);
            resolver.addFunction(func);
        }
        else {
            var resolver = this._functions.get(name);
            resolver.addFunction(func);
        }
    };
    Compiler.prototype.addIntrinsicFunction = function (name, func) {
        if (!this._intrinsicFunctions.has(name)) {
            var resolver = new FunctionOverloadResolver(name);
            this._intrinsicFunctions.set(name, resolver);
            resolver.addFunction(func);
        }
        else {
            var resolver = this._intrinsicFunctions.get(name);
            resolver.addFunction(func);
        }
    };
    Compiler.prototype.resolveFunction = function (name, args, kwargs) {
        var resolver = this._functions.get(name) || this._intrinsicFunctions.get(name);
        if (resolver) {
            return resolver.resolveArguments(args, kwargs);
        }
        else {
            throw new exceptions_1.CompileError("function '" + name + " is undefined.");
        }
    };
    Compiler.prototype.prepareIntrinsicFunctions = function () {
        var _this = this;
        Intrinsics.forEachIntrinsicFunction(function (info) {
            _this.addIntrinsicFunction(info.name, {
                type: "function",
                isShape: false,
                name: info.internalName,
                returnType: info.returnType,
                arguments: info.argTypes.map(function (x, idx) { return { name: "a" + idx, type: x }; }),
                statements: null
            });
        });
    };
    Compiler.prototype.loadFile = function (file) {
        var _this = this;
        var _loop_1 = function(block) {
            if (block.type == "function") {
                var blockFunction = block;
                this_1.addFunction(blockFunction.name, blockFunction);
            }
            if (block.type == "import") {
                var blockImport_1 = block;
                if (blockImport_1.functionNames != null) {
                    blockImport_1.functionNames.forEach(function (name) {
                        var f = Library.getModuleFunction(blockImport_1.moduleName, name);
                        _this.addFunction(name, f);
                    });
                }
                else {
                    Library.forEachModuleFunction(blockImport_1.moduleName, function (f, name) {
                        _this.addFunction(name, f);
                    });
                }
            }
        };
        var this_1 = this;
        for (var _i = 0, _a = file.blocks; _i < _a.length; _i++) {
            var block = _a[_i];
            _loop_1(block);
        }
    };
    Compiler.prototype.compileFunctionToShape = function (globals, block) {
        // Re-init state.
        this._scope.resetScope();
        this._lastIndex = 1;
        var shapeInput = {};
        var shapeOutput = {};
        var shapeVariables = {};
        // Setup input parameters.
        for (var _i = 0, globals_1 = globals; _i < globals_1.length; _i++) {
            var global = globals_1[_i];
            this._scope.addVariable(global.name, global.valueType, "global");
            shapeInput[global.name] = {
                type: global.valueType,
                default: global.default
            };
        }
        for (var _a = 0, _b = block.arguments; _a < _b.length; _a++) {
            var arg = _b[_a];
            this._scope.addVariable(arg.name, arg.type, "local");
            shapeInput[arg.name] = {
                type: arg.type,
                default: arg.default
            };
        }
        // Flatten statements.
        this.compileStatements({
            type: "statements",
            statements: block.statements
        });
        // Figure out variables.
        this._scope.forEach(function (name, type) {
            if (!shapeInput[name]) {
                shapeVariables[name] = type;
            }
        });
        // Figure out outputs.
        var processStatementsForOutputs = function (statements) {
            statements.forEach(function (x) {
                if (x.type == "emit") {
                    var sEmit = x;
                    for (var attr in sEmit.attributes) {
                        if (shapeOutput.hasOwnProperty(attr)) {
                            if (shapeOutput[attr].type != sEmit.attributes[attr].valueType) {
                                throw new exceptions_1.CompileError("output variable '" + attr + " has conflicting types.");
                            }
                        }
                        else {
                            shapeOutput[attr] = { type: sEmit.attributes[attr].valueType };
                        }
                    }
                }
                if (x.type == "condition") {
                    var sCondition = x;
                    processStatementsForOutputs(sCondition.trueStatements);
                    processStatementsForOutputs(sCondition.falseStatements);
                }
                if (x.type == "for") {
                    var sForLoop = x;
                    processStatementsForOutputs(sForLoop.statements);
                }
            });
        };
        processStatementsForOutputs(this._statements);
        return {
            input: shapeInput,
            output: shapeOutput,
            variables: shapeVariables,
            statements: this._statements
        };
    };
    Compiler.prototype.addStatement = function (statement) {
        this._statements.push(statement);
    };
    Compiler.prototype.addStatements = function (statements) {
        this._statements = this._statements.concat(statements);
    };
    Compiler.prototype.captureStatements = function (callback) {
        var currentStatements = this._statements;
        this._statements = [];
        callback();
        var result = this._statements;
        this._statements = currentStatements;
        return result;
    };
    Compiler.prototype.compileExpression = function (expression, keepResult) {
        if (keepResult === void 0) { keepResult = false; }
        switch (expression.type) {
            case "value": {
                var expr = expression;
                return {
                    type: "constant",
                    value: expr.value,
                    valueType: expr.valueType
                };
            }
            case "variable": {
                var expr = expression;
                if (this._constants.has(expr.name)) {
                    var cinfo = this._constants.get(expr.name);
                    return {
                        type: "constant",
                        value: cinfo.value,
                        valueType: cinfo.type
                    };
                }
                else {
                    return {
                        type: "variable",
                        variableName: this._scope.translateVariableName(expr.name),
                        valueType: this._scope.getVariable(expr.name).type
                    };
                }
            }
            case "field": {
                var expr = expression;
                var valueExpr = this.compileExpression(expr.value, true);
                return {
                    type: "field",
                    fieldName: expr.fieldName,
                    value: valueExpr,
                    valueType: this._fieldTypeRegistry[valueExpr.valueType + "." + expr.fieldName]
                };
            }
            case "function": {
                var expr = expression;
                var args = [];
                var kwargs = {};
                for (var _i = 0, _a = expr.args.args; _i < _a.length; _i++) {
                    var arg = _a[_i];
                    args.push(this.compileExpression(arg, true));
                }
                for (var key in expr.args.kwargs) {
                    var e = expr.args.kwargs[key];
                    kwargs[key] = this.compileExpression(expr.args.kwargs[key], true);
                }
                var _b = this.resolveFunction(expr.name, args, kwargs), func = _b[0], argExpressions = _b[1];
                var returnValueExpression = null;
                if (!func.statements) {
                    returnValueExpression = {
                        type: "function",
                        functionName: func.name,
                        arguments: argExpressions,
                        valueType: func.returnType
                    };
                }
                else {
                    var argMap = new utils_1.Dictionary();
                    for (var argIndex in func.arguments) {
                        var arg = func.arguments[argIndex];
                        var mapped = this._scope.nextVariableName(arg.type);
                        argMap.set(arg.name, mapped);
                        this.addStatement({
                            type: "assign",
                            variableName: this._scope.translateVariableName(mapped),
                            expression: argExpressions[argIndex]
                        });
                    }
                    this._scope.pushScope(argMap);
                    for (var _c = 0, _d = func.statements; _c < _d.length; _c++) {
                        var statement = _d[_c];
                        if (statement.type == "return") {
                            var statement_return = statement;
                            returnValueExpression = this.compileExpression(statement_return.value);
                            break;
                        }
                        else {
                            this.compileStatement(statement);
                        }
                    }
                    this._scope.popScope();
                }
                return returnValueExpression;
            }
        }
        return null;
    };
    Compiler.prototype.compileStatements = function (statements) {
        this._scope.pushScope();
        for (var _i = 0, _a = statements.statements; _i < _a.length; _i++) {
            var s = _a[_i];
            this.compileStatement(s);
        }
        this._scope.popScope();
    };
    Compiler.prototype.compileStatement = function (statement) {
        var _this = this;
        switch (statement.type) {
            case "declare":
                {
                    var s = statement;
                    if (s.initial) {
                        var ve = this.compileExpression(s.initial, true);
                        var variableType = s.variableType;
                        if (variableType == "auto")
                            variableType = ve.valueType;
                        this._scope.addVariable(s.variableName, variableType, "local");
                        if (ve.valueType != variableType) {
                            var veType = ve.valueType;
                            ve = typeConversionAttempt(ve, this._scope.getVariable(s.variableName).type)[0];
                            if (ve === null) {
                                throw new exceptions_1.CompileError("cannot convert type '" + veType + "' to '" + variableType + "'.");
                            }
                        }
                        this.addStatement({
                            type: "assign",
                            variableName: this._scope.translateVariableName(s.variableName),
                            expression: ve
                        });
                    }
                    else {
                        this._scope.addVariable(s.variableName, s.variableType, "local");
                    }
                }
                break;
            case "expression":
                {
                    var s = statement;
                    this.compileExpression(s.expression, false);
                }
                break;
            case "assign":
                {
                    var s = statement;
                    var ve = this.compileExpression(s.expression, true);
                    var targetType = this._scope.getVariable(s.variableName).type;
                    if (ve.valueType != targetType) {
                        var veType = ve.valueType;
                        ve = typeConversionAttempt(ve, this._scope.getVariable(s.variableName).type)[0];
                        if (ve === null) {
                            throw new exceptions_1.CompileError("cannot convert type '" + veType + " to '" + targetType + "'.");
                        }
                    }
                    this.addStatement({
                        type: "assign",
                        variableName: this._scope.translateVariableName(s.variableName),
                        expression: ve
                    });
                }
                break;
            case "emit":
                {
                    var s = statement;
                    s.vertices.forEach(function (v) {
                        var attrs = {};
                        for (var argName in v) {
                            var expr = v[argName];
                            attrs[argName] = _this.compileExpression(expr, true);
                        }
                        _this.addStatement({
                            type: "emit",
                            attributes: attrs
                        });
                    });
                }
                break;
            case "statements":
                {
                    var s = statement;
                    this.compileStatements(s);
                }
                break;
            case "for":
                {
                    var s_1 = statement;
                    this._scope.pushScope();
                    // Declare the loop variable
                    this._scope.addVariable(s_1.variableName, "int", "local");
                    var loopVariable = this._scope.translateVariableName(s_1.variableName);
                    // Compile for statements
                    var forStatement = {
                        type: "for",
                        variableName: loopVariable,
                        rangeMin: s_1.start,
                        rangeMax: s_1.end,
                        statements: this.captureStatements(function () { return _this.compileStatement(s_1.statement); })
                    };
                    this.addStatement(forStatement);
                    this._scope.popScope();
                }
                break;
            case "if":
                {
                    var s_2 = statement;
                    // Function to compile the i-th condition in the if-elseif-else syntax.
                    var compileIthCondition_1 = function (i) {
                        if (i < s_2.conditions.length) {
                            var statements = [];
                            _this._scope.pushScope();
                            var ve = _this.compileExpression(s_2.conditions[i].condition, true);
                            var cond = {
                                type: "condition",
                                condition: ve,
                                trueStatements: _this.captureStatements(function () { return _this.compileStatement(s_2.conditions[i].statement); }),
                                falseStatements: _this.captureStatements(function () { return compileIthCondition_1(i + 1); })
                            };
                            _this.addStatement(cond);
                            _this._scope.popScope();
                        }
                        else {
                            if (s_2.else) {
                                _this.compileStatement(s_2.else);
                            }
                        }
                    };
                    compileIthCondition_1(0);
                }
                break;
            case "return": {
                throw new exceptions_1.CompileError("unexpected return statement");
            }
        }
    };
    return Compiler;
}());
exports.Compiler = Compiler;
function compileTree(file) {
    var spec = {};
    var globals = file.blocks.filter(function (x) { return x.type == "global"; });
    for (var _i = 0, _a = file.blocks; _i < _a.length; _i++) {
        var block = _a[_i];
        if (block.type == "function") {
            var blockFunction = block;
            if (blockFunction.returnType == "shape") {
                var scope = new Compiler();
                scope.loadFile(file);
                var shape = scope.compileFunctionToShape(globals, blockFunction);
                spec[blockFunction.name] = shape;
            }
        }
    }
    return spec;
}
exports.compileTree = compileTree;
function compileString(content) {
    var file = parser_1.parseString(content);
    return compileTree(file);
}
exports.compileString = compileString;

},{"../exceptions":8,"../intrinsics":9,"../library/library":10,"../utils":23,"./parser":5}],4:[function(require,module,exports){
// Declare shape code with Javascript calls.
"use strict";
var utils_1 = require("../utils");
var compiler_1 = require("./compiler");
var CustomShapeItem = (function () {
    function CustomShapeItem(name) {
        this._name = name;
        this._attrs = new utils_1.Dictionary();
    }
    CustomShapeItem.prototype.attr = function (name, expression) {
        this._attrs.set(name, expression);
        return this;
    };
    CustomShapeItem.prototype.generateCode = function () {
        var attrDefs = [];
        this._attrs.forEach(function (value, key) {
            attrDefs.push(key + " = " + value);
        });
        return this._name + "(" + attrDefs.join(", ") + ")";
    };
    return CustomShapeItem;
}());
exports.CustomShapeItem = CustomShapeItem;
var CustomShape = (function () {
    function CustomShape() {
        this._imports = [];
        this._inputs = [];
        this._variables = [];
        this._items = [];
    }
    CustomShape.prototype.input = function (name, type, initial) {
        this._inputs.push([name, type, initial]);
        return this;
    };
    CustomShape.prototype.variable = function (name, expression) {
        this._variables.push([name, expression]);
        return this;
    };
    CustomShape.prototype.add = function (name) {
        var _a = name.split("."), libraryName = _a[0], shapeName = _a[1];
        var alreadyImported = false;
        for (var _i = 0, _b = this._imports; _i < _b.length; _i++) {
            var _c = _b[_i], lib = _c[0], shape = _c[1];
            if (lib == libraryName && shape == shapeName) {
                alreadyImported = true;
            }
        }
        if (!alreadyImported) {
            this._imports.push([libraryName, shapeName]);
        }
        var item = new CustomShapeItem(shapeName);
        this._items.push(item);
        return item;
    };
    CustomShape.prototype.generateCode = function (shapeName) {
        var lines = [];
        for (var _i = 0, _a = this._imports; _i < _a.length; _i++) {
            var _b = _a[_i], library = _b[0], name_1 = _b[1];
            lines.push("import " + name_1 + " from " + library + ";");
        }
        // Input attributes:
        var inputDefs = [];
        for (var _c = 0, _d = this._inputs; _c < _d.length; _c++) {
            var _e = _d[_c], name_2 = _e[0], type = _e[1], initial = _e[2];
            if (initial == null) {
                inputDefs.push(type + " " + name_2);
            }
            else {
                inputDefs.push(type + " " + name_2 + " = " + initial);
            }
        }
        lines.push("shape " + shapeName + "(");
        lines.push("    " + inputDefs.join(", "));
        lines.push(") {");
        // Variables
        for (var _f = 0, _g = this._variables; _f < _g.length; _f++) {
            var _h = _g[_f], name_3 = _h[0], expression = _h[1];
            lines.push("    auto " + name_3 + " = " + expression + ";");
        }
        for (var _j = 0, _k = this._items; _j < _k.length; _j++) {
            var item = _k[_j];
            lines.push("    " + item.generateCode() + ";");
        }
        lines.push("}");
        return lines.join("\n");
    };
    CustomShape.prototype.compile = function () {
        var code = this.generateCode("Shape");
        var specs = compiler_1.compileString(code);
        return specs["Shape"];
    };
    CustomShape.test = function () {
        var g = new CustomShape();
        g.input("x", "float").input("y", "float")
            .add("P2D.Circle")
            .attr("center", "Vector2(x, y)")
            .attr("radius", "1")
            .attr("color", "Color(0, 1, 0, 1)");
        console.log(g.generateCode("Shape"));
        console.log(g.compile());
    };
    return CustomShape;
}());
exports.CustomShape = CustomShape;

},{"../utils":23,"./compiler":3}],5:[function(require,module,exports){
"use strict";
var exceptions_1 = require("../exceptions");
var parser_pegjs = require("./parser_pegjs");
function stripComments(content) {
    content = content.replace(/\/\/[^\n]*\n/g, "\n");
    content = content.replace(/\/\/[^\n]*$/g, "");
    return content;
}
function parseString(content) {
    content = stripComments(content);
    var result = null;
    try {
        result = parser_pegjs.parse(content);
    }
    catch (e) {
        if (e.location) {
            throw new exceptions_1.ParseError(e.message, e.location.start, e.location.end);
        }
        else {
            throw new exceptions_1.ParseError(e.message);
        }
    }
    return result;
}
exports.parseString = parseString;

},{"../exceptions":8,"./parser_pegjs":6}],6:[function(require,module,exports){
module.exports = (function() {
  "use strict";

  /*
   * Generated by PEG.js 0.9.0.
   *
   * http://pegjs.org/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.location = location;
    this.name     = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  function peg$parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},
        parser  = this,

        peg$FAILED = {},

        peg$startRuleFunctions = { Start: peg$parseStart },
        peg$startRuleFunction  = peg$parseStart,

        peg$c0 = function(blocks) { return { blocks: blocks.map(function(d) { return d[0]; }) }; },
        peg$c1 = "(",
        peg$c2 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c3 = ")",
        peg$c4 = { type: "literal", value: ")", description: "\")\"" },
        peg$c5 = "{",
        peg$c6 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c7 = "}",
        peg$c8 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c9 = function(ret, name, args, statements) { return { type: "function", isShape: ret == "shape", name: name, returnType: ret, arguments: args, statements: statements }; },
        peg$c10 = "=",
        peg$c11 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c12 = ";",
        peg$c13 = { type: "literal", value: ";", description: "\";\"" },
        peg$c14 = function(type, name, value) { return { type: "global", name: name, valueType: type, default: value }; },
        peg$c15 = function(type, name) { return { type: "global", name: name, valueType: type }; },
        peg$c16 = "import",
        peg$c17 = { type: "literal", value: "import", description: "\"import\"" },
        peg$c18 = "*",
        peg$c19 = { type: "literal", value: "*", description: "\"*\"" },
        peg$c20 = "from",
        peg$c21 = { type: "literal", value: "from", description: "\"from\"" },
        peg$c22 = function(moduleName) { return { type: "import", moduleName: moduleName, functionNames: null }; },
        peg$c23 = ",",
        peg$c24 = { type: "literal", value: ",", description: "\",\"" },
        peg$c25 = function(name, others, moduleName) { return { type: "import", moduleName: moduleName, functionNames: resolveList(name, others, 3) }; },
        peg$c26 = function(first, others) { return resolveList(first, others, 3); },
        peg$c27 = function() { return []; },
        peg$c28 = function(type, name, value) { return { type: type, name: name, default: value } },
        peg$c29 = function(type, name) { return { type: type, name: name } },
        peg$c30 = function(first, others) { return resolveList(first, others, 1); },
        peg$c31 = function(s) { return s; },
        peg$c32 = function(statements) { return { type: "statements", statements: statements }; },
        peg$c33 = "return",
        peg$c34 = { type: "literal", value: "return", description: "\"return\"" },
        peg$c35 = function(expr) { return { type: "return", value: expr }; },
        peg$c36 = "emit",
        peg$c37 = { type: "literal", value: "emit", description: "\"emit\"" },
        peg$c38 = "[",
        peg$c39 = { type: "literal", value: "[", description: "\"[\"" },
        peg$c40 = "]",
        peg$c41 = { type: "literal", value: "]", description: "\"]\"" },
        peg$c42 = function(vertices) { return { type: "emit", vertices: vertices }; },
        peg$c43 = ":",
        peg$c44 = { type: "literal", value: ":", description: "\":\"" },
        peg$c45 = function(name, expr) { return { name: name, value: expr }; },
        peg$c46 = function(first, others) { return resolveArgumentList(resolveList(first, others, 3)).kwargs; },
        peg$c47 = function() { return {}; },
        peg$c48 = function(first, others) { return resolveList(first, others, 4); },
        peg$c49 = function(expr) { return { type: "expression", expression: expr }; },
        peg$c50 = function(type, name, initial) { return { type: "declare", variableType: type, variableName: name, initial: initial }; },
        peg$c51 = function(type, name) { return { type: "declare", variableType: type, variableName: name }; },
        peg$c52 = function(variable, value) { return { type: "assign", variableName: variable, expression: value }; },
        peg$c53 = "for",
        peg$c54 = { type: "literal", value: "for", description: "\"for\"" },
        peg$c55 = "in",
        peg$c56 = { type: "literal", value: "in", description: "\"in\"" },
        peg$c57 = "..",
        peg$c58 = { type: "literal", value: "..", description: "\"..\"" },
        peg$c59 = function(variable, start, end, statement) { return { type: "for", variableName: variable, statement: statement, start: start, end: end }; },
        peg$c60 = "if",
        peg$c61 = { type: "literal", value: "if", description: "\"if\"" },
        peg$c62 = "else",
        peg$c63 = { type: "literal", value: "else", description: "\"else\"" },
        peg$c64 = function(condition, statement, elseifs, lastelse) {
              var conditions = [ { condition: condition, statement: statement } ].concat(elseifs.map(function(x) {
                return { condition: x[7], statement: x[11] };
              }));
              return {type: "if", conditions: conditions, else: lastelse ? lastelse[3] : null };
            },
        peg$c65 = "&&",
        peg$c66 = { type: "literal", value: "&&", description: "\"&&\"" },
        peg$c67 = "||",
        peg$c68 = { type: "literal", value: "||", description: "\"||\"" },
        peg$c69 = ">=",
        peg$c70 = { type: "literal", value: ">=", description: "\">=\"" },
        peg$c71 = ">",
        peg$c72 = { type: "literal", value: ">", description: "\">\"" },
        peg$c73 = "<=",
        peg$c74 = { type: "literal", value: "<=", description: "\"<=\"" },
        peg$c75 = "<",
        peg$c76 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c77 = "==",
        peg$c78 = { type: "literal", value: "==", description: "\"==\"" },
        peg$c79 = "!=",
        peg$c80 = { type: "literal", value: "!=", description: "\"!=\"" },
        peg$c81 = "+",
        peg$c82 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c83 = "-",
        peg$c84 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c85 = "/",
        peg$c86 = { type: "literal", value: "/", description: "\"/\"" },
        peg$c87 = "%",
        peg$c88 = { type: "literal", value: "%", description: "\"%\"" },
        peg$c89 = "not",
        peg$c90 = { type: "literal", value: "not", description: "\"not\"" },
        peg$c91 = function(expr) { return makeOperatorFunction({ type: "operator", operator: "!", args: [ item ] }); },
        peg$c92 = function(first, others) { return resolveExpressionBinaryOp(first, others); },
        peg$c93 = function(item) { return makeOperatorFunction({ type: "operator", operator: "-", args: [ item ] }); },
        peg$c94 = function(expr) { return expr; },
        peg$c95 = function(name) { return { type: "variable", name: name }; },
        peg$c96 = ".",
        peg$c97 = { type: "literal", value: ".", description: "\".\"" },
        peg$c98 = function(expr, field) { return { type: "field", value: expr, fieldName: field }; },
        peg$c99 = function(name, args) { return { type: "function", name: name, args: resolveArgumentList(args) }; },
        peg$c100 = function(expr) { return { value: expr }; },
        peg$c101 = function(value) { return { type: "value", valueType: "float", value: value }; },
        peg$c102 = function(value) { return { type: "value", valueType: "bool", value: value }; },
        peg$c103 = function(value) { return { type: "value", valueType: "int", value: value }; },
        peg$c104 = function(first, others) {
              var list = resolveList(first, others, 3);
              return { type: "value", valueType: "Vector" + list.length, value: list };
            },
        peg$c105 = /^[+\-]/,
        peg$c106 = { type: "class", value: "[+-]", description: "[+-]" },
        peg$c107 = /^[0-9]/,
        peg$c108 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c109 = function(str) { return parseFloat(flatten(str)); },
        peg$c110 = /^[eE]/,
        peg$c111 = { type: "class", value: "[eE]", description: "[eE]" },
        peg$c112 = "true",
        peg$c113 = { type: "literal", value: "true", description: "\"true\"" },
        peg$c114 = function() { return true; },
        peg$c115 = "false",
        peg$c116 = { type: "literal", value: "false", description: "\"false\"" },
        peg$c117 = function() { return false; },
        peg$c118 = /^[a-zA-Z_]/,
        peg$c119 = { type: "class", value: "[a-zA-Z_]", description: "[a-zA-Z_]" },
        peg$c120 = /^[a-zA-Z0-9_]/,
        peg$c121 = { type: "class", value: "[a-zA-Z0-9_]", description: "[a-zA-Z0-9_]" },
        peg$c122 = function(name) { return flatten(name); },
        peg$c123 = /^[ \t\n]/,
        peg$c124 = { type: "class", value: "[ \\t\\n]", description: "[ \\t\\n]" },
        peg$c125 = function() { return ' '; },

        peg$currPos          = 0,
        peg$savedPos         = 0,
        peg$posDetailsCache  = [{ line: 1, column: 1, seenCR: false }],
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$savedPos, peg$currPos);
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function error(message) {
      throw peg$buildException(
        message,
        null,
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos],
          p, ch;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line:   details.line,
          column: details.column,
          seenCR: details.seenCR
        };

        while (p < pos) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails   = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line:   startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line:   endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, found, location) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new peg$SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        location
      );
    }

    function peg$parseStart() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parseFileBlock();
        if (s4 !== peg$FAILED) {
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parseFileBlock();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c0(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseFileBlock() {
      var s0;

      s0 = peg$parseFunction();
      if (s0 === peg$FAILED) {
        s0 = peg$parseGlobalVariable();
        if (s0 === peg$FAILED) {
          s0 = peg$parseImportStatement();
        }
      }

      return s0;
    }

    function peg$parseFunction() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13;

      s0 = peg$currPos;
      s1 = peg$parseName();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseName();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 40) {
                s5 = peg$c1;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c2); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parseFunctionArgumentList();
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 41) {
                    s7 = peg$c3;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c4); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 123) {
                        s9 = peg$c5;
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c6); }
                      }
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parse_();
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parseStatements();
                          if (s11 !== peg$FAILED) {
                            s12 = peg$parse_();
                            if (s12 !== peg$FAILED) {
                              if (input.charCodeAt(peg$currPos) === 125) {
                                s13 = peg$c7;
                                peg$currPos++;
                              } else {
                                s13 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c8); }
                              }
                              if (s13 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s1 = peg$c9(s1, s3, s6, s11);
                                s0 = s1;
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseGlobalVariable() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      s0 = peg$currPos;
      s1 = peg$parseName();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseName();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 61) {
                s5 = peg$c10;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseValue();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 59) {
                        s9 = peg$c12;
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c13); }
                      }
                      if (s9 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c14(s1, s3, s7);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseName();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse__();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseName();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_();
              if (s4 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 59) {
                  s5 = peg$c12;
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c13); }
                }
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c15(s1, s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseImportStatement() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c16) {
        s1 = peg$c16;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c17); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 42) {
            s3 = peg$c18;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c19); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 4) === peg$c20) {
                s5 = peg$c20;
                peg$currPos += 4;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c21); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse__();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseName();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 59) {
                        s9 = peg$c12;
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c13); }
                      }
                      if (s9 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c22(s7);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 6) === peg$c16) {
          s1 = peg$c16;
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c17); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse__();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseName();
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$currPos;
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 44) {
                  s7 = peg$c23;
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c24); }
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parse_();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parseName();
                    if (s9 !== peg$FAILED) {
                      s6 = [s6, s7, s8, s9];
                      s5 = s6;
                    } else {
                      peg$currPos = s5;
                      s5 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$currPos;
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 44) {
                    s7 = peg$c23;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c24); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parseName();
                      if (s9 !== peg$FAILED) {
                        s6 = [s6, s7, s8, s9];
                        s5 = s6;
                      } else {
                        peg$currPos = s5;
                        s5 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s5;
                      s5 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse__();
                if (s5 !== peg$FAILED) {
                  if (input.substr(peg$currPos, 4) === peg$c20) {
                    s6 = peg$c20;
                    peg$currPos += 4;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c21); }
                  }
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parse__();
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parseName();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parse_();
                        if (s9 !== peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 59) {
                            s10 = peg$c12;
                            peg$currPos++;
                          } else {
                            s10 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c13); }
                          }
                          if (s10 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c25(s3, s4, s8);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseFunctionArgumentList() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseFunctionArgument();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s6 = peg$c23;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c24); }
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parse_();
              if (s7 !== peg$FAILED) {
                s8 = peg$parseFunctionArgument();
                if (s8 !== peg$FAILED) {
                  s5 = [s5, s6, s7, s8];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s6 = peg$c23;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c24); }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseFunctionArgument();
                  if (s8 !== peg$FAILED) {
                    s5 = [s5, s6, s7, s8];
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c26(s2, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c27();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseFunctionArgument() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseName();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseName();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 61) {
                s5 = peg$c10;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseValue();
                  if (s7 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c28(s1, s3, s7);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseName();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse__();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseName();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c29(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseStatements() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseStatement();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseStatement();
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseStatement();
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c30(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c27();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseStatement() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseReturnStatement();
      if (s1 === peg$FAILED) {
        s1 = peg$parseEmitStatement();
        if (s1 === peg$FAILED) {
          s1 = peg$parseVariableDeclaration();
          if (s1 === peg$FAILED) {
            s1 = peg$parseVariableAssignment();
            if (s1 === peg$FAILED) {
              s1 = peg$parseExpressionStatement();
            }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 59) {
            s3 = peg$c12;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c31(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseForLoop();
        if (s0 === peg$FAILED) {
          s0 = peg$parseIfStatement();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 123) {
              s1 = peg$c5;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c6); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 !== peg$FAILED) {
                s3 = peg$parseStatements();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_();
                  if (s4 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 125) {
                      s5 = peg$c7;
                      peg$currPos++;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c8); }
                    }
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c32(s3);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          }
        }
      }

      return s0;
    }

    function peg$parseReturnStatement() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c33) {
        s1 = peg$c33;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c34); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseExpressionLevel1();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c35(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseEmitStatement() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c36) {
        s1 = peg$c36;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c37); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 91) {
            s3 = peg$c38;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c39); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseEmitVertexList();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 93) {
                s5 = peg$c40;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c41); }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c42(s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseEmitArgument() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseName();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c43;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c44); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseExpressionLevel1();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c45(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseEmitArgumentList() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseEmitArgument();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s6 = peg$c23;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c24); }
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parse_();
              if (s7 !== peg$FAILED) {
                s8 = peg$parseEmitArgument();
                if (s8 !== peg$FAILED) {
                  s5 = [s5, s6, s7, s8];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s6 = peg$c23;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c24); }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseEmitArgument();
                  if (s8 !== peg$FAILED) {
                    s5 = [s5, s6, s7, s8];
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c46(s2, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c47();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseEmitVertexList() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 123) {
          s2 = peg$c5;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c6); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseEmitArgumentList();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 125) {
              s4 = peg$c7;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c8); }
            }
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$currPos;
              s7 = peg$parse_();
              if (s7 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 44) {
                  s8 = peg$c23;
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c24); }
                }
                if (s8 !== peg$FAILED) {
                  s9 = peg$parse_();
                  if (s9 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 123) {
                      s10 = peg$c5;
                      peg$currPos++;
                    } else {
                      s10 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c6); }
                    }
                    if (s10 !== peg$FAILED) {
                      s11 = peg$parseEmitArgumentList();
                      if (s11 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                          s12 = peg$c7;
                          peg$currPos++;
                        } else {
                          s12 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c8); }
                        }
                        if (s12 !== peg$FAILED) {
                          s7 = [s7, s8, s9, s10, s11, s12];
                          s6 = s7;
                        } else {
                          peg$currPos = s6;
                          s6 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s6;
                        s6 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s6;
                      s6 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$currPos;
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 44) {
                    s8 = peg$c23;
                    peg$currPos++;
                  } else {
                    s8 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c24); }
                  }
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parse_();
                    if (s9 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 123) {
                        s10 = peg$c5;
                        peg$currPos++;
                      } else {
                        s10 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c6); }
                      }
                      if (s10 !== peg$FAILED) {
                        s11 = peg$parseEmitArgumentList();
                        if (s11 !== peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 125) {
                            s12 = peg$c7;
                            peg$currPos++;
                          } else {
                            s12 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c8); }
                          }
                          if (s12 !== peg$FAILED) {
                            s7 = [s7, s8, s9, s10, s11, s12];
                            s6 = s7;
                          } else {
                            peg$currPos = s6;
                            s6 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s6;
                          s6 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s6;
                        s6 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s6;
                      s6 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c48(s3, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c27();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseExpressionStatement() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseExpressionLevel1();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c49(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseVariableDeclaration() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseName();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseName();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 61) {
                s5 = peg$c10;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseExpressionLevel1();
                  if (s7 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c50(s1, s3, s7);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseName();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseName();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c51(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseVariableAssignment() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseName();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 61) {
            s3 = peg$c10;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseExpressionLevel1();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c52(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseForLoop() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c53) {
        s1 = peg$c53;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c54); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 40) {
            s3 = peg$c1;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c2); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseName();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  if (input.substr(peg$currPos, 2) === peg$c55) {
                    s7 = peg$c55;
                    peg$currPos += 2;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c56); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parseInteger();
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parse_();
                        if (s10 !== peg$FAILED) {
                          if (input.substr(peg$currPos, 2) === peg$c57) {
                            s11 = peg$c57;
                            peg$currPos += 2;
                          } else {
                            s11 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c58); }
                          }
                          if (s11 !== peg$FAILED) {
                            s12 = peg$parse_();
                            if (s12 !== peg$FAILED) {
                              s13 = peg$parseInteger();
                              if (s13 !== peg$FAILED) {
                                s14 = peg$parse_();
                                if (s14 !== peg$FAILED) {
                                  if (input.charCodeAt(peg$currPos) === 41) {
                                    s15 = peg$c3;
                                    peg$currPos++;
                                  } else {
                                    s15 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c4); }
                                  }
                                  if (s15 !== peg$FAILED) {
                                    s16 = peg$parse_();
                                    if (s16 !== peg$FAILED) {
                                      s17 = peg$parseStatement();
                                      if (s17 !== peg$FAILED) {
                                        peg$savedPos = s0;
                                        s1 = peg$c59(s5, s9, s13, s17);
                                        s0 = s1;
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$FAILED;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseIfStatement() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c60) {
        s1 = peg$c60;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c61); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 40) {
            s3 = peg$c1;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c2); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseExpressionLevel1();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 41) {
                    s7 = peg$c3;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c4); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parseStatement();
                      if (s9 !== peg$FAILED) {
                        s10 = [];
                        s11 = peg$currPos;
                        s12 = peg$parse_();
                        if (s12 !== peg$FAILED) {
                          if (input.substr(peg$currPos, 4) === peg$c62) {
                            s13 = peg$c62;
                            peg$currPos += 4;
                          } else {
                            s13 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c63); }
                          }
                          if (s13 !== peg$FAILED) {
                            s14 = peg$parse__();
                            if (s14 !== peg$FAILED) {
                              if (input.substr(peg$currPos, 2) === peg$c60) {
                                s15 = peg$c60;
                                peg$currPos += 2;
                              } else {
                                s15 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c61); }
                              }
                              if (s15 !== peg$FAILED) {
                                s16 = peg$parse_();
                                if (s16 !== peg$FAILED) {
                                  if (input.charCodeAt(peg$currPos) === 40) {
                                    s17 = peg$c1;
                                    peg$currPos++;
                                  } else {
                                    s17 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c2); }
                                  }
                                  if (s17 !== peg$FAILED) {
                                    s18 = peg$parse_();
                                    if (s18 !== peg$FAILED) {
                                      s19 = peg$parseExpressionLevel1();
                                      if (s19 !== peg$FAILED) {
                                        s20 = peg$parse_();
                                        if (s20 !== peg$FAILED) {
                                          if (input.charCodeAt(peg$currPos) === 41) {
                                            s21 = peg$c3;
                                            peg$currPos++;
                                          } else {
                                            s21 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c4); }
                                          }
                                          if (s21 !== peg$FAILED) {
                                            s22 = peg$parse_();
                                            if (s22 !== peg$FAILED) {
                                              s23 = peg$parseStatement();
                                              if (s23 !== peg$FAILED) {
                                                s12 = [s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23];
                                                s11 = s12;
                                              } else {
                                                peg$currPos = s11;
                                                s11 = peg$FAILED;
                                              }
                                            } else {
                                              peg$currPos = s11;
                                              s11 = peg$FAILED;
                                            }
                                          } else {
                                            peg$currPos = s11;
                                            s11 = peg$FAILED;
                                          }
                                        } else {
                                          peg$currPos = s11;
                                          s11 = peg$FAILED;
                                        }
                                      } else {
                                        peg$currPos = s11;
                                        s11 = peg$FAILED;
                                      }
                                    } else {
                                      peg$currPos = s11;
                                      s11 = peg$FAILED;
                                    }
                                  } else {
                                    peg$currPos = s11;
                                    s11 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s11;
                                  s11 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s11;
                                s11 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s11;
                              s11 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s11;
                            s11 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s11;
                          s11 = peg$FAILED;
                        }
                        while (s11 !== peg$FAILED) {
                          s10.push(s11);
                          s11 = peg$currPos;
                          s12 = peg$parse_();
                          if (s12 !== peg$FAILED) {
                            if (input.substr(peg$currPos, 4) === peg$c62) {
                              s13 = peg$c62;
                              peg$currPos += 4;
                            } else {
                              s13 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c63); }
                            }
                            if (s13 !== peg$FAILED) {
                              s14 = peg$parse__();
                              if (s14 !== peg$FAILED) {
                                if (input.substr(peg$currPos, 2) === peg$c60) {
                                  s15 = peg$c60;
                                  peg$currPos += 2;
                                } else {
                                  s15 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c61); }
                                }
                                if (s15 !== peg$FAILED) {
                                  s16 = peg$parse_();
                                  if (s16 !== peg$FAILED) {
                                    if (input.charCodeAt(peg$currPos) === 40) {
                                      s17 = peg$c1;
                                      peg$currPos++;
                                    } else {
                                      s17 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c2); }
                                    }
                                    if (s17 !== peg$FAILED) {
                                      s18 = peg$parse_();
                                      if (s18 !== peg$FAILED) {
                                        s19 = peg$parseExpressionLevel1();
                                        if (s19 !== peg$FAILED) {
                                          s20 = peg$parse_();
                                          if (s20 !== peg$FAILED) {
                                            if (input.charCodeAt(peg$currPos) === 41) {
                                              s21 = peg$c3;
                                              peg$currPos++;
                                            } else {
                                              s21 = peg$FAILED;
                                              if (peg$silentFails === 0) { peg$fail(peg$c4); }
                                            }
                                            if (s21 !== peg$FAILED) {
                                              s22 = peg$parse_();
                                              if (s22 !== peg$FAILED) {
                                                s23 = peg$parseStatement();
                                                if (s23 !== peg$FAILED) {
                                                  s12 = [s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23];
                                                  s11 = s12;
                                                } else {
                                                  peg$currPos = s11;
                                                  s11 = peg$FAILED;
                                                }
                                              } else {
                                                peg$currPos = s11;
                                                s11 = peg$FAILED;
                                              }
                                            } else {
                                              peg$currPos = s11;
                                              s11 = peg$FAILED;
                                            }
                                          } else {
                                            peg$currPos = s11;
                                            s11 = peg$FAILED;
                                          }
                                        } else {
                                          peg$currPos = s11;
                                          s11 = peg$FAILED;
                                        }
                                      } else {
                                        peg$currPos = s11;
                                        s11 = peg$FAILED;
                                      }
                                    } else {
                                      peg$currPos = s11;
                                      s11 = peg$FAILED;
                                    }
                                  } else {
                                    peg$currPos = s11;
                                    s11 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s11;
                                  s11 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s11;
                                s11 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s11;
                              s11 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s11;
                            s11 = peg$FAILED;
                          }
                        }
                        if (s10 !== peg$FAILED) {
                          s11 = peg$currPos;
                          s12 = peg$parse_();
                          if (s12 !== peg$FAILED) {
                            if (input.substr(peg$currPos, 4) === peg$c62) {
                              s13 = peg$c62;
                              peg$currPos += 4;
                            } else {
                              s13 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c63); }
                            }
                            if (s13 !== peg$FAILED) {
                              s14 = peg$parse_();
                              if (s14 !== peg$FAILED) {
                                s15 = peg$parseStatement();
                                if (s15 !== peg$FAILED) {
                                  s12 = [s12, s13, s14, s15];
                                  s11 = s12;
                                } else {
                                  peg$currPos = s11;
                                  s11 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s11;
                                s11 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s11;
                              s11 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s11;
                            s11 = peg$FAILED;
                          }
                          if (s11 === peg$FAILED) {
                            s11 = null;
                          }
                          if (s11 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c64(s5, s9, s10, s11);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseExpressionOp1() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c65) {
        s0 = peg$c65;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c66); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c67) {
          s0 = peg$c67;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c68); }
        }
      }

      return s0;
    }

    function peg$parseExpressionOp2() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c69) {
        s0 = peg$c69;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c70); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 62) {
          s0 = peg$c71;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c72); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c73) {
            s0 = peg$c73;
            peg$currPos += 2;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c74); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 60) {
              s0 = peg$c75;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c76); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c77) {
                s0 = peg$c77;
                peg$currPos += 2;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c78); }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 2) === peg$c79) {
                  s0 = peg$c79;
                  peg$currPos += 2;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c80); }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseExpressionOp3() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 43) {
        s0 = peg$c81;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c82); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s0 = peg$c83;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c84); }
        }
      }

      return s0;
    }

    function peg$parseExpressionOp4() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 42) {
        s0 = peg$c18;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c19); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 47) {
          s0 = peg$c85;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c86); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 37) {
            s0 = peg$c87;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c88); }
          }
        }
      }

      return s0;
    }

    function peg$parseExpressionLevel1() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c89) {
        s1 = peg$c89;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c90); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseExpressionLevel1();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c91(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseExpressionLevel2();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseExpressionOp1();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseExpressionLevel2();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseExpressionOp1();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseExpressionLevel2();
                  if (s7 !== peg$FAILED) {
                    s4 = [s4, s5, s6, s7];
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c92(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseExpressionLevel2() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseExpressionLevel3();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseExpressionOp2();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseExpressionLevel3();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseExpressionOp2();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseExpressionLevel3();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c92(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseExpressionLevel3();
      }

      return s0;
    }

    function peg$parseExpressionLevel3() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseExpressionLevel4();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseExpressionOp3();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseExpressionLevel4();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseExpressionOp3();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseExpressionLevel4();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c92(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseExpressionLevel4();
      }

      return s0;
    }

    function peg$parseExpressionLevel4() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseExpressionLevelN();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseExpressionOp4();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseExpressionLevelN();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseExpressionOp4();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseExpressionLevelN();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c92(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseExpressionLevelN();
      }

      return s0;
    }

    function peg$parseExpressionLevelN() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 45) {
        s1 = peg$c83;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c84); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseExpressionItem();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c93(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseExpressionItem();
      }

      return s0;
    }

    function peg$parseExpressionParenthesis() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 40) {
        s1 = peg$c1;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c2); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseExpressionLevel1();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 41) {
                s5 = peg$c3;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c4); }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c94(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseExpressionItem() {
      var s0;

      s0 = peg$parseExpressionFunction();
      if (s0 === peg$FAILED) {
        s0 = peg$parseExpressionField();
        if (s0 === peg$FAILED) {
          s0 = peg$parseExpressionVariable();
          if (s0 === peg$FAILED) {
            s0 = peg$parseExpressionValue();
            if (s0 === peg$FAILED) {
              s0 = peg$parseExpressionParenthesis();
            }
          }
        }
      }

      return s0;
    }

    function peg$parseExpressionVariable() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseName();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c95(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseExpressionField() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseExpressionFunction();
      if (s1 === peg$FAILED) {
        s1 = peg$parseExpressionVariable();
        if (s1 === peg$FAILED) {
          s1 = peg$parseExpressionParenthesis();
        }
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 46) {
          s2 = peg$c96;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c97); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseName();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c98(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseExpressionFunction() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseName();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 40) {
            s3 = peg$c1;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c2); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseExpressionFunctionArgumentList();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 41) {
                s5 = peg$c3;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c4); }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c99(s1, s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseExpressionFunctionArgumentList() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseExpressionArgument();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s6 = peg$c23;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c24); }
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parse_();
              if (s7 !== peg$FAILED) {
                s8 = peg$parseExpressionArgument();
                if (s8 !== peg$FAILED) {
                  s5 = [s5, s6, s7, s8];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s6 = peg$c23;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c24); }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseExpressionArgument();
                  if (s8 !== peg$FAILED) {
                    s5 = [s5, s6, s7, s8];
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c26(s2, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c27();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseExpressionArgument() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseName();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 61) {
            s3 = peg$c10;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseExpressionLevel1();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c45(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseExpressionLevel1();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c100(s1);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseExpressionValue() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      s0 = peg$currPos;
      s1 = peg$parseFloat();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c101(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseInteger();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c102(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseBoolean();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c103(s1);
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 91) {
              s1 = peg$c38;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c39); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 !== peg$FAILED) {
                s3 = peg$parseFloat();
                if (s3 !== peg$FAILED) {
                  s4 = [];
                  s5 = peg$currPos;
                  s6 = peg$parse_();
                  if (s6 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 44) {
                      s7 = peg$c23;
                      peg$currPos++;
                    } else {
                      s7 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c24); }
                    }
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parse_();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parseFloat();
                        if (s9 !== peg$FAILED) {
                          s6 = [s6, s7, s8, s9];
                          s5 = s6;
                        } else {
                          peg$currPos = s5;
                          s5 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s5;
                        s5 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s5;
                      s5 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                  while (s5 !== peg$FAILED) {
                    s4.push(s5);
                    s5 = peg$currPos;
                    s6 = peg$parse_();
                    if (s6 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 44) {
                        s7 = peg$c23;
                        peg$currPos++;
                      } else {
                        s7 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c24); }
                      }
                      if (s7 !== peg$FAILED) {
                        s8 = peg$parse_();
                        if (s8 !== peg$FAILED) {
                          s9 = peg$parseFloat();
                          if (s9 !== peg$FAILED) {
                            s6 = [s6, s7, s8, s9];
                            s5 = s6;
                          } else {
                            peg$currPos = s5;
                            s5 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s5;
                          s5 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s5;
                        s5 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s5;
                      s5 = peg$FAILED;
                    }
                  }
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parse_();
                    if (s5 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 93) {
                        s6 = peg$c40;
                        peg$currPos++;
                      } else {
                        s6 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c41); }
                      }
                      if (s6 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c104(s3, s4);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          }
        }
      }

      return s0;
    }

    function peg$parseValue() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      s0 = peg$parseFloat();
      if (s0 === peg$FAILED) {
        s0 = peg$parseInteger();
        if (s0 === peg$FAILED) {
          s0 = peg$parseBoolean();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 91) {
              s1 = peg$c38;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c39); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 !== peg$FAILED) {
                s3 = peg$parseFloat();
                if (s3 !== peg$FAILED) {
                  s4 = [];
                  s5 = peg$currPos;
                  s6 = peg$parse_();
                  if (s6 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 44) {
                      s7 = peg$c23;
                      peg$currPos++;
                    } else {
                      s7 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c24); }
                    }
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parse_();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parseFloat();
                        if (s9 !== peg$FAILED) {
                          s6 = [s6, s7, s8, s9];
                          s5 = s6;
                        } else {
                          peg$currPos = s5;
                          s5 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s5;
                        s5 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s5;
                      s5 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                  while (s5 !== peg$FAILED) {
                    s4.push(s5);
                    s5 = peg$currPos;
                    s6 = peg$parse_();
                    if (s6 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 44) {
                        s7 = peg$c23;
                        peg$currPos++;
                      } else {
                        s7 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c24); }
                      }
                      if (s7 !== peg$FAILED) {
                        s8 = peg$parse_();
                        if (s8 !== peg$FAILED) {
                          s9 = peg$parseFloat();
                          if (s9 !== peg$FAILED) {
                            s6 = [s6, s7, s8, s9];
                            s5 = s6;
                          } else {
                            peg$currPos = s5;
                            s5 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s5;
                          s5 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s5;
                        s5 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s5;
                      s5 = peg$FAILED;
                    }
                  }
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parse_();
                    if (s5 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 93) {
                        s6 = peg$c40;
                        peg$currPos++;
                      } else {
                        s6 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c41); }
                      }
                      if (s6 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c26(s3, s4);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          }
        }
      }

      return s0;
    }

    function peg$parseInteger() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (peg$c105.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c106); }
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (peg$c107.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c108); }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c107.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c108); }
            }
          }
        } else {
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c109(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseFloat() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (peg$c105.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c106); }
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (peg$c107.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c108); }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c107.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c108); }
            }
          }
        } else {
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 46) {
            s5 = peg$c96;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c97); }
          }
          if (s5 !== peg$FAILED) {
            s6 = [];
            if (peg$c107.test(input.charAt(peg$currPos))) {
              s7 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s7 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c108); }
            }
            if (s7 !== peg$FAILED) {
              while (s7 !== peg$FAILED) {
                s6.push(s7);
                if (peg$c107.test(input.charAt(peg$currPos))) {
                  s7 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c108); }
                }
              }
            } else {
              s6 = peg$FAILED;
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            if (peg$c110.test(input.charAt(peg$currPos))) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c111); }
            }
            if (s6 !== peg$FAILED) {
              if (peg$c105.test(input.charAt(peg$currPos))) {
                s7 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c106); }
              }
              if (s7 === peg$FAILED) {
                s7 = null;
              }
              if (s7 !== peg$FAILED) {
                s8 = [];
                if (peg$c107.test(input.charAt(peg$currPos))) {
                  s9 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s9 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c108); }
                }
                if (s9 !== peg$FAILED) {
                  while (s9 !== peg$FAILED) {
                    s8.push(s9);
                    if (peg$c107.test(input.charAt(peg$currPos))) {
                      s9 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s9 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c108); }
                    }
                  }
                } else {
                  s8 = peg$FAILED;
                }
                if (s8 !== peg$FAILED) {
                  s6 = [s6, s7, s8];
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            if (s5 !== peg$FAILED) {
              s2 = [s2, s3, s4, s5];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c109(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseBoolean() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c112) {
        s1 = peg$c112;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c113); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c114();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 5) === peg$c115) {
          s1 = peg$c115;
          peg$currPos += 5;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c116); }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c117();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseName() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (peg$c118.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c119); }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (peg$c120.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c121); }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          if (peg$c120.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c121); }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c122(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c123.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c124); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c123.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c124); }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c125();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse__() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c123.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c124); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c123.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c124); }
          }
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c125();
      }
      s0 = s1;

      return s0;
    }


        function flatten(vars) {
            if(vars instanceof Array) {
                var r = "";
                for(var i = 0; i < vars.length; i++)
                    r += flatten(vars[i]);
                return r;
            } else return vars || "";
        }

        function resolveList(first, others, k) {
            if(others) {
                return [ first ].concat(others.map(function(d) { return d[k]; }));
            } else {
                return [ first ];
            }
        }

        function resolveExpressionBinaryOp(first, others) {
            var expr = first;
            others.forEach(function(d) {
              var op = d[1];
              var rhs = d[3];
              expr = makeOperatorFunction({ type: "operator", operator: op, args: [ expr, rhs ] });
            });
            return expr;
        }

        function resolveArgumentList(list) {
            var result = { args: [], kwargs: {} };
            list.forEach(function(d) {
                if(d.name !== undefined) {
                    result.kwargs[d.name] = d.value;
                } else {
                    result.args.push(d.value);
                }
            });
            return result;
        }

        function makeOperatorFunction(op) {
            return { type: "function", name: "@" + op.operator, args: { args: op.args, kwargs: {} } };
        }


    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(
        null,
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length
          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse:       peg$parse
  };
})();

},{}],7:[function(require,module,exports){
"use strict";
var exceptions_1 = require("../exceptions");
var utils_1 = require("../utils");
var Intrinsics = require("../intrinsics");
var Context = (function () {
    function Context() {
        this._variables = new utils_1.Dictionary();
    }
    Context.prototype.get = function (name) {
        if (!this._variables.has(name)) {
            throw new exceptions_1.RuntimeError("'" + name + "' is undefined.");
        }
        return this._variables.get(name);
    };
    Context.prototype.set = function (name, value) {
        this._variables.set(name, value);
    };
    Context.prototype.evaluateExpression = function (expression) {
        var _this = this;
        switch (expression.type) {
            case "function": {
                var expr = expression;
                var args = expr.arguments.map(function (arg) { return _this.evaluateExpression(arg); });
                var func = Intrinsics.getIntrinsicFunction(expr.functionName);
                if (!func) {
                    throw new exceptions_1.RuntimeError("function '" + expr.functionName + "' is undefined.");
                }
                return func.javascriptImplementation.apply(func, args);
            }
            case "field": {
                var expr = expression;
                var value = this.evaluateExpression(expr.value);
                switch (expr.fieldName) {
                    case "x": return value[0];
                    case "y": return value[1];
                    case "z": return value[2];
                    case "w": return value[3];
                    case "r": return value[0];
                    case "g": return value[1];
                    case "b": return value[2];
                    case "a": return value[3];
                }
                throw new exceptions_1.RuntimeError("invalid field.");
            }
            case "constant": {
                var expr = expression;
                return expr.value;
            }
            case "variable": {
                var expr = expression;
                return this.get(expr.variableName);
            }
        }
    };
    Context.prototype.evaluateStatement = function (statement) {
        switch (statement.type) {
            case "assign": {
                var s = statement;
                this.set(s.variableName, this.evaluateExpression(s.expression));
                return [];
            }
            case "condition": {
                var s = statement;
                var condition = this.evaluateExpression(s.condition);
                if (condition != 0) {
                    return this.evaluateStatements(s.trueStatements);
                }
                else {
                    return this.evaluateStatements(s.falseStatements);
                }
            }
            case "emit": {
                var s = statement;
                var emitInfo = {};
                for (var name_1 in s.attributes) {
                    var value = this.evaluateExpression(s.attributes[name_1]);
                    emitInfo[name_1] = value;
                }
                return [emitInfo];
            }
        }
    };
    Context.prototype.evaluateStatements = function (statements) {
        var result = [];
        for (var _i = 0, statements_1 = statements; _i < statements_1.length; _i++) {
            var s = statements_1[_i];
            var v = this.evaluateStatement(s);
            for (var _a = 0, v_1 = v; _a < v_1.length; _a++) {
                var r = v_1[_a];
                result.push(r);
            }
        }
        return result;
    };
    Context.prototype.evaluateShape = function (shape, inputs) {
        for (var name_2 in inputs) {
            this.set(name_2, inputs[name_2]);
        }
        return this.evaluateStatements(shape.statements);
    };
    return Context;
}());
exports.Context = Context;

},{"../exceptions":8,"../intrinsics":9,"../utils":23}],8:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
// Base class for errors.
var BaseError = (function (_super) {
    __extends(BaseError, _super);
    function BaseError(message) {
        _super.call(this, message);
        this.stack = (new Error(message)).stack;
    }
    return BaseError;
}(Error));
exports.BaseError = BaseError;
// Parse error.
var ParseError = (function (_super) {
    __extends(ParseError, _super);
    function ParseError(message, start, end) {
        _super.call(this, message);
        this.name = "ParseError";
        this.message = message;
        this.start = start;
        this.end = end;
    }
    return ParseError;
}(BaseError));
exports.ParseError = ParseError;
// Compile error.
var CompileError = (function (_super) {
    __extends(CompileError, _super);
    function CompileError(message, start, end) {
        _super.call(this, message);
        this.name = "CompileError";
        this.message = message;
        this.start = start;
        this.end = end;
    }
    return CompileError;
}(BaseError));
exports.CompileError = CompileError;
// Runtime error.
var RuntimeError = (function (_super) {
    __extends(RuntimeError, _super);
    function RuntimeError(message, start, end) {
        _super.call(this, message);
        this.name = "RuntimeError";
        this.message = message;
        this.start = start;
        this.end = end;
    }
    return RuntimeError;
}(BaseError));
exports.RuntimeError = RuntimeError;

},{}],9:[function(require,module,exports){
"use strict";
var utils_1 = require("./utils");
var math_1 = require("./math");
// Global intrinsic functions.
var intrinsicFunctions = new utils_1.Dictionary();
var intrinsicFunctionList = [];
var typeConversions = new utils_1.Dictionary();
var constants = new utils_1.Dictionary();
function getInternalName(func) {
    return "@" + func.name + ":" + func.argTypes.join(",") + ":" + func.returnType;
}
exports.getInternalName = getInternalName;
function getIntrinsicFunction(internalName) {
    if (!intrinsicFunctions.has(internalName)) {
        console.log(internalName);
    }
    return intrinsicFunctions.get(internalName);
}
exports.getIntrinsicFunction = getIntrinsicFunction;
function forEachIntrinsicFunction(callback) {
    intrinsicFunctionList.forEach(callback);
}
exports.forEachIntrinsicFunction = forEachIntrinsicFunction;
function addIntrinsicFunction(func) {
    func.internalName = getInternalName(func);
    intrinsicFunctions.set(func.internalName, func);
    intrinsicFunctionList.push(func);
}
exports.addIntrinsicFunction = addIntrinsicFunction;
function addConstant(name, type, value) {
    var constant = {
        name: name,
        type: type,
        value: value
    };
    constants.set(name, constant);
}
exports.addConstant = addConstant;
function forEachConstant(callback) {
    constants.forEach(callback);
}
exports.forEachConstant = forEachConstant;
function forEachTypeConversion(callback) {
    typeConversions.forEach(callback);
}
exports.forEachTypeConversion = forEachTypeConversion;
function getTypeConversion(srcType, destType) {
    return typeConversions.get(srcType + ":" + destType);
}
exports.getTypeConversion = getTypeConversion;
function RegisterTypeConversion(srcType, destType, rank, func) {
    var name = "cast:" + srcType + ":" + destType;
    var info = {
        name: name, argTypes: [srcType], returnType: destType, javascriptImplementation: func
    };
    addIntrinsicFunction(info);
    typeConversions.set(srcType + ":" + destType, { internalName: info.internalName, rank: rank });
}
function RegisterFunction(name, argTypes, returnType, func) {
    addIntrinsicFunction({
        name: name, argTypes: argTypes, returnType: returnType, javascriptImplementation: func
    });
}
function RegisterOperator(name, argTypes, returnType, func) {
    addIntrinsicFunction({
        name: "@" + name, argTypes: argTypes, returnType: returnType, javascriptImplementation: func
    });
}
var RegisterConstructor = function (type, srcTypes, func) { return RegisterFunction(type, srcTypes, type, func); };
// Basic arithmetics: +, -, *, /.
RegisterOperator("+", ["float", "float"], "float", function (a, b) { return a + b; });
RegisterOperator("-", ["float", "float"], "float", function (a, b) { return a - b; });
RegisterOperator("*", ["float", "float"], "float", function (a, b) { return a * b; });
RegisterOperator("/", ["float", "float"], "float", function (a, b) { return a / b; });
RegisterOperator("+", ["float"], "float", function (a) { return +a; });
RegisterOperator("-", ["float"], "float", function (a) { return -a; });
RegisterOperator("%", ["int", "int"], "int", function (a, b) { return a % b; });
RegisterOperator("%", ["float", "float"], "float", function (a, b) { return a % b; });
RegisterOperator("+", ["int", "int"], "int", function (a, b) { return a + b; });
RegisterOperator("-", ["int", "int"], "int", function (a, b) { return a - b; });
RegisterOperator("*", ["int", "int"], "int", function (a, b) { return a * b; });
RegisterOperator("/", ["int", "int"], "int", function (a, b) { return a / b; });
RegisterOperator("+", ["int"], "int", function (a) { return +a; });
RegisterOperator("-", ["int"], "int", function (a) { return -a; });
RegisterOperator("+", ["Vector2", "Vector2"], "Vector2", function (a, b) { return [a[0] + b[0], a[1] + b[1]]; });
RegisterOperator("-", ["Vector2", "Vector2"], "Vector2", function (a, b) { return [a[0] - b[0], a[1] - b[1]]; });
RegisterOperator("*", ["Vector2", "Vector2"], "Vector2", function (a, b) { return [a[0] * b[0], a[1] * b[1]]; });
RegisterOperator("/", ["Vector2", "Vector2"], "Vector2", function (a, b) { return [a[0] / b[0], a[1] / b[1]]; });
RegisterOperator("+", ["Vector2"], "Vector2", function (a) { return a; });
RegisterOperator("-", ["Vector2"], "Vector2", function (a) { return [-a[0], -a[1]]; });
RegisterOperator("+", ["Vector3", "Vector3"], "Vector3", function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; });
RegisterOperator("-", ["Vector3", "Vector3"], "Vector3", function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; });
RegisterOperator("*", ["Vector3", "Vector3"], "Vector3", function (a, b) { return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; });
RegisterOperator("/", ["Vector3", "Vector3"], "Vector3", function (a, b) { return [a[0] / b[0], a[1] / b[1], a[2] / b[2]]; });
RegisterOperator("+", ["Vector3"], "Vector3", function (a) { return a; });
RegisterOperator("-", ["Vector3"], "Vector3", function (a) { return [-a[0], -a[1], -a[2]]; });
RegisterOperator("+", ["Vector4", "Vector4"], "Vector4", function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]]; });
RegisterOperator("-", ["Vector4", "Vector4"], "Vector4", function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]]; });
RegisterOperator("*", ["Vector4", "Vector4"], "Vector4", function (a, b) { return [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3]]; });
RegisterOperator("/", ["Vector4", "Vector4"], "Vector4", function (a, b) { return [a[0] / b[0], a[1] / b[1], a[2] / b[2], a[3] / b[3]]; });
RegisterOperator("+", ["Vector4"], "Vector4", function (a) { return a; });
RegisterOperator("-", ["Vector4"], "Vector4", function (a) { return [-a[0], -a[1], -a[2], -a[3]]; });
RegisterOperator("*", ["float", "Vector2"], "Vector2", function (a, b) { return [a * b[0], a * b[1]]; });
RegisterOperator("*", ["Vector2", "float"], "Vector2", function (a, b) { return [a[0] * b, a[1] * b]; });
RegisterOperator("*", ["Vector2", "float"], "Vector2", function (a, b) { return [a[0] / b, a[1] / b]; });
RegisterOperator("*", ["float", "Vector3"], "Vector3", function (a, b) { return [a * b[0], a * b[1], a * b[2]]; });
RegisterOperator("*", ["Vector3", "float"], "Vector3", function (a, b) { return [a[0] * b, a[1] * b, a[2] * b]; });
RegisterOperator("*", ["Vector3", "float"], "Vector3", function (a, b) { return [a[0] / b, a[1] / b, a[2] / b]; });
RegisterOperator("*", ["float", "Vector4"], "Vector4", function (a, b) { return [a * b[0], a * b[1], a * b[2], a * b[3]]; });
RegisterOperator("*", ["Vector4", "float"], "Vector4", function (a, b) { return [a[0] * b, a[1] * b, a[2] * b, a[3] * b]; });
RegisterOperator("*", ["Vector4", "float"], "Vector4", function (a, b) { return [a[0] / b, a[1] / b, a[2] / b, a[3] / b]; });
// Comparison operators.
RegisterOperator("==", ["float", "float"], "bool", function (a, b) { return a == b ? 1 : 0; });
RegisterOperator(">", ["float", "float"], "bool", function (a, b) { return a > b ? 1 : 0; });
RegisterOperator("<", ["float", "float"], "bool", function (a, b) { return a < b ? 1 : 0; });
RegisterOperator(">=", ["float", "float"], "bool", function (a, b) { return a >= b ? 1 : 0; });
RegisterOperator("<=", ["float", "float"], "bool", function (a, b) { return a <= b ? 1 : 0; });
RegisterOperator("==", ["int", "int"], "bool", function (a, b) { return a == b ? 1 : 0; });
RegisterOperator(">", ["int", "int"], "bool", function (a, b) { return a > b ? 1 : 0; });
RegisterOperator("<", ["int", "int"], "bool", function (a, b) { return a < b ? 1 : 0; });
RegisterOperator(">=", ["int", "int"], "bool", function (a, b) { return a >= b ? 1 : 0; });
RegisterOperator("<=", ["int", "int"], "bool", function (a, b) { return a <= b ? 1 : 0; });
RegisterOperator("==", ["bool", "bool"], "bool", function (a, b) { return a == b ? 1 : 0; });
// Boolean operators.
RegisterOperator("!", ["bool"], "bool", function (a) { return !a ? 1 : 0; });
RegisterOperator("&&", ["bool", "bool"], "bool", function (a, b) { return a && b ? 1 : 0; });
RegisterOperator("||", ["bool", "bool"], "bool", function (a, b) { return a || b ? 1 : 0; });
// Vector/quaternion constructors.
RegisterConstructor("Vector2", ["float", "float"], function (a, b) { return [a, b]; });
RegisterConstructor("Vector3", ["float", "float", "float"], function (a, b, c) { return [a, b, c]; });
RegisterConstructor("Vector4", ["float", "float", "float", "float"], function (a, b, c, d) { return [a, b, c, d]; });
RegisterConstructor("Color", ["float", "float", "float", "float"], function (a, b, c, d) { return [a, b, c, d]; });
RegisterConstructor("Quaternion", ["float", "float", "float", "float"], function (a, b, c, d) { return [a, b, c, d]; });
// Math functions.
RegisterFunction("sqrt", ["float"], "float", function (a) { return Math.sqrt(a); });
RegisterFunction("exp", ["float"], "float", function (a) { return Math.exp(a); });
RegisterFunction("log", ["float"], "float", function (a) { return Math.log(a); });
RegisterFunction("sin", ["float"], "float", function (a) { return Math.sin(a); });
RegisterFunction("cos", ["float"], "float", function (a) { return Math.cos(a); });
RegisterFunction("tan", ["float"], "float", function (a) { return Math.tan(a); });
RegisterFunction("asin", ["float"], "float", function (a) { return Math.asin(a); });
RegisterFunction("acos", ["float"], "float", function (a) { return Math.acos(a); });
RegisterFunction("atan", ["float"], "float", function (a) { return Math.atan(a); });
RegisterFunction("atan2", ["float", "float"], "float", function (a, b) { return Math.atan2(a, b); });
RegisterFunction("min", ["int", "int"], "int", function (a, b) { return Math.min(a, b); });
RegisterFunction("max", ["int", "int"], "int", function (a, b) { return Math.max(a, b); });
RegisterFunction("min", ["float", "float"], "float", function (a, b) { return Math.min(a, b); });
RegisterFunction("max", ["float", "float"], "float", function (a, b) { return Math.max(a, b); });
RegisterFunction("ceil", ["float"], "float", function (a, b) { return Math.ceil(a); });
RegisterFunction("floor", ["float"], "float", function (a, b) { return Math.floor(a); });
RegisterFunction("mix", ["float", "float", "float"], "float", function (a, b, t) { return a + (b - a) * t; });
// Vector functions.
RegisterFunction("dot", ["Vector2", "Vector2"], "float", function (a, b) { return a[0] * b[0] + a[1] * b[1]; });
RegisterFunction("dot", ["Vector3", "Vector3"], "float", function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; });
RegisterFunction("dot", ["Vector4", "Vector4"], "float", function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; });
RegisterFunction("length", ["Vector2"], "float", function (a) { return math_1.Vector2.FromArray(a).normalize().toArray(); });
RegisterFunction("length", ["Vector3"], "float", function (a) { return math_1.Vector3.FromArray(a).normalize().toArray(); });
RegisterFunction("length", ["Vector4"], "float", function (a) { return math_1.Quaternion.FromArray(a).normalize().toArray(); });
RegisterFunction("length", ["Quaternion"], "float", function (a) { return math_1.Quaternion.FromArray(a).normalize().toArray(); });
RegisterFunction("normalize", ["Vector2"], "Vector2", function (a) { return math_1.Vector2.FromArray(a).length(); });
RegisterFunction("normalize", ["Vector3"], "Vector3", function (a) { return math_1.Vector3.FromArray(a).length(); });
RegisterFunction("normalize", ["Vector4"], "Vector4", function (a) { return math_1.Quaternion.FromArray(a).length(); });
RegisterFunction("normalize", ["Quaternion"], "Quaternion", function (a) { return math_1.Quaternion.FromArray(a).length(); });
RegisterFunction("cross", ["Vector3", "Vector3"], "Vector3", function (a, b) {
    return math_1.Vector3.FromArray(a).cross(math_1.Vector3.FromArray(b)).toArray();
});
// Quaternion functions.
RegisterFunction("quat_mul", ["Quaternion", "Quaternion"], "Quaternion", function (a, b) {
    return math_1.Quaternion.FromArray(a).mul(math_1.Quaternion.FromArray(b)).toArray();
});
RegisterFunction("quat_conj", ["Quaternion"], "Quaternion", function (a) {
    return math_1.Quaternion.FromArray(a).conj().toArray();
});
RegisterFunction("quat_slerp", ["Quaternion", "Quaternion", "float"], "Quaternion", function (a, b, t) {
    return math_1.Quaternion.Slerp(math_1.Quaternion.FromArray(a), math_1.Quaternion.FromArray(b), t).toArray();
});
RegisterFunction("quat_rotate", ["Quaternion", "Vector3"], "Vector3", function (q, v) {
    return math_1.Quaternion.FromArray(q).rotate(math_1.Vector3.FromArray(v)).toArray();
});
RegisterFunction("quat_rotation", ["Vector3", "float"], "Quaternion", function (axis, angle) {
    return math_1.Quaternion.Rotation(math_1.Vector3.FromArray(axis), angle).toArray();
});
// Color functions.
RegisterConstructor("Color", ["float", "float", "float", "float"], function (r, g, b, a) { return [r, g, b, a]; });
RegisterConstructor("Color", ["float", "float", "float"], function (r, g, b) { return [r, g, b, 1]; });
RegisterConstructor("Color", ["float", "float"], function (v, a) { return [v, v, v, a]; });
RegisterConstructor("Color", ["float"], function (v) { return [v, v, v, 1]; });
RegisterFunction("lab2rgb", ["Color"], "Color", function (color) { return color; });
RegisterFunction("hcl2rgb", ["Color"], "Color", function (color) { return color; });
// Type conversions.
// We only allow low-precision to high-precision conversions to be automated.
RegisterTypeConversion("bool", "int", 1, function (a) { return a; });
RegisterTypeConversion("int", "float", 1, function (a) { return a; });
// Explicit conversions.
RegisterFunction("int", ["float"], "int", function (a) { return Math.floor(a); });
RegisterFunction("float", ["int"], "float", function (a) { return a; });
RegisterTypeConversion("Quaternion", "Vector4", 0, function (a) { return a; });
RegisterTypeConversion("Vector4", "Quaternion", 0, function (a) { return a; });
RegisterTypeConversion("Color", "Vector4", 0, function (a) { return a; });
RegisterTypeConversion("Vector4", "Color", 0, function (a) { return a; });
// Constants
addConstant("PI", "float", Math.PI);
addConstant("SQRT2", "float", Math.SQRT2);
addConstant("SQRT1_2", "float", Math.SQRT1_2);
addConstant("RED", "Color", [1, 0, 0, 1]);

},{"./math":13,"./utils":23}],10:[function(require,module,exports){
"use strict";
var parser_1 = require("../compiler/parser");
var utils_1 = require("../utils");
var modules = new utils_1.Dictionary();
function importPrimitiveCode(name, code) {
    var thisModule = null;
    if (modules.has(name)) {
        thisModule = modules.get(name);
    }
    else {
        thisModule = new utils_1.Dictionary();
        modules.set(name, thisModule);
    }
    var tree = parser_1.parseString(code);
    for (var _i = 0, _a = tree.blocks; _i < _a.length; _i++) {
        var f = _a[_i];
        if (f.type == "function") {
            var fn = f;
            thisModule.set(fn.name, fn);
        }
    }
}
var P2D = require("./primitives2d");
importPrimitiveCode("P2D", P2D.primitives);
var P3D = require("./primitives3d");
importPrimitiveCode("P3D", P3D.primitives);
function getModuleFunction(name, functionName) {
    return modules.get(name).get(functionName);
}
exports.getModuleFunction = getModuleFunction;
function forEachModuleFunction(name, callback) {
    return modules.get(name).forEach(callback);
}
exports.forEachModuleFunction = forEachModuleFunction;

},{"../compiler/parser":5,"../utils":23,"./primitives2d":11,"./primitives3d":12}],11:[function(require,module,exports){
"use strict";
exports.primitives = "\n    shape Triangle(\n        Vector2 p1,\n        Vector2 p2,\n        Vector2 p3,\n        Color color = [ 0, 0, 0, 1 ]\n    ) {\n        emit [\n            { position: p1, color: color },\n            { position: p2, color: color },\n            { position: p3, color: color }\n        ];\n    }\n\n    shape Rectangle(\n        Vector2 p1,\n        Vector2 p2,\n        Color color = [ 0, 0, 0, 1 ]\n    ) {\n        emit [\n            { position: Vector2(p1.x, p1.y), color: color },\n            { position: Vector2(p2.x, p1.y), color: color },\n            { position: Vector2(p2.x, p2.y), color: color }\n        ];\n        emit [\n            { position: Vector2(p1.x, p1.y), color: color },\n            { position: Vector2(p1.x, p2.y), color: color },\n            { position: Vector2(p2.x, p2.y), color: color }\n        ];\n    }\n\n    shape OutlinedRectangle(\n        Vector2 p1,\n        Vector2 p2,\n        float width = 1,\n        Color color = [ 0, 0, 0, 1 ]\n    ) {\n        Rectangle(p1, Vector2(p1.x + width, p2.y - width), color);\n        Rectangle(Vector2(p1.x, p2.y - width), Vector2(p2.x - width, p2.y), color);\n        Rectangle(Vector2(p1.x + width, p1.y), Vector2(p2.x, p1.y + width), color);\n        Rectangle(Vector2(p2.x - width, p1.y + width), p2, color);\n    }\n\n    shape Hexagon(\n        Vector2 center,\n        float radius,\n        Color color = [ 0, 0, 0, 1 ]\n    ) {\n        for(i in 0..5) {\n            float a1 = i / 6.0 * PI * 2.0;\n            float a2 = (i + 1) / 6.0 * PI * 2.0;\n            Vector2 p1 = Vector2(radius * cos(a1), radius * sin(a1));\n            Vector2 p2 = Vector2(radius * cos(a2), radius * sin(a2));\n            emit [\n                { position: center + p1, color: color },\n                { position: center, color: color },\n                { position: center + p2, color: color }\n            ];\n        }\n    }\n\n    shape Circle16(\n        Vector2 center,\n        float radius,\n        Color color = [ 0, 0, 0, 1 ]\n    ) {\n        for(i in 0..15) {\n            float a1 = i / 16.0 * PI * 2.0;\n            float a2 = (i + 1) / 16.0 * PI * 2.0;\n            Vector2 p1 = Vector2(radius * cos(a1), radius * sin(a1));\n            Vector2 p2 = Vector2(radius * cos(a2), radius * sin(a2));\n            emit [\n                { position: center + p1, color: color },\n                { position: center, color: color },\n                { position: center + p2, color: color }\n            ];\n        }\n    }\n\n    shape Circle(\n        Vector2 center,\n        float radius,\n        Color color = [ 0, 0, 0, 1 ]\n    ) {\n        for(i in 0..31) {\n            float a1 = i / 32.0 * PI * 2.0;\n            float a2 = (i + 1) / 32.0 * PI * 2.0;\n            Vector2 p1 = Vector2(radius * cos(a1), radius * sin(a1));\n            Vector2 p2 = Vector2(radius * cos(a2), radius * sin(a2));\n            emit [\n                { position: center + p1, color: color },\n                { position: center, color: color },\n                { position: center + p2, color: color }\n            ];\n        }\n    }\n\n    shape Line(\n        Vector2 p1,\n        Vector2 p2,\n        float width = 1,\n        Color color = [ 0, 0, 0, 1 ]\n    ) {\n        Vector2 d = normalize(p2 - p1);\n        Vector2 t = Vector2(d.y, -d.x) * (width / 2);\n        emit [\n            { position: p1 + t, color: color },\n            { position: p1 - t, color: color },\n            { position: p2 + t, color: color }\n        ];\n        emit [\n            { position: p1 - t, color: color },\n            { position: p2 - t, color: color },\n            { position: p2 + t, color: color }\n        ];\n    }\n";

},{}],12:[function(require,module,exports){
"use strict";
exports.primitives = "\n    shape Triangle(\n        Vector3 p1,\n        Vector3 p2,\n        Vector3 p3,\n        Color color = [ 0, 0, 0, 1 ]\n    ) {\n        emit [\n            { position: p1, color: color },\n            { position: p2, color: color },\n            { position: p3, color: color }\n        ];\n    }\n\n    shape Tetrahedron(\n        Vector3 p1,\n        Vector3 p2,\n        Vector3 p3,\n        Vector3 p4\n    ) {\n        Triangle(p3, p4, p1);\n        Triangle(p1, p4, p2);\n        Triangle(p1, p2, p3);\n        Triangle(p2, p3, p4);\n    }\n";

},{}],13:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var MathType = (function () {
    function MathType() {
    }
    return MathType;
}());
exports.MathType = MathType;
var Vector2 = (function (_super) {
    __extends(Vector2, _super);
    function Vector2(x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        _super.call(this);
        this.x = x;
        this.y = y;
    }
    Vector2.prototype.clone = function () {
        return new Vector2(this.x, this.y);
    };
    Vector2.prototype.add = function (rhs) {
        return new Vector2(this.x + rhs.x, this.y + rhs.y);
    };
    Vector2.prototype.sub = function (rhs) {
        return new Vector2(this.x - rhs.x, this.y - rhs.y);
    };
    Vector2.prototype.mul = function (rhs) {
        return new Vector2(this.x * rhs.x, this.y * rhs.y);
    };
    Vector2.prototype.div = function (rhs) {
        return new Vector2(this.x / rhs.x, this.y / rhs.y);
    };
    Vector2.prototype.scale = function (rhs) {
        return new Vector2(this.x * rhs, this.y * rhs);
    };
    Vector2.prototype.dot = function (rhs) {
        return this.x * rhs.x + this.y * rhs.y;
    };
    Vector2.prototype.length = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };
    Vector2.prototype.normalize = function () {
        var l = Math.sqrt(this.x * this.x + this.y * this.y);
        return new Vector3(this.x / l, this.y / l);
    };
    Vector2.prototype.toArray = function () {
        return [this.x, this.y];
    };
    Vector2.FromArray = function (_a) {
        var a = _a[0], b = _a[1];
        return new Vector2(a, b);
    };
    return Vector2;
}(MathType));
exports.Vector2 = Vector2;
var Vector3 = (function (_super) {
    __extends(Vector3, _super);
    function Vector3(x, y, z) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        _super.call(this);
        this.x = x;
        this.y = y;
        this.z = z;
    }
    Vector3.prototype.clone = function () {
        return new Vector3(this.x, this.y, this.z);
    };
    Vector3.prototype.add = function (rhs) {
        return new Vector3(this.x + rhs.x, this.y + rhs.y, this.z + rhs.z);
    };
    Vector3.prototype.sub = function (rhs) {
        return new Vector3(this.x - rhs.x, this.y - rhs.y, this.z - rhs.z);
    };
    Vector3.prototype.mul = function (rhs) {
        return new Vector3(this.x * rhs.x, this.y * rhs.y, this.z * rhs.z);
    };
    Vector3.prototype.div = function (rhs) {
        return new Vector3(this.x / rhs.x, this.y / rhs.y, this.z / rhs.z);
    };
    Vector3.prototype.scale = function (rhs) {
        return new Vector3(this.x * rhs, this.y * rhs, this.z * rhs);
    };
    Vector3.prototype.dot = function (rhs) {
        return this.x * rhs.x + this.y * rhs.y + this.z * rhs.z;
    };
    Vector3.prototype.cross = function (rhs) {
        return new Vector3(this.y * rhs.z - this.z * rhs.y, this.z * rhs.x - this.x * rhs.z, this.x * rhs.y - this.y * rhs.x);
    };
    Vector3.prototype.length = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    };
    Vector3.prototype.normalize = function () {
        var l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        return new Vector3(this.x / l, this.y / l, this.z / l);
    };
    Vector3.prototype.toArray = function () {
        return [this.x, this.y, this.z];
    };
    Vector3.FromArray = function (_a) {
        var a = _a[0], b = _a[1], c = _a[2];
        return new Vector3(a, b, c);
    };
    return Vector3;
}(MathType));
exports.Vector3 = Vector3;
var Quaternion = (function (_super) {
    __extends(Quaternion, _super);
    function Quaternion(x, y, z, w) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        if (w === void 0) { w = 0; }
        _super.call(this);
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    Quaternion.prototype.clone = function () {
        return new Quaternion(this.x, this.y, this.z, this.w);
    };
    Quaternion.prototype.conj = function () {
        return new Quaternion(-this.x, -this.y, -this.z, this.w);
    };
    Quaternion.prototype.mul = function (rhs) {
        return new Quaternion(rhs.x * this.w + this.x * rhs.w + this.y * rhs.z - this.z * rhs.y, rhs.y * this.w + this.y * rhs.w + this.z * rhs.x - this.x * rhs.z, rhs.z * this.w + this.z * rhs.w + this.x * rhs.y - this.y * rhs.x, this.w * rhs.w - this.x * rhs.x - this.y * rhs.y - this.z * rhs.z);
    };
    Quaternion.prototype.rotate = function (vector) {
        var q = new Quaternion(vector.x, vector.y, vector.z, 0);
        var qv = this.mul(q).mul(this.conj());
        return new Vector3(qv.x, qv.y, qv.z);
    };
    Quaternion.prototype.length = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.w * this.w);
    };
    Quaternion.prototype.normalize = function () {
        var s = Math.sqrt(this.x * this.x + this.y * this.y + this.w * this.w);
        return new Quaternion(this.x / s, this.y / s, this.z / s, this.w / s);
    };
    Quaternion.prototype.slerp = function (rhs, t) {
        return Quaternion.Slerp(this, rhs, t);
    };
    Quaternion.Slerp = function (q1, q2, t) {
        var acos_arg = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
        if (acos_arg > 1)
            acos_arg = 1;
        if (acos_arg < -1)
            acos_arg = -1;
        var omega = Math.acos(acos_arg);
        var st0, st1;
        if (Math.abs(omega) < 1e-10) {
            st0 = 1 - t;
            st1 = t;
        }
        else {
            var som = Math.sin(omega);
            st0 = Math.sin((1 - t) * omega) / som;
            st1 = Math.sin(t * omega) / som;
        }
        return new Quaternion(q1.x * st0 + q2.x * st1, q1.y * st0 + q2.y * st1, q1.z * st0 + q2.z * st1, q1.w * st0 + q2.w * st1);
    };
    Quaternion.Rotation = function (axis, angle) {
        var axis_normal = axis.normalize().scale(Math.sin(angle / 2));
        return new Quaternion(axis_normal.x, axis_normal.y, axis_normal.z, Math.cos(angle / 2));
    };
    Quaternion.prototype.toArray = function () {
        return [this.x, this.y, this.z, this.w];
    };
    Quaternion.FromArray = function (_a) {
        var a = _a[0], b = _a[1], c = _a[2], d = _a[3];
        return new Quaternion(a, b, c, d);
    };
    return Quaternion;
}(MathType));
exports.Quaternion = Quaternion;
var Pose = (function () {
    function Pose(position, rotation) {
        if (position === void 0) { position = new Vector3(0, 0, 0); }
        if (rotation === void 0) { rotation = new Quaternion(0, 0, 0, 1); }
        this.position = position;
        this.rotation = rotation;
    }
    return Pose;
}());
exports.Pose = Pose;

},{}],14:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var PlatformShapeData = (function () {
    function PlatformShapeData() {
    }
    return PlatformShapeData;
}());
exports.PlatformShapeData = PlatformShapeData;
var PlatformShape = (function () {
    function PlatformShape() {
    }
    return PlatformShape;
}());
exports.PlatformShape = PlatformShape;
var Viewport = (function () {
    function Viewport() {
    }
    return Viewport;
}());
exports.Viewport = Viewport;
var Viewport2D = (function (_super) {
    __extends(Viewport2D, _super);
    function Viewport2D(width, height) {
        _super.call(this);
        this.width = width;
        this.height = height;
    }
    return Viewport2D;
}(Viewport));
exports.Viewport2D = Viewport2D;
var Viewport3D = (function (_super) {
    __extends(Viewport3D, _super);
    function Viewport3D(width, height, fov) {
        _super.call(this);
        this.width = width;
        this.height = height;
        this.fov = fov;
    }
    return Viewport3D;
}(Viewport));
exports.Viewport3D = Viewport3D;
var Platform = (function () {
    function Platform() {
    }
    return Platform;
}());
exports.Platform = Platform;

},{}],15:[function(require,module,exports){
"use strict";
var ScaleBinding = (function () {
    function ScaleBinding(scale, returnType, argTypes) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            args[_i - 3] = arguments[_i];
        }
        this._scale = scale;
        this._returnType = returnType;
        this._argTypes = argTypes;
        this._args = args;
    }
    ScaleBinding.prototype.getReturnType = function () {
        return this._returnType;
    };
    ScaleBinding.prototype.getAttributes = function () {
        var _this = this;
        var result = [];
        for (var _i = 0, _a = this._scale.getAttributes(); _i < _a.length; _i++) {
            var attr = _a[_i];
            result.push({
                scaleBinding: this,
                bindedName: "s" + attr.name,
                name: attr.name,
                type: attr.type,
                binding: attr.binding
            });
        }
        this._args.forEach(function (arg, index) {
            if (arg instanceof ScaleBinding) {
                var a = arg;
                var attributes = a.getAttributes();
                for (var _i = 0, attributes_1 = attributes; _i < attributes_1.length; _i++) {
                    var attr = attributes_1[_i];
                    result.push({
                        scaleBinding: _this,
                        bindedName: "a" + index + attr.bindedName,
                        name: attr.name,
                        type: attr.type,
                        binding: attr.binding
                    });
                }
            }
            else {
                // Binded values become attributes here.
                result.push({
                    scaleBinding: _this,
                    bindedName: "a" + index,
                    name: "a" + index,
                    type: _this._argTypes[index],
                    binding: arg
                });
            }
        });
        return result;
    };
    ScaleBinding.prototype.getExpression = function (attrs) {
        var sAttrs = {};
        for (var _i = 0, _a = this._scale.getAttributes(); _i < _a.length; _i++) {
            var attr = _a[_i];
            sAttrs[attr.name] = attrs[("s" + attr.name)];
        }
        var values = this._args.map(function (arg, index) {
            if (arg instanceof ScaleBinding) {
                var a = arg;
                var attributes = a.getAttributes();
                var aAttrs = {};
                for (var _i = 0, attributes_2 = attributes; _i < attributes_2.length; _i++) {
                    var attr = attributes_2[_i];
                    aAttrs[attr.bindedName] = attrs[("a" + index + attr.bindedName)];
                }
                return arg.getExpression(aAttrs);
            }
            else {
                return attrs[("a" + index)];
            }
        });
        return (_b = this._scale).getExpression.apply(_b, [sAttrs].concat(values));
        var _b;
    };
    return ScaleBinding;
}());
exports.ScaleBinding = ScaleBinding;

},{}],16:[function(require,module,exports){
"use strict";
var scale_1 = require("./scale");
var SC = require("../specConstruct");
var scale;
(function (scale_2) {
    function linear(valueType) {
        if (valueType === void 0) { valueType = "float"; }
        var scale = (function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return new (scale_1.ScaleBinding.bind.apply(scale_1.ScaleBinding, [void 0].concat([scale, valueType, ["float"]], args)))();
        });
        var domain = [0, 1];
        var range = [0, 1];
        scale.domain = function (value) {
            if (value == null)
                return domain;
            domain[0] = value[0];
            domain[1] = value[1];
            return scale;
        };
        scale.range = function (value) {
            if (value == null)
                return range;
            range[0] = value[0];
            range[1] = value[1];
            return scale;
        };
        scale.getAttributes = function () {
            return [
                { name: "d0", type: valueType, binding: domain[0] },
                { name: "d1", type: valueType, binding: domain[1] },
                { name: "r0", type: valueType, binding: range[0] },
                { name: "r1", type: valueType, binding: range[1] }
            ];
        };
        scale.getExpression = function (attrs, value) {
            return SC.mix(attrs["r0"], attrs["r1"], SC.div(SC.sub(value, attrs["d0"]), SC.sub(attrs["d1"], attrs["d0"])));
        };
        return scale;
    }
    scale_2.linear = linear;
    function log(valueType) {
        if (valueType === void 0) { valueType = "float"; }
        var scale = (function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return new (scale_1.ScaleBinding.bind.apply(scale_1.ScaleBinding, [void 0].concat([scale, valueType, ["float"]], args)))();
        });
        var domain = [0, 1];
        var range = [0, 1];
        scale.domain = function (value) {
            if (value == null)
                return domain;
            domain[0] = value[0];
            domain[1] = value[1];
            return scale;
        };
        scale.range = function (value) {
            if (value == null)
                return range;
            range[0] = value[0];
            range[1] = value[1];
            return scale;
        };
        scale.getAttributes = function () {
            return [
                { name: "d0", type: valueType, binding: domain[0] },
                { name: "d1", type: valueType, binding: domain[1] },
                { name: "r0", type: valueType, binding: range[0] },
                { name: "r1", type: valueType, binding: range[1] }
            ];
        };
        scale.getExpression = function (attrs, value) {
            return SC.mix(attrs["r0"], attrs["r1"], SC.div(SC.log(SC.div(value, attrs["d0"])), SC.log(SC.div(attrs["d1"], attrs["d0"]))));
        };
        return scale;
    }
    scale_2.log = log;
    // Common arithmetics
    function addScale() {
        var scale = (function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return new (scale_1.ScaleBinding.bind.apply(scale_1.ScaleBinding, [void 0].concat([scale, "float", ["float", "float"]], args)))();
        });
        scale.getAttributes = function () { return []; };
        scale.getExpression = function (attrs, value1, value2) {
            console.log(value1, value2);
            return SC.add(value1, value2);
        };
        return scale;
    }
    scale_2.addScale = addScale;
    function subScale() {
        var scale = (function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return new (scale_1.ScaleBinding.bind.apply(scale_1.ScaleBinding, [void 0].concat([scale, "float", ["float", "float"]], args)))();
        });
        scale.getAttributes = function () { return []; };
        scale.getExpression = function (attrs, value1, value2) { return SC.sub(value1, value2); };
        return scale;
    }
    scale_2.subScale = subScale;
    function mulScale() {
        var scale = (function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return new (scale_1.ScaleBinding.bind.apply(scale_1.ScaleBinding, [void 0].concat([scale, "float", ["float", "float"]], args)))();
        });
        scale.getAttributes = function () { return []; };
        scale.getExpression = function (attrs, value1, value2) { return SC.mul(value1, value2); };
        return scale;
    }
    scale_2.mulScale = mulScale;
    function divScale() {
        var scale = (function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return new (scale_1.ScaleBinding.bind.apply(scale_1.ScaleBinding, [void 0].concat([scale, "float", ["float", "float"]], args)))();
        });
        scale.getAttributes = function () { return []; };
        scale.getExpression = function (attrs, value1, value2) { return SC.div(value1, value2); };
        return scale;
    }
    scale_2.divScale = divScale;
    function add(value1, value2) {
        return addScale()(value1, value2);
    }
    scale_2.add = add;
    function sub(value1, value2) {
        return subScale()(value1, value2);
    }
    scale_2.sub = sub;
    function mul(value1, value2) {
        return mulScale()(value1, value2);
    }
    scale_2.mul = mul;
    function div(value1, value2) {
        return divScale()(value1, value2);
    }
    scale_2.div = div;
})(scale = exports.scale || (exports.scale = {}));

},{"../specConstruct":19,"./scale":15}],17:[function(require,module,exports){
"use strict";
var binding_1 = require("./binding");
var exceptions_1 = require("./exceptions");
var utils_1 = require("./utils");
var scale_1 = require("./scale/scale");
;
var Shape = (function () {
    function Shape(spec, platform) {
        this._spec = spec;
        this._data = [];
        this._platform = platform;
        this._bindings = new utils_1.Dictionary();
        this._shiftBindings = new utils_1.Dictionary();
        this._platformShape = null;
        this._shouldUploadData = true;
        this._instanceFunction = null;
        // Set bindings to default value whenever exists.
        for (var name_1 in this._spec.input) {
            if (this._spec.input.hasOwnProperty(name_1)) {
                var input = this._spec.input[name_1];
                if (input.default != null) {
                    this._bindings.set(name_1, new binding_1.Binding(input.type, input.default));
                }
            }
        }
        // Assign shift bindings based on naming convention.
        for (var name_2 in this._spec.input) {
            if (this._spec.input.hasOwnProperty(name_2)) {
                if (this._spec.input.hasOwnProperty(name_2 + "_pp")) {
                    this._shiftBindings.set(name_2 + "_pp", new binding_1.ShiftBinding(name_2, -2));
                }
                if (this._spec.input.hasOwnProperty(name_2 + "_p")) {
                    this._shiftBindings.set(name_2 + "_p", new binding_1.ShiftBinding(name_2, -1));
                }
                if (this._spec.input.hasOwnProperty(name_2 + "_n")) {
                    this._shiftBindings.set(name_2 + "_n", new binding_1.ShiftBinding(name_2, +1));
                }
                if (this._spec.input.hasOwnProperty(name_2 + "_nn")) {
                    this._shiftBindings.set(name_2 + "_nn", new binding_1.ShiftBinding(name_2, +2));
                }
            }
        }
    }
    Object.defineProperty(Shape.prototype, "spec", {
        get: function () {
            return this._spec;
        },
        enumerable: true,
        configurable: true
    });
    Shape.prototype.attr = function (name, value) {
        if (value === undefined) {
            if (!this._bindings.has(name)) {
                throw new exceptions_1.RuntimeError("attr '" + name + " is undefined.");
            }
            var binding = this._bindings.get(name);
            if (binding instanceof binding_1.Binding) {
                return binding.value;
            }
            else {
                return binding;
            }
        }
        else {
            if (!this._spec.input.hasOwnProperty(name)) {
                throw new exceptions_1.RuntimeError("attr '" + name + " is undefined.");
            }
            if (value instanceof scale_1.ScaleBinding) {
                if (this._platformShape) {
                    if (this._bindings.get(name) != value) {
                        this._platformShape = null;
                    }
                }
                this._bindings.set(name, value);
            }
            else {
                // Create new binding.
                var newBinding = new binding_1.Binding(this._spec.input[name].type, value);
                // Decide if we should recompile the platform code.
                if (this._platformShape) {
                    // Recompile if the input was compiled as input,
                    // and the new binding is not a function.
                    if (this._platformShape.isUniform(name) && !newBinding.isFunction) {
                        this._platformShape.updateUniform(name, newBinding.specValue);
                    }
                    else {
                        this._platformShape = null;
                    }
                }
                this._bindings.set(name, newBinding);
            }
            return this;
        }
    };
    Shape.prototype.data = function (data) {
        if (data === undefined) {
            return this._data;
        }
        else {
            this._data = data.slice();
            this._shouldUploadData = true;
            return this;
        }
    };
    Shape.prototype.instance = function (func) {
        if (func === undefined) {
            return this._instanceFunction;
        }
        else {
            this._instanceFunction = func;
        }
    };
    // Make alternative spec to include ScaleBinding values.
    Shape.prototype.prepareSpecification = function () {
        var newSpec = {
            input: utils_1.shallowClone(this._spec.input),
            output: this._spec.output,
            statements: this._spec.statements.slice(),
            variables: utils_1.shallowClone(this._spec.variables)
        };
        var newBindings = this._bindings.clone();
        var shiftBindings = this._shiftBindings.clone();
        this._bindings.forEach(function (binding, name) {
            if (binding instanceof scale_1.ScaleBinding) {
                var attributes = binding.getAttributes();
                var attrs_1 = {};
                attributes.forEach(function (attr) {
                    var bindedName = name + attr.bindedName;
                    newBindings.set(bindedName, new binding_1.Binding(attr.type, attr.binding));
                    attrs_1[attr.bindedName] = {
                        type: "variable",
                        valueType: attr.type,
                        variableName: bindedName
                    };
                    newSpec.input[bindedName] = {
                        type: attr.type,
                        default: null
                    };
                });
                // Move the attribute to variables.
                newSpec.variables[name] = newSpec.input[name].type;
                newSpec.statements.splice(0, 0, {
                    type: "assign",
                    variableName: name,
                    expression: binding.getExpression(attrs_1),
                    valueType: newSpec.input[name].type
                });
                delete newSpec.input[name];
                newBindings.delete(name);
            }
        });
        return [newSpec, newBindings, shiftBindings];
    };
    Shape.prototype.uploadScaleUniforms = function () {
        var _this = this;
        this._bindings.forEach(function (binding, name) {
            if (binding instanceof scale_1.ScaleBinding) {
                var attributes = binding.getAttributes();
                var attrs = {};
                attributes.forEach(function (attr) {
                    _this._platformShape.updateUniform(name + attr.bindedName, attr.binding);
                });
            }
        });
    };
    Shape.prototype.prepare = function () {
        var _this = this;
        if (!this._platformShape) {
            var _a = this.prepareSpecification(), spec = _a[0], binding = _a[1], shiftBinding = _a[2];
            this._platformShape = this._platform.compile(this, spec, binding, shiftBinding);
            this._shouldUploadData = true;
        }
        if (this._shouldUploadData) {
            if (this._instanceFunction == null) {
                this._platformShapeData = this._platformShape.uploadData(this._data);
            }
            else {
                this._platformShapeData = this._data.map(function (datum, index) {
                    var info = _this._instanceFunction(datum, index, _this._data);
                    _this._platformShape.uploadData(info.data);
                });
            }
            this._shouldUploadData = false;
        }
        return this;
    };
    Shape.prototype.render = function () {
        var _this = this;
        this.prepare();
        this.uploadScaleUniforms();
        if (this._instanceFunction == null) {
            this._platformShape.render(this._platformShapeData);
        }
        else {
            var datas_1 = this._platformShapeData;
            this._data.forEach(function (datum, index) {
                var info = _this._instanceFunction(datum, index, _this._data);
                for (var attr in info.attrs) {
                    if (info.attrs.hasOwnProperty(attr)) {
                        _this._platformShape.updateUniform(attr, binding_1.getBindingValue(info.attrs[attr]));
                    }
                }
                _this._platformShape.render(datas_1[index]);
            });
        }
        return this;
    };
    return Shape;
}());
exports.Shape = Shape;

},{"./binding":2,"./exceptions":8,"./scale/scale":15,"./utils":23}],18:[function(require,module,exports){
"use strict";
var compiler_1 = require("./compiler/compiler");
var declare_1 = require("./compiler/declare");
var shape_1 = require("./shape");
var shape;
(function (shape) {
    function create(spec, platform) {
        if (spec instanceof declare_1.CustomShape) {
            return new shape_1.Shape(spec.compile(), platform);
        }
        else {
            return new shape_1.Shape(spec, platform);
        }
    }
    shape.create = create;
    function custom() {
        return new declare_1.CustomShape();
    }
    shape.custom = custom;
    function compile(code) {
        return compiler_1.compileString(code);
    }
    shape.compile = compile;
    function circle(sides) {
        if (sides === void 0) { sides = 32; }
        return shape.compile("\n            shape Circle(\n                Vector2 center,\n                float radius,\n                Color color\n            ) {\n                for(i in 0.." + (sides - 1) + ") {\n                    float a1 = i / " + sides.toFixed(1) + " * PI * 2.0;\n                    float a2 = (i + 1) / " + sides.toFixed(1) + " * PI * 2.0;\n                    Vector2 p1 = Vector2(radius * cos(a1), radius * sin(a1));\n                    Vector2 p2 = Vector2(radius * cos(a2), radius * sin(a2));\n                    emit [\n                        { position: center + p1, color: color },\n                        { position: center, color: color },\n                        { position: center + p2, color: color }\n                    ];\n                }\n            }\n        ")["Circle"];
    }
    shape.circle = circle;
    function line() {
        return shape.compile("\n            shape Line(\n                Vector2 p1,\n                Vector2 p2,\n                float width = 1,\n                Color color = [ 0, 0, 0, 1 ]\n            ) {\n                Vector2 d = normalize(p2 - p1);\n                Vector2 t = Vector2(d.y, -d.x) * (width / 2);\n                emit [\n                    { position: p1 + t, color: color },\n                    { position: p1 - t, color: color },\n                    { position: p2 + t, color: color }\n                ];\n                emit [\n                    { position: p1 - t, color: color },\n                    { position: p2 - t, color: color },\n                    { position: p2 + t, color: color }\n                ];\n            }\n        ")["Line"];
    }
    shape.line = line;
    function polyline() {
        return shape.compile("\n            import Triangle from P2D;\n\n            shape Sector2(\n                Vector2 c,\n                Vector2 p1,\n                Vector2 p2,\n                Color color\n            ) {\n                auto pc = c + normalize(p1 + p2 - c - c) * length(p1 - c);\n                Triangle(c, p1, pc, color);\n                Triangle(c, pc, p2, color);\n            }\n\n            shape Sector4(\n                Vector2 c,\n                Vector2 p1,\n                Vector2 p2,\n                Color color\n            ) {\n                auto pc = c + normalize(p1 + p2 - c - c) * length(p1 - c);\n                Sector2(c, p1, pc, color);\n                Sector2(c, pc, p2, color);\n            }\n\n            shape PolylineRound(\n                Vector2 p, Vector2 p_p, Vector2 p_n, Vector2 p_nn,\n                float width,\n                Color color = [ 0, 0, 0, 1 ]\n            ) {\n                float EPS = 1e-5;\n                float w = width / 2;\n                Vector2 d = normalize(p - p_n);\n                Vector2 n = Vector2(d.y, -d.x);\n                Vector2 m1;\n                if(length(p - p_p) < EPS) {\n                    m1 = n * w;\n                } else {\n                    m1 = normalize(d + normalize(p - p_p)) * w;\n                }\n                Vector2 m2;\n                if(length(p_n - p_nn) < EPS) {\n                    m2 = -n * w;\n                } else {\n                    m2 = normalize(normalize(p_n - p_nn) - d) * w;\n                }\n                Vector2 c1a;\n                Vector2 c1b;\n                Vector2 a1;\n                Vector2 a2;\n                if(dot(m1, n) > 0) {\n                    c1a = p + m1;\n                    c1b = p + n * w;\n                    a2 = c1b;\n                    a1 = p - m1 * (w / dot(m1, n));\n                } else {\n                    c1a = p + m1;\n                    c1b = p - n * w;\n                    a2 = p + m1 * (w / dot(m1, n));\n                    a1 = c1b;\n                }\n                Vector2 c2a;\n                Vector2 c2b;\n                Vector2 b1;\n                Vector2 b2;\n                if(dot(m2, n) < 0) {\n                    c2a = p_n + m2;\n                    c2b = p_n - n * w;\n                    b1 = c2b;\n                    b2 = p_n + m2 * (w / dot(m2, n));\n                } else {\n                    c2a = p_n + m2;\n                    c2b = p_n + n * w;\n                    b2 = c2b;\n                    b1 = p_n - m2 * (w / dot(m2, n));\n                }\n                Sector4(p, c1a, c1b, color);\n                Sector4(p_n, c2a, c2b, color);\n                Triangle(p, a1, b1, color);\n                Triangle(p, b1, p_n, color);\n                Triangle(p, a2, b2, color);\n                Triangle(p, b2, p_n, color);\n            }\n        ")["PolylineRound"];
    }
    shape.polyline = polyline;
})(shape = exports.shape || (exports.shape = {}));

},{"./compiler/compiler":3,"./compiler/declare":4,"./shape":17}],19:[function(require,module,exports){
"use strict";
// Construct part of specification.
var intrinsics_1 = require("./intrinsics");
function func(name, returnType) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    return {
        type: "function",
        functionName: intrinsics_1.getInternalName({
            name: name,
            argTypes: args.map(function (arg) { return arg.valueType; }),
            returnType: returnType
        }),
        arguments: args,
        valueType: returnType
    };
}
exports.func = func;
function op(name, returnType) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    return {
        type: "function",
        functionName: intrinsics_1.getInternalName({
            name: "@" + name,
            argTypes: args.map(function (arg) { return arg.valueType; }),
            returnType: returnType
        }),
        valueType: returnType,
        arguments: args,
    };
}
exports.op = op;
function variable(varName, varType) {
    return {
        type: "variable",
        variableName: varName,
        valueType: varType
    };
}
exports.variable = variable;
function constant(value, valueType) {
    return {
        type: "constant",
        value: value,
        valueType: valueType
    };
}
exports.constant = constant;
function mix(a1, a2, t) {
    return func("mix", a1.valueType, a1, a2, t);
}
exports.mix = mix;
function exp(x) {
    return func("exp", "float", x);
}
exports.exp = exp;
function log(x) {
    return func("log", "float", x);
}
exports.log = log;
function add(a1, a2) {
    return op("+", a1.valueType, a1, a2);
}
exports.add = add;
function sub(a1, a2) {
    return op("-", a1.valueType, a1, a2);
}
exports.sub = sub;
function mul(a1, a2) {
    return op("*", a1.valueType, a1, a2);
}
exports.mul = mul;
function div(a1, a2) {
    return op("/", a1.valueType, a1, a2);
}
exports.div = div;
function greaterThan(a1, a2) {
    return op(">", "bool", a1, a2);
}
exports.greaterThan = greaterThan;
function lessThan(a1, a2) {
    return op("<", "bool", a1, a2);
}
exports.lessThan = lessThan;

},{"./intrinsics":9}],20:[function(require,module,exports){
// Flattener: Resolve emit statements into individual render calls.
"use strict";
var SC = require("../specConstruct");
var utils_1 = require("../utils");
// Old recursive if statements - not as fast as the individual if statement version.
// // For now, assume there is no conditional emits.
// export function  FlattenEmits(shape: Specification.Shape): FlattenedEmits {
//     let vertexIndexName = attemptName("s3idx", (c) => !shape.variables.hasOwnProperty(c) && !shape.input.hasOwnProperty(c));
//     let newShape: Specification.Shape = {
//         input: {},
//         output: shape.output,
//         variables: shape.variables,
//         statements: []
//     }
//     for(let i in shape.input) {
//         if(shape.input.hasOwnProperty(i)) {
//             newShape.input[i] = shape.input[i];
//         }
//     }
//     newShape.input[vertexIndexName] = {
//         type: "float",
//         default: 0
//     };
//     let emitStatementIndices: number[] = [];
//     for(let i = 0; i < shape.statements.length; i++) {
//         if(shape.statements[i].type == "emit") {
//             emitStatementIndices.push(i);
//         }
//     }
//     let compileEmitStatements = (indexStart: number, indexEnd: number): Specification.Statement[] => {
//         if(indexStart == indexEnd) {
//             let result: Specification.Statement[] = [];
//             let i = emitStatementIndices[indexStart];
//             for(let j = 0; j <= i; j++) {
//                 let s = shape.statements[j];
//                 if(s.type != "emit" || j == i) {
//                     result.push(s);
//                 }
//             }
//             return result;
//         } else {
//             let middle = Math.floor((indexStart + indexEnd) / 2);
//             let condition: Specification.StatementCondition = {
//                 type: "condition",
//                 condition: {
//                     type: "function",
//                     valueType: "bool",
//                     functionName: "@@<:float,float:bool",
//                     arguments: [
//                         { type: "variable", variableName: vertexIndexName, valueType: "float" } as Specification.ExpressionVariable,
//                         { type: "constant", value: middle + 0.5, valueType: "float" } as Specification.ExpressionConstant
//                     ]
//                 } as Specification.ExpressionFunction,
//                 trueStatements: compileEmitStatements(indexStart, middle),
//                 falseStatements: compileEmitStatements(middle + 1, indexEnd)
//             }
//             return [ condition ];
//         }
//     };
//     newShape.statements = compileEmitStatements(0, emitStatementIndices.length - 1);
//     return {
//         specification: newShape,
//         count: emitStatementIndices.length,
//         indexVariable: vertexIndexName
//     };
// }
// For now, assume there is no conditional emits.
function FlattenEmits(shape) {
    var vertexIndexName = utils_1.attemptName("s3idx", function (c) { return !shape.variables.hasOwnProperty(c) && !shape.input.hasOwnProperty(c); });
    var emitIndexName = utils_1.attemptName("s3emitidx", function (c) { return !shape.variables.hasOwnProperty(c) && !shape.input.hasOwnProperty(c); });
    var newShape = {
        input: {},
        output: shape.output,
        variables: shape.variables,
        statements: []
    };
    for (var i in shape.input) {
        if (shape.input.hasOwnProperty(i)) {
            newShape.input[i] = shape.input[i];
        }
    }
    newShape.input[vertexIndexName] = {
        type: "float",
        default: 0
    };
    newShape.variables[emitIndexName] = "float";
    newShape.statements.push({
        type: "assign",
        variableName: emitIndexName,
        expression: SC.constant(-0.5, "float")
    });
    var generateStatements = function (statements) {
        var result = [];
        var maxNumberEmits = 0;
        for (var i = 0; i < statements.length; i++) {
            switch (statements[i].type) {
                case "emit":
                    {
                        result.push({
                            type: "condition",
                            condition: SC.greaterThan(SC.variable(vertexIndexName, "float"), SC.variable(emitIndexName, "float")),
                            trueStatements: [statements[i]],
                            falseStatements: []
                        });
                        result.push({
                            type: "assign",
                            variableName: emitIndexName,
                            expression: SC.add(SC.variable(emitIndexName, "float"), SC.constant(1, "float"))
                        });
                        maxNumberEmits += 1;
                    }
                    break;
                case "for":
                    {
                        var forStatement = statements[i];
                        var _a = generateStatements(forStatement.statements), generatedStatements_1 = _a[0], maxNumber = _a[1];
                        result.push({
                            type: "for",
                            variableName: forStatement.variableName,
                            rangeMin: forStatement.rangeMin,
                            rangeMax: forStatement.rangeMax,
                            statements: generatedStatements_1
                        });
                        maxNumberEmits += (forStatement.rangeMax - forStatement.rangeMin + 1) * maxNumber;
                    }
                    break;
                case "condition":
                    {
                        var condStatement = statements[i];
                        var _b = generateStatements(condStatement.trueStatements), gTrueStatements = _b[0], gTrueStatementsMax = _b[1];
                        var _c = generateStatements(condStatement.falseStatements), gFalseStatements = _c[0], gFalseStatementsMax = _c[1];
                        result.push({
                            type: "condition",
                            condition: condStatement.condition,
                            trueStatements: gTrueStatements,
                            falseStatements: gFalseStatements
                        });
                        maxNumberEmits = Math.max(gTrueStatementsMax, gFalseStatementsMax);
                    }
                    break;
                default:
                    {
                        result.push(statements[i]);
                    }
                    break;
            }
        }
        return [result, maxNumberEmits];
    };
    var _a = generateStatements(shape.statements), generatedStatements = _a[0], maxNumberEmits = _a[1];
    newShape.statements = newShape.statements.concat(generatedStatements);
    return {
        specification: newShape,
        count: maxNumberEmits,
        indexVariable: vertexIndexName
    };
}
exports.FlattenEmits = FlattenEmits;

},{"../specConstruct":19,"../utils":23}],21:[function(require,module,exports){
"use strict";
var flattener_1 = require("./flattener");
exports.FlattenEmits = flattener_1.FlattenEmits;

},{"./flattener":20}],22:[function(require,module,exports){
// Basic types.
"use strict";
function MakeType(name, size, primitive, primitiveCount) {
    return {
        name: name,
        size: size,
        primitive: primitive,
        primitiveCount: primitiveCount
    };
}
exports.types = {
    "float": MakeType("float", 4, "float", 1),
    "int": MakeType("int", 4, "int", 1),
    "Vector2": MakeType("Vector2", 8, "float", 2),
    "Vector3": MakeType("Vector3", 12, "float", 3),
    "Quaternion": MakeType("Quaternion", 16, "float", 4),
    "Color": MakeType("Color", 16, "float", 4)
};

},{}],23:[function(require,module,exports){
"use strict";
var Dictionary = (function () {
    function Dictionary() {
        this._dict = {};
    }
    Dictionary.prototype.set = function (key, value) {
        this._dict[key] = value;
    };
    Dictionary.prototype.has = function (key) {
        return this._dict.hasOwnProperty(key);
    };
    Dictionary.prototype.delete = function (key) {
        delete this._dict[key];
    };
    Dictionary.prototype.get = function (key) {
        if (this._dict.hasOwnProperty(key)) {
            return this._dict[key];
        }
        else {
            return undefined;
        }
    };
    Dictionary.prototype.forEach = function (cb) {
        for (var key in this._dict) {
            if (this._dict.hasOwnProperty(key)) {
                cb(this._dict[key], key);
            }
        }
    };
    Dictionary.prototype.clone = function () {
        var result = new Dictionary();
        this.forEach(function (value, key) {
            result.set(key, value);
        });
        return result;
    };
    return Dictionary;
}());
exports.Dictionary = Dictionary;
function shallowClone(object) {
    var result = {};
    for (var key in object) {
        if (object.hasOwnProperty(key)) {
            result[key] = object[key];
        }
    }
    return result;
}
exports.shallowClone = shallowClone;
function attemptName(prefix, check) {
    if (check(prefix))
        return prefix;
    for (var i = 1;; i++) {
        var c = prefix + i.toString();
        if (check(c))
            return c;
    }
}
exports.attemptName = attemptName;
function timeTask(name, cb) {
    var t0 = new Date().getTime();
    cb();
    var t1 = new Date().getTime();
    console.log(name + ": " + ((t1 - t0) / 1000).toFixed(3) + "s");
}
exports.timeTask = timeTask;

},{}],24:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
exports.version = "0.0.1";
// Math classes and utilities
__export(require("./core/utils"));
__export(require("./core/math"));
// Shape class and shape specification
__export(require("./core/shapeModule"));
__export(require("./core/shape"));
__export(require("./core/binding"));
__export(require("./core/intrinsics"));
__export(require("./core/types"));
__export(require("./core/exceptions"));
// Parsing and compiling
__export(require("./core/compiler/parser"));
__export(require("./core/compiler/compiler"));
__export(require("./core/compiler/declare"));
// Code transformation
__export(require("./core/transform/transforms"));
// Javascript context
__export(require("./core/evaluator/evaluator"));
// Platform base class
__export(require("./core/platform"));
// Scales
__export(require("./core/scale/scale"));
var scales_1 = require("./core/scale/scales");
exports.scale = scales_1.scale;

},{"./core/binding":2,"./core/compiler/compiler":3,"./core/compiler/declare":4,"./core/compiler/parser":5,"./core/evaluator/evaluator":7,"./core/exceptions":8,"./core/intrinsics":9,"./core/math":13,"./core/platform":14,"./core/scale/scale":15,"./core/scale/scales":16,"./core/shape":17,"./core/shapeModule":18,"./core/transform/transforms":21,"./core/types":22,"./core/utils":23}],25:[function(require,module,exports){
"use strict";
var webgl_1 = require("./webgl/webgl");
exports.WebGLPlatform = webgl_1.WebGLPlatform;

},{"./webgl/webgl":29}],26:[function(require,module,exports){
"use strict";
var types_1 = require("./types");
var intrinsics_1 = require("./intrinsics");
(function (GenerateMode) {
    GenerateMode[GenerateMode["NORMAL"] = 0] = "NORMAL";
    GenerateMode[GenerateMode["PICK"] = 1] = "PICK";
})(exports.GenerateMode || (exports.GenerateMode = {}));
var GenerateMode = exports.GenerateMode;
(function (ViewType) {
    ViewType[ViewType["VIEW_2D"] = 0] = "VIEW_2D";
    ViewType[ViewType["VIEW_3D"] = 1] = "VIEW_3D";
})(exports.ViewType || (exports.ViewType = {}));
var ViewType = exports.ViewType;
var Generator = (function () {
    function Generator(viewType, mode) {
        if (mode === void 0) { mode = GenerateMode.NORMAL; }
        this._mode = mode;
        this._viewType = viewType;
        this._lines = [];
        this._additionalCodes = [];
        this._currentIndent = "";
        this._hasColor = false;
    }
    Generator.prototype.addLine = function (code) {
        this._lines.push(this._currentIndent + code);
    };
    Generator.prototype.addAdditionalCode = function (code) {
        if (this._additionalCodes.indexOf(code) < 0) {
            this._additionalCodes.push(code);
        }
    };
    Generator.prototype.indent = function () {
        this._currentIndent += "    ";
    };
    Generator.prototype.unindent = function () {
        this._currentIndent = this._currentIndent.slice(0, this._currentIndent.length - 4);
    };
    Generator.prototype.addDeclaration = function (name, type) {
        this.addLine(types_1.convertTypeName(type) + " " + name + ";");
    };
    Generator.prototype.addUniform = function (name, type) {
        this.addLine("uniform " + types_1.convertTypeName(type) + " " + name + ";");
    };
    Generator.prototype.addAttribute = function (name, type) {
        this.addLine("attribute " + types_1.convertTypeName(type) + " " + name + ";");
    };
    Generator.prototype.addVarying = function (name, type) {
        this.addLine("varying " + types_1.convertTypeName(type) + " " + name + ";");
        if (name == "out_position") {
            this._positionType = type;
        }
        if (name == "out_color") {
            this._hasColor = true;
        }
    };
    Generator.prototype.generateExpression = function (expr) {
        var _this = this;
        switch (expr.type) {
            case "constant": {
                var eConstant = expr;
                return types_1.convertConstant(eConstant.valueType, eConstant.value);
            }
            case "variable": {
                var eVariable = expr;
                return eVariable.variableName;
            }
            case "function": {
                var eFunction = expr;
                var args = eFunction.arguments.map(function (arg) { return _this.generateExpression(arg); });
                var _a = intrinsics_1.generateIntrinsicFunction(eFunction.functionName, args), code = _a.code, additionalCode = _a.additionalCode;
                if (additionalCode != null) {
                    this.addAdditionalCode(additionalCode);
                }
                return code;
            }
            case "field": {
                var eField = expr;
                return this.generateExpression(eField.value) + "." + eField.fieldName;
            }
        }
    };
    Generator.prototype.addStatement = function (stat) {
        switch (stat.type) {
            case "assign":
                {
                    var sAssign = stat;
                    var expr = this.generateExpression(sAssign.expression);
                    this.addLine(sAssign.variableName + " = " + expr + ";");
                }
                break;
            case "condition":
                {
                    var sCondition = stat;
                    if (sCondition.trueStatements.length > 0 && sCondition.falseStatements.length > 0) {
                        this.addLine("if(" + this.generateExpression(sCondition.condition) + ") {");
                        this.indent();
                        this.addStatements(sCondition.trueStatements);
                        this.unindent();
                        this.addLine("} else {");
                        this.indent();
                        this.addStatements(sCondition.falseStatements);
                        this.unindent();
                        this.addLine("}");
                    }
                    else if (sCondition.trueStatements.length > 0) {
                        this.addLine("if(" + this.generateExpression(sCondition.condition) + ") {");
                        this.indent();
                        this.addStatements(sCondition.trueStatements);
                        this.unindent();
                        this.addLine("}");
                    }
                    else if (sCondition.falseStatements.length > 0) {
                        this.addLine("if(!" + this.generateExpression(sCondition.condition) + ") {");
                        this.indent();
                        this.addStatements(sCondition.trueStatements);
                        this.unindent();
                        this.addLine("}");
                    }
                }
                break;
            case "for":
                {
                    var sForLoop = stat;
                    this.addLine("for(int " + sForLoop.variableName + " = " + sForLoop.rangeMin + "; " + sForLoop.variableName + " <= " + sForLoop.rangeMax + "; " + sForLoop.variableName + "++) {");
                    this.indent();
                    this.addStatements(sForLoop.statements);
                    this.unindent();
                    this.addLine("}");
                }
                break;
            case "emit":
                {
                    var sEmit = stat;
                    for (var name_1 in sEmit.attributes) {
                        this.addLine("out_" + name_1 + " = " + this.generateExpression(sEmit.attributes[name_1]) + ";");
                    }
                    if (this._mode == GenerateMode.PICK) {
                        this.addLine("out_pick_index = vec4(s3_pick_index.rgb, s3_pick_index_alpha);");
                    }
                    switch (this._positionType) {
                        case "Vector2":
                            {
                                this.addLine("gl_Position = s3_render_vertex(vec3(out_position, 0.0));");
                            }
                            break;
                        case "Vector3":
                            {
                                this.addLine("gl_Position = s3_render_vertex(out_position);");
                            }
                            break;
                        case "Vector4":
                            {
                                this.addLine("gl_Position = s3_render_vertex(out_position.xyz);");
                            }
                            break;
                    }
                }
                break;
        }
    };
    Generator.prototype.compileSpecification = function (spec, asUniform) {
        this.addLine("precision highp float;");
        // Global attributes.
        for (var name_2 in spec.input) {
            if (spec.input.hasOwnProperty(name_2)) {
                if (asUniform(name_2)) {
                    this.addUniform(name_2, spec.input[name_2].type);
                }
                else {
                    this.addAttribute(name_2, spec.input[name_2].type);
                }
            }
        }
        if (this._mode == GenerateMode.PICK) {
            this.addAttribute("s3_pick_index", "Vector4");
            this.addUniform("s3_pick_index_alpha", "float");
        }
        switch (this._viewType) {
            case ViewType.VIEW_2D:
                {
                    this.addUniform("s3_view_params", "Vector4");
                    this.addAdditionalCode("\n                    vec4 s3_render_vertex(vec3 p) {\n                        return vec4(p.xy * s3_view_params.xy + s3_view_params.zw, 0.0, 1.0);\n                    }\n                ");
                }
                break;
            case ViewType.VIEW_3D:
                {
                    this.addUniform("s3_view_params", "Vector4");
                    this.addUniform("s3_view_position", "Vector3");
                    this.addUniform("s3_view_rotation", "Vector4");
                    this.addAdditionalCode("\n                    vec4 s3_render_vertex(vec3 p) {\n                        // Get position in view coordinates:\n                        //   v = quaternion_inverse_rotate(rotation, p - position)\n                        vec3 v = p - s3_view_position;\n                        float d = dot(s3_view_rotation.xyz, v);\n                        vec3 c = cross(s3_view_rotation.xyz, v);\n                        v = s3_view_rotation.w * s3_view_rotation.w * v - (s3_view_rotation.w + s3_view_rotation.w) * c + d * s3_view_rotation.xyz - cross(c, s3_view_rotation.xyz);\n                        // Compute projection.\n                        vec4 r;\n                        r.xy = v.xy * s3_view_params.xy;\n                        r.z = v.z * s3_view_params.z + s3_view_params.w;\n                        r.w = -v.z;\n                        return r;\n                    }\n                ");
                }
                break;
        }
        this.addLine("@additionalCode");
        // Output attributes.
        for (var name_3 in spec.output) {
            if (spec.output.hasOwnProperty(name_3)) {
                this.addVarying("out_" + name_3, spec.output[name_3].type);
            }
        }
        if (this._mode == GenerateMode.PICK) {
            this.addVarying("out_pick_index", "Vector4");
        }
        // The main function.
        this.addLine("void main() {");
        this.indent();
        // Define arguments.
        for (var name_4 in spec.variables) {
            if (spec.variables.hasOwnProperty(name_4)) {
                var type = spec.variables[name_4];
                this.addDeclaration(name_4, type);
            }
        }
        this.addStatements(spec.statements);
        this.unindent();
        this.addLine("}");
    };
    Generator.prototype.addStatements = function (stat) {
        var _this = this;
        stat.forEach(function (s) { return _this.addStatement(s); });
    };
    Generator.prototype.getCode = function () {
        var _this = this;
        return this._lines.map(function (line) {
            if (line.trim() == "@additionalCode")
                return _this._additionalCodes.join("\n");
            return line;
        }).join("\n");
    };
    Generator.prototype.getFragmentCode = function () {
        switch (this._mode) {
            case GenerateMode.NORMAL: {
                if (this._hasColor) {
                    return "\n                        precision highp float;\n                        varying vec4 out_color;\n                        void main() {\n                            gl_FragColor = out_color;\n                        }\n                    ";
                }
                else {
                    return "\n                        precision highp float;\n                        void main() {\n                            gl_FragColor = vec4(0, 0, 0, 1);\n                        }\n                    ";
                }
            }
            case GenerateMode.PICK: {
                return "\n                    precision highp float;\n                    varying vec4 out_pick_index;\n                    void main() {\n                        gl_FragColor = out_pick_index;\n                    }\n                ";
            }
        }
    };
    return Generator;
}());
exports.Generator = Generator;

},{"./intrinsics":27,"./types":28}],27:[function(require,module,exports){
"use strict";
var stardust_core_1 = require("stardust-core");
var stardust_core_2 = require("stardust-core");
var intrinsicImplementations = new stardust_core_2.Dictionary();
var intrinsicsCodeBase = new stardust_core_2.Dictionary();
function ImplementFunction(name, argTypes, returnType, code) {
    var internalName = stardust_core_1.getInternalName({ name: name, argTypes: argTypes, returnType: returnType });
    intrinsicImplementations.set(internalName, code);
}
function ImplementSimpleFunction(name, argTypes, returnType, funcName, funcCode) {
    ImplementFunction(name, argTypes, returnType, function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        return funcName + "(" + args.join(", ") + ")";
    });
    if (funcCode) {
        var internalName = stardust_core_1.getInternalName({ name: name, argTypes: argTypes, returnType: returnType });
        intrinsicsCodeBase.set(internalName, funcCode);
    }
}
function ImplementOperator(name, argTypes, returnType, code) {
    ImplementFunction("@" + name, argTypes, returnType, code);
}
function ImplementTypeConversion(srcType, destType, code) {
    ImplementFunction("cast:" + srcType + ":" + destType, [srcType], destType, code);
}
for (var _i = 0, _a = ["float", "int", "Vector2", "Vector3", "Vector4", "Color"]; _i < _a.length; _i++) {
    var type = _a[_i];
    ImplementOperator("+", [type, type], type, function (a, b) { return ("(" + a + ") + (" + b + ")"); });
    ImplementOperator("-", [type, type], type, function (a, b) { return ("(" + a + ") - (" + b + ")"); });
    ImplementOperator("*", [type, type], type, function (a, b) { return ("(" + a + ") * (" + b + ")"); });
    ImplementOperator("/", [type, type], type, function (a, b) { return ("(" + a + ") / (" + b + ")"); });
    if (type != "Color") {
        ImplementOperator("+", [type], type, function (a, b) { return ("" + a); });
        ImplementOperator("-", [type], type, function (a, b) { return ("-(" + a + ")"); });
    }
}
ImplementOperator("*", ["float", "Vector2"], "Vector2", function (a, b) { return ("(" + a + ") * (" + b + ")"); });
ImplementOperator("*", ["float", "Vector3"], "Vector3", function (a, b) { return ("(" + a + ") * (" + b + ")"); });
ImplementOperator("*", ["float", "Vector4"], "Vector4", function (a, b) { return ("(" + a + ") * (" + b + ")"); });
ImplementOperator("*", ["Vector2", "float"], "Vector2", function (a, b) { return ("(" + a + ") * (" + b + ")"); });
ImplementOperator("*", ["Vector3", "float"], "Vector3", function (a, b) { return ("(" + a + ") * (" + b + ")"); });
ImplementOperator("*", ["Vector4", "float"], "Vector4", function (a, b) { return ("(" + a + ") * (" + b + ")"); });
ImplementOperator("/", ["Vector2", "float"], "Vector2", function (a, b) { return ("(" + a + ") / (" + b + ")"); });
ImplementOperator("/", ["Vector3", "float"], "Vector3", function (a, b) { return ("(" + a + ") / (" + b + ")"); });
ImplementOperator("/", ["Vector4", "float"], "Vector4", function (a, b) { return ("(" + a + ") / (" + b + ")"); });
// ImplementOperator("%", [ "int", "int" ], "int", (a, b) => `(${a}) % (${b})`);
ImplementOperator("%", ["float", "float"], "float", function (a, b) { return ("mod(" + a + ", " + b + ")"); });
for (var _b = 0, _c = ["float", "int", "bool"]; _b < _c.length; _b++) {
    var type = _c[_b];
    ImplementOperator("==", [type, type], "bool", function (a, b) { return ("(" + a + ") == (" + b + ")"); });
}
for (var _d = 0, _e = ["float", "int"]; _d < _e.length; _d++) {
    var type = _e[_d];
    ImplementOperator(">", [type, type], "bool", function (a, b) { return ("(" + a + ") > (" + b + ")"); });
    ImplementOperator("<", [type, type], "bool", function (a, b) { return ("(" + a + ") < (" + b + ")"); });
    ImplementOperator(">=", [type, type], "bool", function (a, b) { return ("(" + a + ") >= (" + b + ")"); });
    ImplementOperator("<=", [type, type], "bool", function (a, b) { return ("(" + a + ") <= (" + b + ")"); });
}
ImplementOperator("!", ["bool"], "bool", function (a) { return ("!(" + a + ")"); });
ImplementOperator("&&", ["bool", "bool"], "bool", function (a, b) { return ("(" + a + ") && (" + b + ")"); });
ImplementOperator("||", ["bool", "bool"], "bool", function (a, b) { return ("(" + a + ") || (" + b + ")"); });
ImplementSimpleFunction("Vector2", ["float", "float"], "Vector2", "vec2");
ImplementSimpleFunction("Vector3", ["float", "float", "float"], "Vector3", "vec3");
ImplementSimpleFunction("Vector4", ["float", "float", "float", "float"], "Vector4", "vec4");
ImplementSimpleFunction("Color", ["float", "float", "float", "float"], "Color", "vec4");
ImplementSimpleFunction("Quaternion", ["float", "float", "float", "float"], "Quaternion", "vec4");
ImplementSimpleFunction("normalize", ["Vector2"], "Vector2", "normalize");
ImplementSimpleFunction("normalize", ["Vector3"], "Vector3", "normalize");
ImplementSimpleFunction("normalize", ["Vector4"], "Vector4", "normalize");
ImplementSimpleFunction("normalize", ["Quaternion"], "Vector4", "normalize");
ImplementSimpleFunction("dot", ["Vector2", "Vector2"], "float", "dot");
ImplementSimpleFunction("dot", ["Vector3", "Vector3"], "float", "dot");
ImplementSimpleFunction("dot", ["Vector4", "Vector4"], "float", "dot");
ImplementSimpleFunction("length", ["Vector2"], "float", "length");
ImplementSimpleFunction("length", ["Vector3"], "float", "length");
ImplementSimpleFunction("length", ["Vector4"], "float", "length");
ImplementSimpleFunction("length", ["Quaternion"], "float", "length");
ImplementSimpleFunction("cross", ["Vector3", "Vector3"], "Vector3", "cross");
ImplementSimpleFunction("quat_mul", ["Quaternion", "Quaternion"], "Quaternion", "s3_quat_mul", "\n    vec4 s3_quat_mul(vec4 q1, vec4 q2) {\n        return vec4(\n            q1.w * q2.xyz + q2.w * q1.xyz + cross(q1.xyz, q2.xyz),\n            q1.w * q2.w - dot(q1.xyz, q2.xyz)\n        );\n    }\n");
ImplementSimpleFunction("quat_rotate", ["Quaternion", "Vector3"], "Vector3", "s3_quat_rotate", "\n    vec3 s3_quat_rotate(vec4 q, vec3 v) {\n        float d = dot(q.xyz, v);\n        vec3 c = cross(q.xyz, v);\n        return q.w * q.w * v + (q.w + q.w) * c + d * q.xyz - cross(c, q.xyz);\n    }\n");
var colorCode = "\n    float s3_lab2rgb_curve(float v) {\n        float p = pow(v, 3.0);\n        if(p > 0.008856) {\n            return p;\n        } else {\n            return (v - 16.0 / 116.0) / 7.787;\n        }\n    }\n    float s3_lab2rgb_curve2(float v) {\n        if(v > 0.0031308) {\n            return 1.055 * pow(v , (1.0 / 2.4)) - 0.055;\n        } else {\n            return 12.92 * v;\n        }\n    }\n    vec4 s3_lab2rgb(vec4 lab) {\n        float var_Y = (lab.x + 0.160) / 1.160;\n        float var_X = lab.y / 5.0 + var_Y;\n        float var_Z = var_Y - lab.z / 2.0;\n\n        var_X = s3_lab2rgb_curve(var_X) * 0.95047;\n        var_Y = s3_lab2rgb_curve(var_Y);\n        var_Z = s3_lab2rgb_curve(var_Z) * 1.08883;\n\n        float var_R = var_X *  3.2406 + var_Y * -1.5372 + var_Z * -0.4986;\n        float var_G = var_X * -0.9689 + var_Y *  1.8758 + var_Z *  0.0415;\n        float var_B = var_X *  0.0557 + var_Y * -0.2040 + var_Z *  1.0570;\n\n        var_R = s3_lab2rgb_curve2(var_R);\n        var_G = s3_lab2rgb_curve2(var_G);\n        var_B = s3_lab2rgb_curve2(var_B);\n\n        return vec4(var_R, var_G, var_B, lab.a);\n    }\n    vec4 s3_hcl2rgb(vec4 hcl) {\n        vec4 lab = vec4(hcl.z, hcl.y * cos(hcl.x), hcl.y * sin(hcl.x), hcl.a);\n        return s3_lab2rgb(lab);\n    }\n";
ImplementSimpleFunction("lab2rgb", ["Color"], "Color", "s3_lab2rgb", colorCode);
ImplementSimpleFunction("hcl2rgb", ["Color"], "Color", "s3_hcl2rgb", colorCode);
ImplementSimpleFunction("sqrt", ["float"], "float", "sqrt");
ImplementSimpleFunction("exp", ["float"], "float", "exp");
ImplementSimpleFunction("log", ["float"], "float", "log");
ImplementSimpleFunction("sin", ["float"], "float", "sin");
ImplementSimpleFunction("cos", ["float"], "float", "cos");
ImplementSimpleFunction("tan", ["float"], "float", "tan");
ImplementSimpleFunction("asin", ["float"], "float", "asin");
ImplementSimpleFunction("acos", ["float"], "float", "acos");
ImplementSimpleFunction("atan", ["float"], "float", "atan");
ImplementSimpleFunction("atan2", ["float", "float"], "float", "atan2");
ImplementSimpleFunction("min", ["float", "float"], "float", "min");
ImplementSimpleFunction("max", ["float", "float"], "float", "max");
ImplementSimpleFunction("ceil", ["float"], "float", "ceil");
ImplementSimpleFunction("floor", ["float"], "float", "floor");
ImplementSimpleFunction("mix", ["float", "float", "float"], "float", "mix");
ImplementTypeConversion("float", "int", function (a) { return ("int(" + a + ")"); });
ImplementTypeConversion("int", "float", function (a) { return ("float(" + a + ")"); });
function generateIntrinsicFunction(name, args) {
    if (intrinsicImplementations.has(name)) {
        if (intrinsicsCodeBase.has(name)) {
            return { code: intrinsicImplementations.get(name).apply(void 0, args), additionalCode: intrinsicsCodeBase.get(name) };
        }
        else {
            return { code: intrinsicImplementations.get(name).apply(void 0, args), additionalCode: null };
        }
    }
    else {
        throw new Error("intrinsic function " + name + " is not defined.");
    }
}
exports.generateIntrinsicFunction = generateIntrinsicFunction;

},{"stardust-core":24}],28:[function(require,module,exports){
"use strict";
var typeName2WebGLTypeName = {
    "float": "float",
    "int": "int",
    "bool": "bool",
    "Vector2": "vec2",
    "Vector3": "vec3",
    "Vector4": "vec4",
    "Quaternion": "vec4",
    "Color": "vec4"
};
function convertTypeName(name) {
    return typeName2WebGLTypeName[name];
}
exports.convertTypeName = convertTypeName;
function convertConstant(type, value) {
    if (type == "float") {
        return value.toFixed(5);
    }
    if (type == "int") {
        return value.toString();
    }
    if (type == "bool") {
        return value != 0 ? "true" : "false";
    }
    if (type == "Vector2") {
        return "vec2(" + value.join(", ") + ")";
    }
    if (type == "Vector3") {
        return "vec3(" + value.join(", ") + ")";
    }
    if (type == "Vector4") {
        return "vec4(" + value.join(", ") + ")";
    }
    if (type == "Color") {
        return "vec4(" + value.join(", ") + ")";
    }
}
exports.convertConstant = convertConstant;

},{}],29:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var stardust_core_1 = require("stardust-core");
var stardust_core_2 = require("stardust-core");
var stardust_core_3 = require("stardust-core");
var generator_1 = require("./generator");
var stardust_core_4 = require("stardust-core");
var stardust_core_5 = require("stardust-core");
var WebGLUtils = require("./webglutils");
var WebGLPlatformShapeProgram = (function () {
    function WebGLPlatformShapeProgram(GL, spec, asUniform, viewType, mode) {
        this._GL = GL;
        var generator = new generator_1.Generator(viewType, mode);
        generator.compileSpecification(spec, asUniform);
        this._program = WebGLUtils.compileProgram(this._GL, generator.getCode(), generator.getFragmentCode());
        this._uniformLocations = new stardust_core_3.Dictionary();
        this._attribLocations = new stardust_core_3.Dictionary();
    }
    WebGLPlatformShapeProgram.prototype.use = function () {
        this._GL.useProgram(this._program);
    };
    WebGLPlatformShapeProgram.prototype.setUniform = function (name, type, value) {
        var location = this.getUniformLocation(name);
        if (location == null)
            return;
        var GL = this._GL;
        if (type.primitive == "float") {
            var va = value;
            switch (type.primitiveCount) {
                case 1:
                    GL.uniform1f(location, value);
                    break;
                case 2:
                    GL.uniform2f(location, va[0], va[1]);
                    break;
                case 3:
                    GL.uniform3f(location, va[0], va[1], va[2]);
                    break;
                case 4:
                    GL.uniform4f(location, va[0], va[1], va[2], va[3]);
                    break;
            }
        }
        if (type.primitive == "int") {
            var va = value;
            switch (type.primitiveCount) {
                case 1:
                    GL.uniform1i(location, value);
                    break;
                case 2:
                    GL.uniform2i(location, va[0], va[1]);
                    break;
                case 3:
                    GL.uniform3i(location, va[0], va[1], va[2]);
                    break;
                case 4:
                    GL.uniform4i(location, va[0], va[1], va[2], va[3]);
                    break;
            }
        }
    };
    WebGLPlatformShapeProgram.prototype.getUniformLocation = function (name) {
        if (this._uniformLocations.has(name)) {
            return this._uniformLocations.get(name);
        }
        else {
            var location_1 = this._GL.getUniformLocation(this._program, name);
            this._uniformLocations.set(name, location_1);
            return location_1;
        }
    };
    WebGLPlatformShapeProgram.prototype.getAttribLocation = function (name) {
        if (this._attribLocations.has(name)) {
            return this._attribLocations.get(name);
        }
        else {
            var location_2 = this._GL.getAttribLocation(this._program, name);
            if (location_2 < 0)
                location_2 = null;
            this._attribLocations.set(name, location_2);
            return location_2;
        }
    };
    return WebGLPlatformShapeProgram;
}());
var WebGLPlatformShapeData = (function (_super) {
    __extends(WebGLPlatformShapeData, _super);
    function WebGLPlatformShapeData() {
        _super.apply(this, arguments);
    }
    return WebGLPlatformShapeData;
}(stardust_core_1.PlatformShapeData));
exports.WebGLPlatformShapeData = WebGLPlatformShapeData;
var WebGLPlatformShape = (function (_super) {
    __extends(WebGLPlatformShape, _super);
    function WebGLPlatformShape(platform, GL, shape, spec, bindings, shiftBindings) {
        var _this = this;
        _super.call(this);
        this._platform = platform;
        this._GL = GL;
        this._shape = shape;
        this._bindings = bindings;
        this._shiftBindings = shiftBindings;
        this._spec = spec;
        var flattenedInfo = stardust_core_2.FlattenEmits(spec);
        this._specFlattened = flattenedInfo.specification;
        this._flattenedVertexIndexVariable = flattenedInfo.indexVariable;
        this._flattenedVertexCount = flattenedInfo.count;
        this._program = new WebGLPlatformShapeProgram(GL, this._specFlattened, function (name) { return _this.isUniform(name); }, this._platform.viewInfo.type, generator_1.GenerateMode.NORMAL);
        this._programPick = new WebGLPlatformShapeProgram(GL, this._specFlattened, function (name) { return _this.isUniform(name); }, this._platform.viewInfo.type, generator_1.GenerateMode.PICK);
        this.initializeUniforms();
    }
    WebGLPlatformShape.prototype.initializeUniforms = function () {
        for (var name_1 in this._specFlattened.input) {
            if (this.isUniform(name_1)) {
                this.updateUniform(name_1, this._bindings.get(name_1).specValue);
            }
        }
    };
    WebGLPlatformShape.prototype.initializeBuffers = function () {
        var _this = this;
        var GL = this._GL;
        var data = new WebGLPlatformShapeData();
        data.buffers = new stardust_core_3.Dictionary();
        ;
        this._bindings.forEach(function (binding, name) {
            if (!_this.isUniform(name)) {
                var location_3 = _this._program.getAttribLocation(name);
                if (location_3 != null) {
                    data.buffers.set(name, GL.createBuffer());
                }
            }
        });
        data.buffers.set(this._flattenedVertexIndexVariable, GL.createBuffer());
        if (this._programPick) {
            data.buffers.set("s3_pick_index", GL.createBuffer());
        }
        data.vertexCount = 0;
        return data;
    };
    // Is the input attribute compiled as uniform?
    WebGLPlatformShape.prototype.isUniform = function (name) {
        // Extra variables we add are always not uniforms.
        if (name == this._flattenedVertexIndexVariable)
            return false;
        if (this._bindings.get(name) == null) {
            console.log(this._shiftBindings, name);
            if (this._shiftBindings.get(name) == null) {
                throw new stardust_core_4.RuntimeError("attribute " + name + " is not specified.");
            }
            else {
                return false;
            }
        }
        else {
            // Look at the binding to determine.
            return !this._bindings.get(name).isFunction;
        }
    };
    WebGLPlatformShape.prototype.updateUniform = function (name, value) {
        var binding = this._bindings.get(name);
        var type = binding.type;
        this._program.use();
        this._program.setUniform(name, type, value);
        if (this._programPick) {
            this._programPick.use();
            this._programPick.setUniform(name, type, value);
        }
    };
    WebGLPlatformShape.prototype.uploadData = function (data) {
        var buffers = this.initializeBuffers();
        var n = data.length;
        var GL = this._GL;
        var bindings = this._bindings;
        var rep = this._flattenedVertexCount;
        this._bindings.forEach(function (binding, name) {
            var buffer = buffers.buffers.get(name);
            if (buffer == null)
                return;
            var type = binding.type;
            var array = new Float32Array(type.primitiveCount * n * rep);
            binding.fillBinary(data, rep, array);
            GL.bindBuffer(GL.ARRAY_BUFFER, buffer);
            GL.bufferData(GL.ARRAY_BUFFER, array, GL.STATIC_DRAW);
        });
        // The vertex index attribute.
        var array = new Float32Array(n * rep);
        for (var i = 0; i < n * rep; i++) {
            array[i] = i % rep;
        }
        GL.bindBuffer(GL.ARRAY_BUFFER, buffers.buffers.get(this._flattenedVertexIndexVariable));
        GL.bufferData(GL.ARRAY_BUFFER, array, GL.STATIC_DRAW);
        // The pick index attribute.
        if (this._programPick) {
            var array_1 = new Float32Array(n * rep * 4);
            for (var i = 0; i < n * rep; i++) {
                var index = Math.floor(i / rep);
                array_1[i * 4 + 0] = (index & 0xff) / 255.0;
                array_1[i * 4 + 1] = ((index & 0xff00) >> 8) / 255.0;
                array_1[i * 4 + 2] = ((index & 0xff0000) >> 16) / 255.0;
                array_1[i * 4 + 3] = ((index & 0xff000000) >> 24) / 255.0;
            }
            GL.bindBuffer(GL.ARRAY_BUFFER, buffers.buffers.get("s3_pick_index"));
            GL.bufferData(GL.ARRAY_BUFFER, array_1, GL.STATIC_DRAW);
        }
        buffers.vertexCount = n * rep;
        return buffers;
    };
    // Render the graphics.
    WebGLPlatformShape.prototype.renderBase = function (buffers, mode) {
        if (buffers.vertexCount > 0) {
            var GL = this._GL;
            var spec = this._specFlattened;
            var bindings = this._bindings;
            // Decide which program to use
            var program = this._program;
            if (mode == generator_1.GenerateMode.PICK) {
                program = this._programPick;
            }
            program.use();
            var minOffset_1 = 0;
            var maxOffset_1 = 0;
            this._shiftBindings.forEach(function (shift, name) {
                if (shift.offset > maxOffset_1)
                    maxOffset_1 = shift.offset;
                if (shift.offset < minOffset_1)
                    minOffset_1 = shift.offset;
            });
            // Assign attributes to buffers
            for (var name_2 in spec.input) {
                var attributeLocation = program.getAttribLocation(name_2);
                if (attributeLocation == null)
                    continue;
                if (this._shiftBindings.has(name_2)) {
                    var shift = this._shiftBindings.get(name_2);
                    GL.bindBuffer(GL.ARRAY_BUFFER, buffers.buffers.get(shift.name));
                    GL.enableVertexAttribArray(attributeLocation);
                    var type = bindings.get(shift.name).type;
                    GL.vertexAttribPointer(attributeLocation, type.primitiveCount, type.primitive == "float" ? GL.FLOAT : GL.INT, false, 0, type.size * (shift.offset - minOffset_1) * this._flattenedVertexCount);
                }
                else {
                    GL.bindBuffer(GL.ARRAY_BUFFER, buffers.buffers.get(name_2));
                    GL.enableVertexAttribArray(attributeLocation);
                    if (name_2 == this._flattenedVertexIndexVariable) {
                        GL.vertexAttribPointer(attributeLocation, 1, GL.FLOAT, false, 0, 4 * (-minOffset_1) * this._flattenedVertexCount);
                    }
                    else {
                        var type = bindings.get(name_2).type;
                        GL.vertexAttribPointer(attributeLocation, type.primitiveCount, type.primitive == "float" ? GL.FLOAT : GL.INT, false, 0, type.size * (-minOffset_1) * this._flattenedVertexCount);
                    }
                }
            }
            // For pick mode, assign the pick index buffer
            if (mode == generator_1.GenerateMode.PICK) {
                var attributeLocation = program.getAttribLocation("s3_pick_index");
                GL.bindBuffer(GL.ARRAY_BUFFER, buffers.buffers.get("s3_pick_index"));
                GL.enableVertexAttribArray(attributeLocation);
                GL.vertexAttribPointer(attributeLocation, 4, GL.FLOAT, false, 0, 0);
            }
            // Set view uniforms
            var viewInfo = this._platform.viewInfo;
            var pose = this._platform.pose;
            switch (viewInfo.type) {
                case generator_1.ViewType.VIEW_2D:
                    {
                        GL.uniform4f(program.getUniformLocation("s3_view_params"), 2.0 / viewInfo.width, -2.0 / viewInfo.height, -1, +1);
                    }
                    break;
                case generator_1.ViewType.VIEW_3D:
                    {
                        GL.uniform4f(program.getUniformLocation("s3_view_params"), 1.0 / Math.tan(viewInfo.fovY / 2.0) / viewInfo.aspectRatio, 1.0 / Math.tan(viewInfo.fovY / 2.0), (viewInfo.near + viewInfo.far) / (viewInfo.near - viewInfo.far), (2.0 * viewInfo.near * viewInfo.far) / (viewInfo.near - viewInfo.far));
                        if (pose) {
                            // Rotation and position.
                            GL.uniform4f(program.getUniformLocation("s3_view_rotation"), pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
                            GL.uniform3f(program.getUniformLocation("s3_view_position"), pose.position.x, pose.position.y, pose.position.z);
                        }
                        else {
                            GL.uniform4f(program.getUniformLocation("s3_view_rotation"), 0, 0, 0, 1);
                            GL.uniform3f(program.getUniformLocation("s3_view_position"), 0, 0, 0);
                        }
                    }
                    break;
            }
            // For pick, set the shape index
            if (mode == generator_1.GenerateMode.PICK) {
                GL.uniform1f(program.getUniformLocation("s3_pick_index_alpha"), this._pickIndex / 255.0);
            }
            // Draw arrays
            GL.drawArrays(GL.TRIANGLES, 0, buffers.vertexCount - (maxOffset_1 - minOffset_1) * this._flattenedVertexCount);
            // Unbind attributes
            for (var name_3 in spec.input) {
                var attributeLocation = program.getAttribLocation(name_3);
                if (attributeLocation != null) {
                    GL.disableVertexAttribArray(attributeLocation);
                }
            }
            // Unbind the pick index buffer
            if (mode == generator_1.GenerateMode.PICK) {
                var attributeLocation = program.getAttribLocation("s3_pick_index");
                GL.disableVertexAttribArray(attributeLocation);
            }
        }
    };
    WebGLPlatformShape.prototype.setPickIndex = function (index) {
        this._pickIndex = index;
    };
    WebGLPlatformShape.prototype.render = function (buffers) {
        if (this._platform.renderMode == generator_1.GenerateMode.PICK) {
            this.setPickIndex(this._platform.assignPickIndex(this._shape));
        }
        this.renderBase(buffers, this._platform.renderMode);
    };
    return WebGLPlatformShape;
}(stardust_core_1.PlatformShape));
exports.WebGLPlatformShape = WebGLPlatformShape;
var WebGLPlatform = (function (_super) {
    __extends(WebGLPlatform, _super);
    function WebGLPlatform(GL) {
        _super.call(this);
        this._GL = GL;
        this.set2DView(500, 500);
        this.setPose(new stardust_core_5.Pose());
        this._renderMode = generator_1.GenerateMode.NORMAL;
        this._pickFramebuffer = null;
    }
    Object.defineProperty(WebGLPlatform.prototype, "viewInfo", {
        get: function () { return this._viewInfo; },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(WebGLPlatform.prototype, "pose", {
        get: function () { return this._pose; },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(WebGLPlatform.prototype, "renderMode", {
        get: function () { return this._renderMode; },
        enumerable: true,
        configurable: true
    });
    WebGLPlatform.prototype.getPickFramebuffer = function (width, height) {
        if (this._pickFramebuffer == null || width != this._pickFramebufferWidth || height != this._pickFramebufferHeight) {
            var GL = this._GL;
            this._pickFramebuffer = GL.createFramebuffer();
            this._pickFramebufferWidth = width;
            this._pickFramebufferHeight = height;
            GL.bindFramebuffer(GL.FRAMEBUFFER, this._pickFramebuffer);
            this._pickFramebufferTexture = GL.createTexture();
            GL.bindTexture(GL.TEXTURE_2D, this._pickFramebufferTexture);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
            GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, width, height, 0, GL.RGBA, GL.UNSIGNED_BYTE, null);
            GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, this._pickFramebufferTexture, 0);
            GL.bindTexture(GL.TEXTURE_2D, null);
            GL.bindFramebuffer(GL.FRAMEBUFFER, null);
        }
        return this._pickFramebuffer;
    };
    WebGLPlatform.prototype.beginPicking = function (width, height) {
        this._renderMode = generator_1.GenerateMode.PICK;
        var GL = this._GL;
        var fb = this.getPickFramebuffer(width, height);
        GL.bindFramebuffer(GL.FRAMEBUFFER, fb);
        GL.clearColor(1, 1, 1, 1);
        GL.clear(GL.COLOR_BUFFER_BIT);
        GL.disable(GL.BLEND);
        this._pickShapes = [];
    };
    WebGLPlatform.prototype.assignPickIndex = function (shape) {
        var idx = this._pickShapes.indexOf(shape);
        if (idx >= 0) {
            return idx;
        }
        else {
            var num = this._pickShapes.length;
            this._pickShapes.push(shape);
            return num;
        }
    };
    WebGLPlatform.prototype.endPicking = function () {
        var GL = this._GL;
        GL.bindFramebuffer(GL.FRAMEBUFFER, null);
        GL.enable(GL.BLEND);
        this._renderMode = generator_1.GenerateMode.NORMAL;
    };
    WebGLPlatform.prototype.getPickingPixel = function (x, y) {
        if (x < 0 || y < 0 || x >= this._pickFramebufferWidth || y >= this._pickFramebufferHeight) {
            return null;
        }
        var GL = this._GL;
        var fb = this._pickFramebuffer;
        GL.bindFramebuffer(GL.FRAMEBUFFER, fb);
        var data = new Uint8Array(4);
        GL.readPixels(x, this._pickFramebufferHeight - 1 - y, 1, 1, GL.RGBA, GL.UNSIGNED_BYTE, data);
        GL.bindFramebuffer(GL.FRAMEBUFFER, null);
        var offset = (data[0]) + (data[1] << 8) + (data[2] << 16);
        if (offset >= 16777215)
            return null;
        return [this._pickShapes[data[3]], offset];
    };
    WebGLPlatform.prototype.set2DView = function (width, height) {
        this._viewInfo = {
            type: generator_1.ViewType.VIEW_2D,
            width: width,
            height: height
        };
    };
    WebGLPlatform.prototype.set3DView = function (fovY, aspectRatio, near, far) {
        if (near === void 0) { near = 0.1; }
        if (far === void 0) { far = 1000; }
        this._viewInfo = {
            type: generator_1.ViewType.VIEW_3D,
            fovY: fovY,
            aspectRatio: aspectRatio,
            near: near,
            far: far
        };
    };
    WebGLPlatform.prototype.setPose = function (pose) {
        this._pose = pose;
    };
    WebGLPlatform.prototype.compile = function (shape, spec, bindings, shiftBindings) {
        return new WebGLPlatformShape(this, this._GL, shape, spec, bindings, shiftBindings);
    };
    return WebGLPlatform;
}(stardust_core_1.Platform));
exports.WebGLPlatform = WebGLPlatform;

},{"./generator":26,"./webglutils":30,"stardust-core":24}],30:[function(require,module,exports){
"use strict";
var stardust_core_1 = require("stardust-core");
function compileProgram(GL, vsCode, fsCode) {
    // Vertex shader
    var vsShader = GL.createShader(GL.VERTEX_SHADER);
    GL.shaderSource(vsShader, vsCode);
    GL.compileShader(vsShader);
    var success = GL.getShaderParameter(vsShader, GL.COMPILE_STATUS);
    if (!success) {
        console.log("Vertex shader code is:", vsCode);
        throw new stardust_core_1.RuntimeError("could not compile vertex shader: " + GL.getShaderInfoLog(vsShader));
    }
    // Fragment shader
    var fsShader = GL.createShader(GL.FRAGMENT_SHADER);
    GL.shaderSource(fsShader, fsCode);
    GL.compileShader(fsShader);
    success = GL.getShaderParameter(fsShader, GL.COMPILE_STATUS);
    if (!success) {
        console.log("Fragment shader code is:", fsCode);
        throw new stardust_core_1.RuntimeError("could not compile fragment shader: " + GL.getShaderInfoLog(fsShader));
    }
    // Link the program
    var program = GL.createProgram();
    GL.attachShader(program, vsShader);
    GL.attachShader(program, fsShader);
    GL.linkProgram(program);
    if (!GL.getProgramParameter(program, GL.LINK_STATUS)) {
        throw new stardust_core_1.RuntimeError("could not link shader: " + GL.getProgramInfoLog(program));
    }
    return program;
}
exports.compileProgram = compileProgram;

},{"stardust-core":24}],31:[function(require,module,exports){
"use strict";
exports.version = "0.0.1";
var platforms_1 = require("./platforms/platforms");
exports.WebGLPlatform = platforms_1.WebGLPlatform;

},{"./platforms/platforms":25}]},{},[1])(1)
});