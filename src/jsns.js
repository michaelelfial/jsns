var jsns = (function(global) {
	var namespaces = {
		// Namespaces get here
		/*
			nsname: {
				ns: { the namespace },
				children: { child namespaces (recursion) },
				meta: { system metadata }
			}
		*/
		"$" : {
			ns: {},
			children: { },
			meta: { sealed: false, access: "public" }
		}
	};
	var sysns = null; // Can be set only once and only from the inside of a namespace.
	
	var lastError = null;
	function _err(result, desc) {
		lastError = desc;
		if (global.console) global.console.log("jsns: " + desc);
		return result;
	}
	function findNamespace(/*[]*/ path, /* f():bool */ accesscallback) {
		if (typeof path == "string") {
			path = path.split(".");
		}
		if (Array.isArray(path)) {
			var nschildren = namespaces, ns = null;
			for (var i = 0; i < path.length; i++) {
				if (nschildren == null) return _err(null, "namespace not found:" + path.join(".")); // ERR: not found
				var part = path[i];
				if (/^\s*$/.test(part)) return _err(null, "empty part in namespace path:" + path.join(".")); // ERR: Empty ns name part
				ns = nschildren[part];
				nschildren = null;
				if (ns != null) {
					nschildren = ns.children;
				}
			}
			if (ns != null) {
				return ns;
			} else {
				return _err(null, "namespace not found:" + path.join(".")); // ERR: not found
			}
		} else {
			return _err(null, "namespace path incorrect");
		}
	}
	function createNamespace(base, name, joinNS, access) {
		if (/^[A-Za-z\$][A-Za-z0-9_\-\$]*$/.test(name)) {
			if (base != null) {
				if (base.children[name] != null) {
					if (joinNS) {
						if (base.children[name].meta && base.children[name].meta.sealed) {
							return _err(null, "cannot join namespace, the namespace is sealed");
						}
						if (typeof access == "string") {
							if (access != base.children[name].meta.access) {
								return _err(null, "cannot join namespace by specifying different access level");
							}
						}
						return base.children[name];
					} else {
						return _err(null, "namespace already exists");
					}
				} else {
					if (base.meta.sealed) return _err(null, "cannot create namespace in a sealed one");
					var newns = {
						ns: {
							$seal: function(access) {
								newns.meta.sealed = true;
								delete this.$seal; // remove self
							}
						},
						children: {},
						meta: { sealed: false, access: "public" }
					};
					switch(access) {
						case: "protected":
							newns.meta.access = "protected";
						break;
						case: "private":
							newns.meta.access = "private";
						break;
					}
					base.children[name] = newns;
					return base.children[name];
				}
			} else {
				return _err(null, "base namespace is null while creating a child namespace");
			}
		} else {
			return _err(null, "incorrect namespace name while creating a new namespace");
		}
	}
	
	
	// Namespace manager
	function Namespace(parent) {
		this.parent = parent;
	}
	Namespace.prototype.code = function(/*function(importer, thisns)*/ proc) {
			function importer(nspath) {
				
			}
			proc.call(null, importer,this.p);
		}
	}
	
	var reimp = /^([^\:]+)(?:\:(.+))?$/g;
	function importSymbols(arr, namespaceimport, callingns) {
		// This needs some rethinking
		// namespace should list the symbols to import, otherwise we cannot match arguments.
		if (arr == null) arr = [];
		if (typeof namespaceimport == "string") {
			reimp.lastIndex = 0;
			var match = reimp.exec(namespaceimport);
			if (match != null) {
				var ns = findNamespace(match[1]);
				if (ns != null && ns.ns != null) {
					if (ns.meta.access == "private") return _err(null, "the namespace you are trying to import is private: " + match[1]);
					if (ns.meta.access == "protected") {
						if (callingns.indexOf(match[1]) != 0) return _err(null, "the namespace you are trying to import is protected and can be imported only by inner namespaces: " + match[1]);
					}
					if (!ns.meta.sealed) return _err(null, "the namespace you are trying to import is not sealed yet: " + match[1]);
					if (match[2]) {
						match = match[2].split(",");
						if (match) {
							for (var i = 0; i < match.length; i++) {
								var sym = match[i].trim();
								arr.push(ns.ns[sym]);
							}
						}
					} else {
						var result = {};
						for (var k in ns.ns) {
							result[k] = ns.ns[k];
						}
						arr.push(result);
					}
				}
			} else {
				return _err(null, "Wrong import syntax. Import entry looks like (abc.def.gh: sym1, sym2)");
			}
		}
		return arr;
	}
	
	var nsmgr = {
		namespace: function(path) {
			function importer(nspath, ref) {
				var _ns = findNamespace(nspath);
				if (_ns != null) {
					if (_ns.meta.access == "private") return _err(null, "the namespace you are trying to import is private: " + nspath);
					if (_ns.meta.access == "protected" && current_ns_path.indexOf(nspath) != 0) return _err(null, "the namespace you are trying to import is protected and can be imported only by nested ones: " + nspath);
					if (!_ns.meta.sealed) return _err(null, "the namespace you are trying to import is not sealed yet: " + nspath);
					if (typeof ref == "string") {
						return _ns.ns[ref];
					}
					var result = {};
					for (var k in _ns.ns) {
						result[k] = _ns.ns[k];
					} // To prevent temperint without losing IE9 compatibility
					Object.seal(result); // To prevent user from delusions
					return result;
				}
				return null;
			}
			function _nscopy(x) {
				if (x) {
					var r = {};/////////////
					for (var k in x) {
						r[k] = x[k];
					}
					return r;
				}
				return null;
			}
			var _sysns = sysns ? _nscopy(sysns.ns) : function() {
				_setsysns();
			}
			function _setsysns() {
				if (sysns != null) throw "The system namespace can be only one and set once. Attempted to set it in: " + current_ns_path;
				sysns = ns;
				_sysns = _nscopy(sysns.ns);
			}
			var ns = findNamespace(path);
			var current_ns_path = path;
			
			if (ns != null) {
				var mngr = {
					/**
					
						codeproc: function(importer, sys, ownns) {}
							importer := function(namespacepath[, refname])
								The code can call the importer to import a namespace or an individual reference from a namespace
								namepspacepath {string} - the path to the namespace to import e.g. $.com.namespace1
								refname {string} - optional the name of a specific export from that namespace
								returns: if refname is not specified an object containing all the namespace exports
										 if refname is specified - returns a ref to the specific export (or null if not found)
							sys := function | namespaceexports
								a function() that sets the current namespace as system namespace is passed until it is called. After that
								the system namespace is passed (can be checked with typeof "funciton"|"object"
							ownns := object - contains all the system namespace exports.
					*/
					code: function(/*function(importer, sys, ownns)*/ proc) {
						if (ns == null) return null;
						if (ns.meta && ns.meta.sealed) return _err(null, "namespace is sealed");
						proc(importer, _sysns, ns.ns);
						return mngr;
					},
					/**
						arrimports - an array, that specifies all the imports, each has to have a corresponding argument in the codefileproc
									When working manually this requires careful matching of each entry
									Syntax:
									Each element of the arrimports is a string and can import a whole namespace or a number of specific
									references from one. So one element can create one or more imports (and will require one or more 
									correspoding arguments in the codefileproc import arguments).
					
					
						codefileproc: function(sys, ownns, imports ...) {}
							sys := function | namespaceexports
								a function() that sets the current namespace as system namespace is passed until it is called. After that
								the system namespace is passed (can be checked with typeof "funciton"|"object"
							ownns := object - contains all the system namespace exports.
							imports - all the imports generated from arrimports (see the syntax above)
					*/
					codefile: function(arrimports,proc) {
						if (ns == null) return null;
						if (ns.meta && ns.meta.sealed) return _err(null, "namespace is sealed");
						var imps = [];
						if (Array.isArray(arrimports) {
							for (var i = 0;i < arrimports.length; importSymbols(imps, arrimports[i], current_ns_path))
						}
						proc.apply(null,[_sysns, ns.ns].concat(imps));
						return mngr;
					},
					join: function(name) {
						return this.create(name, true);
					},
					create: function(name, join, access) {
						ns = createNamespace(ns, name, join, access);
						if (ns == null) return null;
						return mngr;
					},
					"public" : function(name) {
						return this.create(name, true, "public");
					},
					"protected" : function(name) {
						return this.create(name, true, "protected");
					},
					"private" : function(name) {
						return this.create(name, true, "private");
					},
					"import": function() {
						if (ns == null) return null;
						if (ns.meta.access != "public") return _err(null, "only public namespaces can be imported through this method");
						if (!ns.meta.sealed) return _err(null, "Non-sealed namespaces cannot be imported, because they are considered incomplete.");
						var result = {};
						for (var k in ns.ns) {
							result[k] = ns.ns[k];
						} // To prevent temperint without losing IE9 compatibility
						Object.seal(result); // To prevent user from delusions
						return result;
					},
					ref: function(sym) {
						if (ns == null) return null;
						if (!ns.meta.sealed) return _err(null, "Non-sealed namespaces cannot be imported, because they are considered incomplete.");
						if (ns.meta.access == "public") return ns.ns[sym];
						return _err(null, "only public namespaces can be imported through this method");
					},
					seal: function() {
						if (ns == null) return null;
						if (ns.meta && ns.meta.sealed) return _err(null, "namespace is already sealed");
						ns.meta.sealed = true;
						return mngr;
					},
					sealsystem: function() {
						_setsysns();
						return mngr;
					}
				};
				return mngr;
			}
		},
		lasterror: function() {
			return lastError;
		},
		version: function() {
			return [1,0,0];
		}
	};
	return nsmgr;
})(window);