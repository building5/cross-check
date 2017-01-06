const fs = require('fs-extra');
const program = require('commander');

const { log, setVerbosity } = require('../lib/log');
const { version } = require('../package.json');
const controller = require('../lib/controller');
const _ = require('lodash');

function increment(v, total) {
  return total + 1;
}

program
  .version(version)
  .usage('[options] <url...>')
  .option('--clean', 'Remove local cache of git clones')
  .option('--base-url [URL]', 'Base URL for simple org/repo names. [https://github.com/]')
  .option('--git-throttle [n]', 'Limit concurrent git synchronizations. [4]', parseInt)
  .option('--scan-throttle [n]', 'Limit concurrent git synchronizations. [4]', parseInt)
  .option('--scan-branch [name]', 'Local branch name for scanning [dependency-scanning]')
  .option('--output [file]', 'Name of file to write output to. Defaults to stdout.')
  .option('-v, --verbose', 'Increase verbosity', increment, 0)
  .parse(process.argv);

program.verbose = program.verbose || 0;
setVerbosity(program.verbose);

let output = process.stdout;
if (program.output) {
  output = fs.createWriteStream(program.output);
}

if (program.clean) {
  controller.clean();
} else {
  if (_.isEmpty(program.args)) {
    program.outputHelp();
    process.exit(1);
  }

  controller.scan({
    baseURL: program.baseUrl,
    repos: program.args,
    scanBranch: program.scanBranch || 'project-scanning',
    throttles: {
      git: program.gitThrottle || 4,
      scan: program.scanThrottle || 4,
    },
    output,
  }).catch((err) => {
    log.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
}
