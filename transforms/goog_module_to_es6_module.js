const {
  getAssignmentExpressionStatement, getGoogExpressionStatement, getGoog2ExpressionStatement,
  getGoogVariableDeclaration, symbolToRelativePath} = require('./util');
const util = require('./util');


module.exports = (info, api, options) => {
  const j = api.jscodeshift;
  const root = j(info.source);

  // parse source-roots option
  const sourceRoots = new Map();
  if (options['source-roots']) {
    for (const path of options['source-roots'].split(',')) {
      const split = path.split('/');
      const key = split.pop();
      sourceRoots.set(key, split);
    }
  }

  // store any initial comments
  const {comments} = root.find(j.Program).get('body', 0).node;

  let currentModuleSymbol;
  let addModule = false;

  // Remove goog.module.declareLegacyNamespace
  root.find(j.ExpressionStatement, getGoog2ExpressionStatement('module', 'declareLegacyNamespace'))
    .forEach(path => {
      path.replace();
    });

  // Remove goog.module('module.symbol') and get the module symbol
  root.find(j.ExpressionStatement, getGoogExpressionStatement('module'))
    .forEach(path => {
      if (currentModuleSymbol) {
        throw new Error('Already existing goog.module found in this file', currentModuleSymbol);
      }
      currentModuleSymbol = path.value.expression.arguments[0].value;
      path.replace();

      addModule = true;
      if (comments) {
        for (const comment of comments) {
          if (comment.value.indexOf('@module') >= 0) {
            addModule = false;
            const module = comment.value.match(/@module (.*)/g);
            if (module != currentModuleSymbol) {
              throw new Error('The @module does not have the right value');
            }
          }
        }
      }
    });

  // Append  "export default exports;" to the body
  const noExport = !currentModuleSymbol;
  if (noExport) {
    if (options['missing-module-mapping']) {
      for (const path of options['missing-module-mapping'].split(',')) {
        if (info.path.startsWith(path)) {
          currentModuleSymbol = info.path.replace(path, path.split('/').pop()).replace(/\./g, '_').replace(/\//g, '.').replace(/_js$/, '');
          break;
        }
      }
    }
  }
  if (!currentModuleSymbol) {
    currentModuleSymbol = info.path.replace(/\./g, '_').replace(/\//g, '.').replace(/_js$/, '');
  }

  // Transform "const xx = goog.require('X.Y.Z');" into a relative path like "import xx from '../Y/Z';"
  root.find(j.VariableDeclarator, getGoogVariableDeclaration('require')).forEach(path => {
    const name = path.value.id.name;
    const symbol = path.value.init.arguments[0].value;
    if (!name) {
      throw new Error('Could not transform symbol ' + symbol + '; note that destructuring is not supported');
    }

    const importStatement = j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier(name))],
      j.literal(symbolToRelativePath(currentModuleSymbol, symbol, sourceRoots, options['absolute-module']))
    );
    path.parent.replace(importStatement);
  });

  if (!noExport) {
    let foundExportsAssignment = false;
    root.find(j.ExpressionStatement, getAssignmentExpressionStatement('exports')).forEach(path => {
      if (foundExportsAssignment) {
        throw new Error('Already existing exports assignment in this file');
      }
      foundExportsAssignment = true;
      const right = path.value.expression.right;
      const assignment = j.variableDeclaration('const', [
        j.variableDeclarator(
          j.identifier('exports'),
          right
        )
      ]);
      assignment.comments = path.value.comments;
      path.replace(assignment);
    });

    if (!foundExportsAssignment) {
      // Case of a namespace
      const declaration = j.variableDeclaration('let', [
        j.variableDeclarator(
          j.identifier('exports'),
          j.objectExpression([])
        )]);

      root.find(j.Program).get('body').unshift(declaration);
    }
    root.find(j.Program).get('body').push('\nexport default exports;\n');
  }

  // replace any initial comments
  root.get().node.comments = comments;

  // add @module annotation
  if (addModule) {
    util.prependModuleAnnotation(j, root, currentModuleSymbol);
  }

  return root.toSource({quote: 'single'});
};
