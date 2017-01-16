function getGoogExpressionStatement(identifier) {
  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: {
          type: 'Identifier',
          name: 'goog'
        },
        property: {
          type: 'Identifier',
          name: identifier
        }
      }
    }
  };
}

function rename(name) {
  const parts = name.split('.');
  if (parts.length === 1) {
    return name + 'Base'; // avoid conflicts with global window[name]
  }
  return parts.map((part, index) => {
    if (index === 0) {
      return part;
    } else {
      return part[0].toUpperCase() + part.substring(1, part.length);
    }
  }).join('');
}


function getMemberExpression(name) {
  function memberExpression(parts) {
    const dotIndex = parts.lastIndexOf('.');
    if (dotIndex > 0) {
      return {
        type: 'MemberExpression',
        object: memberExpression(parts.slice(0, dotIndex)),
        property: {
          type: 'Identifier',
          name: parts.slice(dotIndex + 1)
        }
      };
    } else {
      return {
        type: 'Identifier',
        name: parts
      };
    }
  }
  return memberExpression(name);
}


function stringify(object) {
  return JSON.stringify(object, null, '\t');
};


export default (info, api, options) => {
  const j = api.jscodeshift;
  const root = j(info.source);

  const noRewriteRequires = options['skip-requires'] || [];
  const declareLegacy = typeof options.legacy !== undefined ? options.legacy : false;

  const replacements = {};

  let provideCount = 0;

  // Replace goog.provide() with goog,module() and declare legacy namespace
  root.find(j.ExpressionStatement, getGoogExpressionStatement('provide'))
    .forEach(path => {
      if (provideCount++ !== 0) {
        throw new Error('Only one provide allowed');
      }
      replacements[path.node.expression.arguments[0].value] = 'exports';
      path.node.expression.callee.property.name = 'module';
      if (declareLegacy) {
        path.insertAfter(j.expressionStatement(j.callExpression(j.identifier('goog.module.declareLegacyNamespace'), [])));
      }
    });


  // Transform goog.require() into variable declarations
  root.find(j.ExpressionStatement, getGoogExpressionStatement('require'))
    .forEach(path => {
      const name = path.value.expression.arguments[0].value;
      noRewriteRequires.some(prefix => name.indexOf(prefix) === 0)
      if (noRewriteRequires.some(prefix => name.indexOf(prefix) === 0)) {
        return;
      }
      const alias = rename(name);
      replacements[name] = alias;
      const assignment = j.variableDeclaration("const", [
        j.variableDeclarator(
          j.identifier(alias),
          path.node.expression
        )
        ]);
      path.replace(assignment);
    });

  // Replace all uses of required or provided names with renamed identifiers
  Object.keys(replacements).sort().reverse().forEach(name => {
    if (name.indexOf('.') > 0) {
      root.find(j.MemberExpression, getMemberExpression(name))
        .replaceWith(j.identifier(replacements[name]));
    } else {
      root.find(j.Identifier, {name: name})
        .replaceWith(j.identifier(replacements[name]));
    }
  });

  return root.toSource();
};
