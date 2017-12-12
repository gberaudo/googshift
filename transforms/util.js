module.exports.getAssignmentExpressionStatement = function(identifier) {
  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'AssignmentExpression',
      left: {
        type: 'Identifier',
        name: identifier
      }
    }
  };
};


module.exports.getGoogExpressionStatement = function(identifier) {
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
};


module.exports.getGoog2ExpressionStatement = function(identifier1, identifier2) {
  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: {
          type: 'MemberExpression',
          object: {
            type: 'Identifier',
            name: 'goog'
          },
          property: {
            type: 'Identifier',
            name: identifier1
          }
        },
        property: {
          type: 'Identifier',
          name: identifier2
        }
      }
    }
  };
};  


module.exports.getGoogVariableDeclaration = function(identifier) {
  return {
    init: {
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
};


module.exports.getImportDeclaration = function(value) {
  return {
    type: 'ImportDeclaration',
    source: {
      type: 'StringLiteral',
      value
    }
  };
};


module.exports.rename = function(name) {
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
};


module.exports.getMemberExpression = function(name) {
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
};


module.exports.stringify = function(object) {
  return JSON.stringify(object, null, '\t');
};


function findDivergingPart(path1, path2) {
  const split1 = path1.split('/');
  const split2 = path2.split('/');
  const maxSearch = Math.min(split1.length, split2.length);
  for (let i = 0; i < maxSearch; ++i) {
    if (split1[i] !== split2[i]) {
      return {
        extract1: split1.slice(i, split1.length),
        extract2: split2.slice(i, split2.length),
      };
    }
  }
  throw new Error(`Can not found diverging parts in ${path1} and ${path2}`);
}

module.exports.symbolToRelativePath = function (moduleName, name, sourceRoots) {
  let moduleParts = moduleName.split('.');
  let parts = name.split('.');
  let commonDepth = 1;

  if (moduleParts[0] !== parts[0]) {
    if (!sourceRoots || !sourceRoots.has(parts[0])) {
      return parts.join('/');
    }

    if (!sourceRoots.has(moduleParts[0])) {
      throw new Error(`Source roots lack the module name ${moduleName}`);
    }
    const extracts = findDivergingPart(moduleParts[0], parts[0]);
    extracts.extract1.pop();
    extracts.extract2.pop();
    moduleParts = [...extracts.extract1, ...moduleParts];
    parts = [...extracts.extract2, ...parts];
    commonDepth = 0;
  }

  const moduleLength = moduleParts.length;
  while (commonDepth < moduleLength - 2) {
    if (moduleParts[commonDepth] === parts[commonDepth]) {
      ++commonDepth;
    } else {
      break;
    }
  }

  const back = new Array(moduleLength - commonDepth).join('../') || './';
  let relative = back + parts.slice(commonDepth).join('/');
  if (relative.endsWith('/')) {
    relative += 'index';
  }
  return relative + '.js';
};


/**
 * Transforms a relative path to a symbol.
 * Example:
 * ('app/strings/violin.js', './cello.js') => 'app.strings.cello'
 * @param referencePath
 * @param relativePath
 * @return {string} symbol
 */
module.exports.relativePathToSymbol = function (referencePath, relativePath) {
  const referenceParts = referencePath.split('/');
  referenceParts.pop(); // pop the filename
  const relativeParts = relativePath.split('/');

  while (relativeParts.length > 0) {
    const part = relativeParts[0];
    if (part === '..') {
      referenceParts.pop();
    } else if (part !== '.') {
      return [...referenceParts, ...relativeParts].join('.');
    }
    relativeParts.shift();
  }
};


module.exports.createGoogRequireAssignment = function(j, identifier, symbol) {
  const expression = j.callExpression(
    j.identifier('goog.require'),
    [j.literal(symbol)]);

  return j.variableDeclaration('const', [
    j.variableDeclarator(
      j.identifier(identifier),
      expression
    )
  ]);
};

module.exports.prependModuleAnnotation = function(j, root, name) {
  const comment = j.commentBlock(`*\n * @module ${name}\n`);
  const node = root.get().node;
  if (!node.comments) {
    node.comments = [comment];
  } else {
    node.comments.unshift(comment);
  }
};
