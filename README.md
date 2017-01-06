# cross-check

Multi-project, project level linting.

> You have a problem, and decide to use microservices - now you have N problems.

Linting tools are great for maintaining individual projects. But what do you do
when you have a whole bunch of tiny projects? Maintaining consistency between
different projects can become a burden.

Enter cross-check. You give it a list of git repos, and cross-check will clone
them and run a series of checks on them. Output is generated in an
xunit-compatible format, which makes it great for running from your CI server.
