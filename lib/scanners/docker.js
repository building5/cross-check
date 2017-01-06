const path = require('path');

const exists = require('../exists');

module.exports.scan = (project) => {
  const Dockerfile = path.join(project.dir, 'Dockerfile');
  return exists(Dockerfile)
    .then((hasDockerfile) => {
      if (!hasDockerfile) {
        return null;
      }
      project.log.debug('Scanning for Docker');
      // TODO: add some tests
      return [];
    });
};
