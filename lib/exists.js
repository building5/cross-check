const fs = require('fs-extra');

module.exports = p =>
  new Promise((resolve) => {
    fs.stat(p, (err) => {
      resolve(!err);
    });
  });
