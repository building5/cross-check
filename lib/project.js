const { spawn } = require('child_process');

const { log } = require('./log');

module.exports.Project = class {
  constructor({ url: projectURL, dir, name }) {
    this.url = projectURL;
    // paths are less restrictive than filesystems, so this should work
    this.dir = dir;
    this.name = name;
    this.results = [];
    this.log = log.child({ projectName: name });
    this.numTests = 0;
    this.numFailed = 0;
    this.numSkipped = 0;
    this.numErrored = 0;
  }

  // TODO: number of flags is ridiculous. should be a single enum.
  recordResults({ test, pass, skipped, error, text, message }) {
    this.numTests += 1;
    if (skipped) {
      this.numSkipped += 1;
    } else if (error) {
      this.numErrored += 1;
    } else if (!pass) {
      this.numFailed += 1;
    }
    this.results.push({ test, pass, skipped, error, text, message });
  }

  spawn(command, args, options) {
    this.log.trace({ command, args, options }, 'spawn');
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, Object.assign({}, options, { cwd: this.dir }));
      let stdout = '';
      let stderr = '';
      let combined = '';

      child.stdout.on('data', (data) => {
        stdout += data;
        combined += data;
      });
      child.stderr.on('data', (data) => {
        stderr += data;
        combined += data;
      });

      child.on('close', (code) => {
        if (stderr) {
          this.log.warn({ stderr }, 'Error output from command');
        }

        if (code !== 0) {
          const err = new Error('command failed');
          err.stdout = stdout;
          err.stderr = stderr;
          err.combined = combined;
          reject(err);
        }
        resolve({ stdout, stderr, combined });
      });
    });
  }
};
