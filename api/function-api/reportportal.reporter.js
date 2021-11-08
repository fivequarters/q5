const JestReportPortal = require('@reportportal/agent-js-jest');
const fs = require('fs');

const { getStartLaunchObject } = require('@reportportal/agent-js-jest/utils/objectUtils');

const RP_MAGIC_OFFSET = 511;
const testItemStatuses = { PASSED: 'passed', FAILED: 'failed', SKIPPED: 'pending' };

const promiseErrorHandler = (promise) => {
  promise.catch((err) => {
    console.log(err);
  });
};

class FusebitReportPortal extends JestReportPortal {
  constructor(globalConfig, options) {
    super(globalConfig, options);
    this.fusebitPayload = {};
  }

  onRunStart() {
    const startLaunchObj = getStartLaunchObject(this.reportOptions);
    const { tempId, promise } = this.client.startLaunch(startLaunchObj);

    this.tempLaunchId = tempId;
    promise.then((res) => {
      fs.writeFileSync('/tmp/rp-results-id', (JSON.parse(res.number) + RP_MAGIC_OFFSET).toString());
    });
  }
}

module.exports = FusebitReportPortal;
