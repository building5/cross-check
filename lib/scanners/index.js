const dockerScanner = require('./docker');
const nodeScanner = require('./node');

module.exports.scan = project =>
  Promise.all([
    nodeScanner.scan(project),
    dockerScanner.scan(project),
  ]).then(([node, docker]) => ({ node, docker }));
