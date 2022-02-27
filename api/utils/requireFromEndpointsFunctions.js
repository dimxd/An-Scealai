// Require a file relative to 'api/endpoints_functions'
const forwardException = require('./forwardException');
module.exports = (str) => {
  return forwardException(
    require.main.require('./endpoints_functions' + str)
  );
}

// e.g.
// const root_require = require('../utils/rootRequire');
// root_require('/story/create');
