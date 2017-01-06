const assert = require('power-assert');
const nodeScanner = require('../../../lib/scanners/node');
const json = require('./ls.json');

describe('node scanner', () => {
  describe('maxDepth method', () => {
    it('should work', () => {
      assert.equal(nodeScanner.npmDepth(json), 7);
    });
  });
});
