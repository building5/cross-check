const appdirs = require('appdirs');
const createThrottle = require('async-throttle');
const fs = require('fs-extra');
const path = require('path');
const url = require('url');
const _ = require('lodash');

const { log } = require('./log');
const { scan } = require('./scanners');
const { synchronize } = require('./git');
const { Project } = require('./project');
const { name } = require('../package.json');
const { report } = require('./reporters/xunit');

const workdir = appdirs.userCacheDir(name);

function repoToURL(baseURL, repo) {
  if (repo.includes(':')) {
    return repo;
  }
  return `${url.resolve(baseURL, repo)}.git`;
}

function urlToPath(projectURL) {
  const parsed = url.parse(projectURL);
  const segments = [
    workdir,
    parsed.hostname,
  ].concat(parsed.pathname.split('/').filter(_.negate(_.isEmpty)));
  return path.join(...segments);
}

module.exports.scan = ({ baseURL, repos, throttles, scanBranch, output }) => {
  /** Ensure we don't overburden the git server */
  const gitThrottle = createThrottle(throttles.git);
  const scanThrottle = createThrottle(throttles.scan);

  const repoURLs = repos.map(r => repoToURL(baseURL, r));

  const projects = repoURLs.map(projectURL => new Project({
    url: projectURL,
    dir: urlToPath(projectURL),
    name: path.basename(url.parse(projectURL).path, '.git'),
  }));

  // scan failures can interrupt mid-clone, which corrupts the git repo
  // sync all the git repos first
  const sync = Promise.all(projects.map(project =>
    gitThrottle(() =>
      synchronize(project, scanBranch))));

  // repos
  const scanning = sync.then(() =>
    Promise.all(projects.map(project =>
      scanThrottle(() =>
        scan(project)
          .then(() => {
            if (project.numTests === 0) {
              project.recordResults({ test: 'No tests found', skipped: true, text: '' });
            }
            return project;
          })))));

  return scanning.then(() => ({
    numTests: _(projects).sumBy('numTests'),
    numFailed: _(projects).sumBy('numFailed'),
    numErrored: _(projects).sumBy('numErrored'),
    numSkipped: _(projects).sumBy('numSkipped'),
    results: _(projects)
        .keyBy('name')
        .mapValues(v => _.pick(v, ['results', 'numTests', 'numFailed', 'numErrored', 'numSkipped']))
        .value(),
  })).then(summary => report(summary, output));
};

module.exports.clean = () => {
  log.info({ workdir }, 'Removing workdir');
  fs.emptyDirSync(workdir);
  process.exit(0);
};
