# cross-check

Multi-project, project level linting.

> You have a problem, and decide to use microservices - now you have N problems.

Linting tools are great for maintaining individual projects. But what do you do
when you have a whole bunch of tiny projects? Maintaining consistency between
different projects can become a burden.

Enter cross-check. You give it a list of git repos, and cross-check will clone
them and run a series of checks on them. Output is generated in an
xunit-compatible format, which makes it great for running from your CI server.

Checks are hard-coded, for now.

Current checks:

 * Node.js
   * Assert no outdated dependencies using
     [`npm outdated`](https://docs.npmjs.com/cli/outdated)
   * Assert no security vulnerabilities in dependencies using
     [`nsp check`](https://github.com/nodesecurity/nsp)

Planned work:

 * General
   * Assert a particular file's contents (`.node-version`, for example)
 * Docker
   * Assert `FROM` version matches a regex/semver
 * Node
   * Assert consistency of `private` and `license` fields in `package.json`
   * Assert repository consistent with cloned URL
 * Other
   * Switch many command line options to a configuration file
   * A plaintext reporter for running manually
