const Git = require('nodegit');
const path = require('path');

const exists = require('./exists');

// TODO: should be able to use project.log
const { log } = require('./log');

const fetchOpts = {
  callbacks: {
    credentials(fetchURL, userName) {
      log.trace({ fetchURL, userName }, 'building creds');
      if (process.env.SSH_AUTH_SOCK) {
        log.trace('ssh auth: agent');
        return Git.Cred.sshKeyFromAgent(userName);
      }

      // TODO: prompt for (and cache) password
      log.trace('ssh auth: id_rsa');
      return Git.Cred.sshKeyNew(
        userName,
        path.join(process.env.HOME, '.ssh', 'id_rsa.pub'),
        path.join(process.env.HOME, '.ssh', 'id_rsa'),
        '');
    },
  },
  downloadTags: true,
  prune: true,
  updateFetchhead: true,
};


function clone(project) {
  project.log.info({ dir: project.dir, url: project.url }, 'git clone');

  return Git.Clone.clone(project.url, project.dir, { fetchOpts });
}

function fetch(project) {
  const repoPath = project.dir;
  project.log.info('git fetch');

  project.log.trace({ repoPath }, 'Repository.open()');
  return Git.Repository.open(repoPath)
    .then((repo) => {
      project.log.trace('repo.fetch()');
      return repo.fetch('origin', fetchOpts)
        .then(() => repo);
    });
}

function reset(project, repo, scanBranch) {
  project.log.trace('resetting');

  project.log.trace({ branch: 'origin/master' }, 'repo.getBranchCommit()');
  return repo.getBranchCommit('origin/master')
    .then((commit) => {
      const loggableCommit = {
        sha: commit.sha(),
        summary: commit.summary(),
        date: commit.date(),
        author: commit.author(),
      };

      project.log.trace('repo.getCurrentBranch()');
      return repo.getCurrentBranch()
        .then((currentRef) => {
          if (currentRef.shorthand() === scanBranch) {
            project.log.info({ commit: loggableCommit }, 'git reset');
            return Git.Reset.reset(repo, commit, Git.Reset.TYPE.HARD);
          }

          project.log.info({ commit: loggableCommit }, 'git branch');
          return Git.Branch.create(repo, scanBranch, commit, 1)
            .then((ref) => {
              project.log.info({ ref: ref.shorthand() }, 'git checkout');
              return repo.checkoutBranch(ref);
            });
        });
    }).then(() => repo);
}

module.exports.synchronize = (project, scanBranch) =>
  exists(path.join(project.dir, '.git'))
    .then((alreadyCloned) => {
      if (!alreadyCloned) {
        return clone(project);
      }

      return fetch(project);
    })
    .then(repo => reset(project, repo, scanBranch))
    .then(repo => repo.workdir());
