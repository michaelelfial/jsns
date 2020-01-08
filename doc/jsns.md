# Javascript namespaces (JSNS)

Maintains a tree of Javacript code closures/"modules" in memory structured as a namespaces tree. The namespaces can be accessed by namespace name, extended (until sealed), namespaces can be added to expand the namespace tree and so on.

In contrast to the traditional Javascript module implementations/simulations this is a similar isolation technique, but based NOT on script's source location. Instead JSNS puts every namespace (while technically incorrect you can call it for the purpose of this explanation a "module") in an addressable tree in the memory at runtime. The namespace "modules" can be then accessed at any time by their namespace address.

The main purpose of JSNS is to provide manageable in-memory structure for organizing the scripts (in browser page, node program etc.) separated and fully independent of their origin/source location. This is a very simple approach which has its positive sides that remained almost entirely overlooked as the effort for simulating and later implementing Javascript modules got under way in the 2005-2020 period. The emphasis on source location based imports and especially the ahead of time resolution of such imports gradually made most Javascript developers to accept it as "the only way" totally ignoring all other alternatives. The namespace approach has certain resemblance with the way assemblies/packages build the code base in C# and Java. JSNS does not do much more than provide a very simple method to organize loaded Javascript code in somewhat similar manner inside the memory of the running host (page, application etc.), which in turn makes possible to think in more C# or Java inspired manner about it.

The consequences of usage of JSNS or another similar technique makes it possible to exploit the capabilities of Javascript to implement inheritance-like and other OOP techniques in a way that also resembles better the corresponding/similar techniques in languages like C# and Java. Decoupling the loading from the in-memory organization actually makes things simpler - only the in-memory registration matters when you need access to some code, it can be loaded into memory in a number of different ways, but only its final registration has to be known.

Downsides: As mentioned above the main developments around Javascript have been driven by the idea that became Javascript modules in Javascript 6 and later. All of the most popular techniques simulated similar behavior before that happened and the overwhelming majority of existing tools are also built to follow the Javascript modules specifications or concept at least. This makes adaptation of existing tools for usage with JSNS (or any similar creation) more difficult and usually requires from developers who want to do that to go deeper and rewrite the surface level of such tools (e.g. how they resolve imports for instance). The tooling is not subject of this document, this note is here just to warn Javascript developers that JSNS is one of the many attempts to look at Javascript usage in a little different way from the mainstream, which means they have to pay special attention to the tooling and not expect the mainstream toolsets to "just work" for JSNS.

## jsns syntax

The JSNS is typically accessible through the global variable `jsns`, with the following methods available on it:

```Javascript
    jsns.namespace(ns_path) // ns_manager | undefined
    jsns.lasterror() // string | null
    jsns.version() // array
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

### ns_manager.create(name, join, access)

Creates a new namespace inside the one for which `ns_manager` has been obtained.

Example:

```Javascript

var ns = jsns.namespace("$.com.myname").create("newnamespace", true, "public");
// ns is a ns_manager for the newnamespace and can be used to add code for instance
ns.code(function(_import, sys, _export) {
    // Some code
});
```

> `name` - string, the name of the new namespace to create under the current. This name cannot contain dots, namespaces can be created only as immediate children. If one needs to create deeper namespace (e.g. "$.com.myname.ns1.ns2.ns3" where ns1, ns2 and ns3 do not exist initially), the namespaces in path must be created one by one. This is necessary, because JSNS cannot assume/guess what access level they must have.

> `join` - optional boolean parameter which if passed and `true` will instruct the method to join the existing namespace if the namespace specified by the `name` argument already exists and is not sealed and with the same access level the access argument specifies (see the details about the next argument).

> `access` - optional, string. Can have one of the following values: `"public"`, `"protected"`, `"private"`. If omitted the behavior of the method will be like this:
if the namespace does not exist and it is created (not joined) it will be created as `public`, if the namesapce exists and `join` is true, it will be just joined and its access level will not be changed. Obviously omitting this argument is in most cases undesirable, but sometimes it is exactly what is needed, when some code has to be added to an existing namespace without even needing to know the namespace's access restrictions.

This is the main method for namespace creation, having all the possible arguments that define the possible behavior variations. For better readability there are a few other method, most calling `create` internally that reflect what a programmer would want in certain situations and it is recommended to prefer them instead of the `create` method.

### ns_manager.join(name)

Joins an existing namespace. Returns ns_manager for the joined namespace or null if the namespace cannot be joined or does not exist.

> `name` - string, the name of the namespace to join.

Example: 

```Javascript
// Somewhere:
jsns.namespace("$").public("com").public("myname").public("mynamespace");
// Later:
var ns = jsns.namespace("$.com.myname").join("mynamespace");
// mynamespace already exists under $.com.myname at this point. Assuming it was not sealed we can join it and add code into it or/and seal it.
```

### ns_manager.public(name)

Creates a new namespace with public access or joins it if it already exists and also has public access. If the namespace exists, but has different access level, the method will fail and return `null`.

> `name` - string, the name of the namespace to create/join.

### ns_manager.protected(name)

Like public above, but creates/joins a namespace with `"protected"` access level

### ns_manager.private(name)

Like public above, but creates/joins a namespace with `"private"` access level

### ns_manager.import()

Imports the namespace represented by the ns_manager instance. The import method creates and object filled with all the exports of the namespace and returns it. The namespace has to be public. Other access levels are not supported by this method, because it can be called from anywhere, which makes it impossible to corelate that namespace to a calling namespace and correctly decide if a protected namespace is requested correctly. The import method can be invoked by any code, even global Javascript code that does not reside in any namespace.

```Javascript
var ns = jsns.namespace("$.com.myname.somenamespace").import();
```

In the example above the code can be anywhere and after that point through the ns variable any export from somenamespace can be invoked. E.g. if there is an export my func ns.myfunc() can be called.

### ns_manager.ref(exportname)

Similarly to import method this one enables to get hold on a single 