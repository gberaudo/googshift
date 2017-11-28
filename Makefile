check: lint tests


tests:
	node_modules/.bin/jscodeshift -t transforms/goog_provide_to_goog_module.js tests/goog_provide_to_goog_module.input.js


lint:
	node_modules/.bin/eslint transforms tests
