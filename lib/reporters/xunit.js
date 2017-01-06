const _ = require('lodash');
const yaml = require('js-yaml');

function xml(name, attrs, child) {
  if (_.isFunction(attrs) && _.isUndefined(child)) {
    /* eslint-disable no-param-reassign */
    child = attrs;
    attrs = {};
    /* eslint-enable */
  }

  const attrString = _.map(attrs, (v, k) => `${k}="${_.escape(v)}"`).join(' ');
  let content = '';
  if (child) {
    content = child();
  }
  let str = `<${name}`;
  if (attrString) {
    str += ` ${attrString}`;
  }
  if (content) {
    str += `>\n${content}</${name}>\n`;
  } else {
    str += '/>\n';
  }
  return str;
}

function reportTestSuite(result, name) {
  function reportTestCase(testResult) {
    return xml('testcase', {
      classname: name,
      name: testResult.test,
    }, () => {
      let text = testResult.text;
      if (!_.isString(text)) {
        text = `<![CDATA[${yaml.dump(text, { noCompatMode: true })}]]>`;
      }

      let content = '';

      if (testResult.skipped) {
        content += xml('skipped');
      } else if (!testResult.pass) {
        content += xml('failure', { message: testResult.message }, () => `${text}\n`);
      }
      return content;
    });
  }

  return xml('testsuite', {
    name,
    disabled: result.numSkipped,
    failures: result.numFailed,
    tests: result.numTests,
  }, () => result.results.map(reportTestCase).join('\n'));
}

module.exports.report = (summary, out) => {
  out.end(xml('testsuites', {
    name: 'Project scanning',
    disabled: summary.numSkipped,
    failures: summary.numFailed,
    tests: summary.numTests,
    timestamp: new Date().toUTCString(),
  }, () => _.map(summary.results, reportTestSuite).join('\n')));
};
