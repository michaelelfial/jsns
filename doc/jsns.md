# Javascript namespaces (JSNS)

## jsns syntax

The JSNS is typically accessible through the global variable `jsns`, with the following methods available on it:

```Javascript
    jsns.namespace(ns_path) // ns_manager | undefined
    jsns.lasterror() // string | null
```

### **jsns.namespace(ns_path)**

> `ns_path` - string|array[string], the path of the namespace to open. Examples are: "$.com.myname.namespace1", 

```Javascript
    var ns = jsns.namespace("$.com.myname.namespace1");
    var ns = jsns.namespace(["$","com","myname","namespace1"]);
```
> `returns:` ns_manager for the namespace or undefined if the namespace specified is not found or if the path syntax is incorrect - jsns.lasterror() will return error string with details.

### **jsns.lasterror()**

> `returns:` string with the last error description or null if there was no error or if the error description is not set.

### **jsns.version()**

> `returns:` an array with 3 numbers - the major version, minor version and build number. JSNS follows the general rules of the semantic versioning, the returned array makes it easier to detect the version programmatically. If you want to get the version in the usual textual form use jsns.version().join(".");

### Dealing with errors

JSNS provides a lasterror() method, but it should not be used as an error indicator, the method just returns the last error description, if available. Errors must be detected by inspecting the return value of the methods (as specified for each of them).

## ns_manager

Most of the interaction with JSNS is done through the ns_manager objects. These are created when a namespace is opened (_for example with jsns.namespace()_). The main purpose of the ns_manager is to provide means to create new workspaces, but it can also be used to import/reference existing namespace (other more convenient means exist - see ns_manager.code and ns_manager.codefile).

**Members:**

### ns_manager.code(codeproc)

Adds code to the namespace opened with this ns_manager instance. Usually called immediately after creation of a new namespace to fill it with code.

> `codeproc(importer, sysns, thisns)` - the function in which the code is defined. _Cannot be an arrow function!_
>> `importer(nspath[, refname])` - a function the code in the codeproc can call in order to receive a reference to another namespace or a single exported symbol from it.
>>> `nspath` - string, the path to the namespace to import, e.g. `importer("$.com.myname.namespace2")`.
>>> `refname` - optional, string - the name of a specific export of the namespace specified with `nspath`
>>> returns: If `refname` is not specified an object containing all the namespace exports. If `refname` is specified - returns a reference to the specific export. If the namespace or the specified `refname` is not found null (namespace) or undefined (refname) is returned. Prefer checking the result with `result != null` which will be true in both cases (null and undefined are == null).

> `sysns` - A reference to the system namespace if one exists or a function without arguments that if called will set the current namespace as system. To check what you have check for `typeof sysns == "object"` (for existing system namespace) or `typeof sysns == "function"` (for non-existing system namespace).

> `thisns` - the current namespace. This will be an object containing the exports of the current namespace so far. To export something it has to be assigned to a property of `thisns` object. A namespace can be filled with multiple calls to ns_manager.code/ns_manager.codefile and in this case the currently added code will be also able to access the exports of the previously added script code pieces through this object.

Example:

```Javascript

    jsns.namespace("$.com.myname")
        .public("newnamespace")
        .code(function(_import, sys, _export) {
            var format = _import("$.com.myname.formatters", "whateverformatter");
            _export.myfunc = function(x) {
                return "Hello " + format(x);
            }
        });

```

The example creates a new public namespace named `newnamespace` and exports into it a function as `myfunc`. It also uses a `whateverformatter` imported from another namespace under the local name of `format`. 

### ns_manager.codefile(imports, cfproc)

The `codefile` provides another way to add code to a namespace. It is similar to define in AMD implementations in the way it is passing imports, but the details are different. The name of the method hints at the intention of the method - to be used through a preprocessor that wraps a file into a `codefile` call with generated arguments. As it can be noticed below, manual usage of this method may be a bit difficult, because it needs matching `imports` with corresponding arguments of the `cfproc`.

> `imports` - an array of import specifications. Each element can specify a namespace to import as a whole or one or more exports from a specific namespace. The syntax of each entry in the array is `namespace_path[:exp1[,exp2[,exp3 ....]]]` where exp1, exp2 ... are names of exported symbols from the namespace defined by the `namespace_path`. Each entry specifies:

> **one import** if it contains only a namespace_path and no export names. The corresponding argument (see below) will be an object containing all the namespace's exports.
> **multiple imports** if it contains one or more export symbol names after the ":". The number of imports will be the same as the number of specified symbols (exp1, exp2, exp3 ... in the above example). The corresponding number of arguments (see below) will be the same .

> `cfproc( sysns, thisns[, imp1, imp2, ... ])` - a function that defines the code to include in the namespace. Its first two arguments are the same as `sysns` and `thisns` of the `ns_manager.code()` [described above](#ns_managercodecodeproc). All the following arguments (imp1, imp2 ... etc) contain one of the imports specified in the `imports` array. This is best illustrated with an example (all the namespaces are imaginary - concocted just for the example):

```Javascript
jsns.namespace("$.com.myname")
    .public("newnamespace")
    .codefile(["$.com.myname.utils",
               "$.com.myname.formatters:dateFormatter,numberFormatter",
               "$.com.myname.moreclasses:XClass,YClass"],
    function(sys, _export, utils, dateFormatter, numberFmt, XClass,YClass){
        var x = new XClass();
        var y = new YClass();
        console.log("date:" + dateFormatter(Date.now()));
        console.log("num:" + numberFmt(1234567));
        _exports.someFunc = function() { /* some code */ }
    });
```

As the example shows all the arguments of the `cfproc` starting with `util` are arguments that correspond to imports specified in the `imports` array. In the example it specifies five imports in total: a namespace `utils`, two formatter functions from another namespace and two class definitions from yet another. The names of the arguments are arbitrary and usually they follow the names of the imports, but this is just convenient for the programmer - they can be named anyway one whishes as the `numberFormatter` in the example shows.

Obviously using `ns_manager.codefile` **manually** with too many imports will complicate the matching of the imports with the corresponding arguments and one will likely prefer using `ns_manager.code` in such a case. The method is mainly provided to aid the creation of preprocessing tools and utilities that take code written in more convenient form or even another language and convert it to JSNS compatible form. While using ns_manager.code is also an option in this case, it will require more code (e.g. each import may be imported by separate calls to the importer and assigned to a separate local variable - compare this to just list of arguments and compact import specifications). Another reason for existence of this method is also the resemblance to the well-known AMD define implementations.

**Namespace creation methods**

All namespace creation methods can be called only on a ns_manager obtained from an existing namespace which is not yet `sealed` (see more about namespace sealing below). _In version 1.0.0 there is no option to create sub-namespaces in sealed ones, but this may change in further versions, check if this documentation matches the version you are using_. The access level of the namespace does not matter - i.e. sub-namespaces can be created even in private ones, because the access level controls only how a namespace can be imported.

Another important thing about creating namespaces is the option to join existing ones. All the methods assume this option or at least (ns_manager.create) allow you to specify it as a boolean parameter. What it means that is that when you have this option and try to create an existing namespace, the operation will succeed if it is not sealed and have the same access level, of course.