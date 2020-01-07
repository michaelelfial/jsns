jsns.namespace("$").public("oop").code(function($import, ns) {
	ns.Class = function(name, baseclass, _constructor) {
		if (typeof name != "string" || /^[A-Za-z\$\_][A-Za-z0-9\$\_]*$/.test(name)) {
			return null; // name invalid
		}
		if (typeof _constructor != "function") return null; // _constructor is not a function
		if (typeof baseclass == "function" && baseclass.constructor == Function) {
			for (var k in baseclass.prototype) {
				_constructor.prototype[k] = baseclass.prototype[k];
			}
			_constructor.prototype.constructor = _constructor;
		} else {
			return null; // baseclass is not a class
		}
		_constructor.className = name;
		_constructor.prototype.__type = function() { return _constructor; }
		_constructor.prototype.__parentType = function() { return baseclass; }
		return _constructor;
	}
	
});