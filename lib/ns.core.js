jsns.namespace("$").public("core").code(function($import, thisns) {
	var Root = thisns.Root = function Root() {
	}
	Root.prototype.__type = function() { return Root; }
	Root.prototype.__parent = function() { return null; }
	Root.prototype.toString = function() {
		return this.__type().className;
	}
});