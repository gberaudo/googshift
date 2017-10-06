const glob = require('glob');
const fs = require('fs');
const path = require('path');
const process = require('process');

const newPwd = process.argv[2];
const pattern = process.argv[3];
const direction = process.argv[4];

process.chdir(newPwd);

// From https://github.com/dzinxed/googclass-to-es6class/blob/640344e3c76da3c12ef6d7fe0115c47c501a1fa1/lib/plugin_runner.js
const CAST_PREFIX = 'GOOGCLASS_TO_ES6CLASS_CLOSURE_TYPE_CAST';

// Searches for: /** @type...*/
const COMMENT_RE = '\\/\\*\\*\\s*@type([^*]|\\*[^/])+\\*\\/';

/**
 * Babel strips (unnecessary in their opinion) parentheses from Closure
 * type cast expressions. We must escape them to avoid stripping.
 */
function escapeClosureTypeCasts(src) {
  // Find phrases like: /** @type {x} */ (foo)
  const castRe = new RegExp(`(${COMMENT_RE}\\s*)\\(`, 'g');
  return src.replace(castRe, CAST_PREFIX + '($1');
}

/**
 * Restore Closure type casts escaped by escapeClosureTypeCasts.
 */
function restoreClosureTypeCasts(src) {
  // Find all the escaped type casts.
  const castRe = new RegExp(`${CAST_PREFIX}\\((\\s*)(${COMMENT_RE})`, 'g');
  return src.replace(castRe, '$2$1(');
}


function escapeFiles(files) {
  let count = 0;
  files.forEach(function(filename) {
    const contents = fs.readFileSync(filename, 'utf-8');
    const escaped = escapeClosureTypeCasts(contents);
    if (contents !== escaped) {
      ++count;
      fs.writeFileSync(filename, escaped, 'utf-8');
    }
  });
  process.stdout.write(`Escaped ${count} files.\n`)
}


function restoreFiles(files) {
  let count = 0;
  files.forEach(function(filename) {
    const contents = fs.readFileSync(filename, 'utf-8');
    const restored = restoreClosureTypeCasts(contents);
    if (contents !== restored) {
      ++count;
      fs.writeFileSync(filename, restored, 'utf-8');
    }
  });
  process.stdout.write(`Restored ${count} files.\n`)
}


glob(pattern, {matchBase:true}, function(err, files) {
  if (!err) {
    process.stdout.write(`Checking ${files.length} files...\n`);
    if (direction === 'escape') {
      escapeFiles(files);
    } else if (direction === 'restore') {
      restoreFiles(files);
    } else {
      process.stderr.write('missing direction');
      process.exit(1);
    }
  } else {
    process.stderr.write(err.message);
    process.exit(1);
  }
});
