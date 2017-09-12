const util = require('./util');

module.exports = (info, api, options) => {
  const j = api.jscodeshift;
  const root = j(info.source);

  // Add declareLegacy
  const declareLegacy = j.expressionStatement(j.callExpression(j.identifier('goog.module.declareLegacyNamespace'), []));
  root.find(j.Program).get('body').unshift(declareLegacy);

  // Prepend goog.module
  const moduleSymbol = j.identifier(info.path.split('/').join('.'));
  const declareModule = j.expressionStatement(j.callExpression(j.identifier('goog.module'), [moduleSymbol]));
  root.find(j.Program).get('body').unshift(declareModule);

  // Rewrite import declarations to goog.require
  root.find(j.ImportDeclaration).forEach(path => {
    const specifier = path.node.specifiers[0].local.name;
    const value = path.node.source.value;
    const symbol = util.relativePathToSymbol(info.path, value);
    const assignRequire = util.createGoogRequireAssignment(j, specifier, symbol);
    path.replace(assignRequire);
  });

  // Remove default export
  root.find(j.ExportDefaultDeclaration).forEach(path => {
    path.replace();
  });

  return root.toSource({quote: 'single'});
};
