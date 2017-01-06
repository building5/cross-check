const _ = require('lodash');
const nspPackage = require('nsp/package.json');
const path = require('path');
const fs = require('fs-extra');

const exists = require('../exists');
const toPromise = require('../toPromise');

/** Path to the NPM executable */
const npm = require.resolve('npm/bin/npm-cli');

/** Path to the NSP executable */
const nsp = require.resolve(`nsp/${_.get(nspPackage, 'bin.nsp')}`);

function npmSynchronize(project) {
  project.log.info('npm synchronize');
  return exists(path.join(project.dir, 'npm-shrinkwrap.json'))
    .then((hasShrinkwrap) => {
      if (hasShrinkwrap) {
        project.log.debug('npm prune');
        // Shrinkwrap does not include dev dependencies; prune them
        // along with any other extraneous dependencies.
        return project.spawn(npm, ['prune', '--production']);
      }

      // Without a shrinkwrap, npm install just gets whatever version is
      // available today, but will leave matching versions if they exist.
      // Only way to get what would currently get installed is to do a
      // clean npm install.
      project.log.debug('rm -rf node_modules');
      return toPromise(cb =>
        fs.emptyDir(path.join(project.dir, 'node_modules'), cb));
    })
    .then(() => {
      project.log.debug('npm install');
      return project.spawn(npm, ['install']);
    })
    .catch((err) => {
      project.log.error({ err, output: err.combined }, 'npm install/update failed');
      throw err;
    });
}

function npmDepth(ls) {
  if (_.isEmpty(ls.dependencies)) {
    return 0;
  }
  return _(ls.dependencies).map(npmDepth).max() + 1;
}

module.exports.npmDepth = npmDepth;

function recordNpmDepth(project) {
  // Some npm commands require --depth to act recursively, but don't handle
  // cyclic dependencies very well. Unfortunately, cyclic deps are a reality.
  //
  // Dig through npm ls to see how deep our dependency tree is, so we don't
  // trip over this npm bug
  // See https://github.com/npm/npm/issues/15393
  project.spawn(npm, ['ls', '--json'])
    .then((lsData) => {
      // eslint may not like it, but I know what I'm doing.
      project.npmDepth =  // eslint-disable-line no-param-reassign
        npmDepth(JSON.parse(lsData.stdout));
    });
}

function checkOutdated(project) {
  project.log.info('npm outdated');

  return project.spawn(npm, ['outdated', '--json', '--depth', '0'])
    .then((data) => {
      // npm outdated gives an empty response if there are no findings.
      // pretend it's an empty object, for consistency
      const npmOutdatedResults = JSON.parse(data.stdout || '{}');
      project.log.debug({ npmOutdatedResults, depth: 0 }, 'npm outdated results');
      // for immediate dependencies, we want the latest
      _(npmOutdatedResults)
        .pickBy(d => d.wanted !== 'git')
        .pickBy(d => d.current !== d.latest)
        .forEach((info, outdated) => {
          const save = info.type === 'devDependencies' ? '--save-dev' : '--save';
          project.recordResults({
            test: `dependency ${outdated} is outdated`,
            message: `(${info.current} < ${info.latest}). Run npm install ${save} ${outdated}@latest`,
            pass: false,
            text: info,
          });
        });
    })
    .then(() =>
      project.spawn(npm, ['outdated', '--json', '--depth', project.depth]))
    .then((outdatedData) => {
      const npmOutdatedResults = JSON.parse(outdatedData.stdout || '{}');
      project.log.info({ npmOutdatedResults, depth: project.depth }, 'npm outdated results');
      // for transitive deps, we want the 'wanted' version
      // since we synchronized our dependencies, this should only happen
      // when shrinkwrap pins a transitive dep
      _(npmOutdatedResults)
        .pickBy(d => d.wanted !== 'git')
        .pickBy(d => d.current !== d.wanted)
        .forEach((info, outdated) => {
          project.recordResults({
            test: `shrinkwrap dependency ${outdated} is outdated`,
            message: `(${info.current} < ${info.wanted}). Run npm update --depth ${project.npmDepth}`,
            pass: false,
            text: info,
          });
        });
    })
    .catch((err) => {
      project.log.error({ err, output: err.combined }, 'npm outdated failed');
      throw err;
    });
}

function checkNodeSecurity(project) {
  project.log.info({ nsp }, 'nsp check');
  return project.spawn(nsp, ['check', '--output', 'json', '--warn-only'])
    .then((data) => {
      const nspResults = JSON.parse(data.stdout);
      project.log.info({ nspResults }, 'nsp check results');
      if (!_.isEmpty(nspResults)) {
        project.recordResults({
          test: `nsp check: ${nspResults.length} vulnerabilites found`,
          message: 'run nsp check and update/remove dependencies',
          pass: false,
          text: nspResults,
        });
      } else {
        project.recordResults({
          test: 'nsp check',
          pass: true,
          text: nspResults,
        });
      }
    })
    .catch((err) => {
      project.log.error({ err, output: err.combined }, 'nsp failed');
      throw err;
    });
}

module.exports.scan = (project) => {
  const packageDotJSONPath = path.join(project.dir, 'package.json');
  return exists(packageDotJSONPath)
    .then((hasPackageDotJSON) => {
      if (!hasPackageDotJSON) {
        return null;
      }
      project.log.debug('Scanning for Node.js');
      return npmSynchronize(project)
        .then(() => recordNpmDepth(project))
        .then(() =>
          Promise.all([
            checkOutdated(project),
            checkNodeSecurity(project),
          ]));
    });
};
