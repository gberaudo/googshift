Example use:

node_modules/.bin/jscodeshift -t transforms/goog_provide_to_goog_module.js ~/dev/suisseapline/ui/suissealpine/static/js/  ~/dev/suisseapline/ui/suissealpine/static/modules/ --ignore-pattern goog --skip-requires goog,ol,ngeo
node_modules/.bin/jscodeshift -t transforms/goog_module_to_es6_module.js ~/dev/suisseapline/ui/suissealpine/static/js/  ~/dev/suisseapline/ui/suissealpine/static/modules/

