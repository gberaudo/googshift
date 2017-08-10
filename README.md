# Description

This repository contains jscodeshift scripts to convert a code based on the
Google Closure Compiler goog.require and goog.provide / goog.module to ES6
modules.

# Example use

- Convert from goog.provide to goog.module:

```bash
node_modules/.bin/jscodeshift -t transforms/goog_provide_to_goog_module.js ~/dev/suisseapline/ui/suissealpine/static/js/  ~/dev/suisseapline/ui/suissealpine/static/modules/ --ignore-pattern goog --skip-requires goog,ol,ngeo
```

- Convert from goog.module to ES6 module:

```bash
node_modules/.bin/jscodeshift -t transforms/goog_module_to_es6_module.js ~/dev/suisseapline/ui/suissealpine/static/js/  ~/dev/suisseapline/ui/suissealpine/static/modules/
```

# Publishing

- Increment package.json version
- Create a git tag and push it to the repository
- Publish the npm package with `npm publish`
