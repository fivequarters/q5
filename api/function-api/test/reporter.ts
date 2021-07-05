import { Reporter, Context } from '@jest/reporters';
import { AggregatedResult } from '@jest/test-result';
import superagent from 'superagent';

export default class SlackReporter implements Reporter{


  onRunComplete(test, runResults): void | Promise<void> {
    console.log(JSON.stringify(runResults))
    console.log("REEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEe")
  }
  
  onTestResult() {

  }

  onRunStart() {

  }

  onTestStart() {

  }

  getLastError() {}
}
