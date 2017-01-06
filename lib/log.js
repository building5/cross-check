const bformat = require('bunyan-format');
const bunyan = require('bunyan');

const { name } = require('../package.json');

const stream = bformat({ outputMode: 'short' }, process.stderr);

const log = module.exports.log = bunyan.createLogger({
  name,
  stream,
  level: bunyan.WARN,
  serializers: bunyan.stdSerializers,
});

module.exports.setVerbosity = (verbosity) => {
  let level;

  switch (verbosity) {
    case 0:
      level = bunyan.WARN;
      break;
    case 1:
      level = bunyan.INFO;
      break;
    case 2:
      level = bunyan.DEBUG;
      break;
    default:
      level = bunyan.TRACE;
      break;
  }

  log.level(level);
};
