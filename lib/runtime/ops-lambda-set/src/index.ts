import Fs from 'fs';
import Path from 'path';

const LambdaAnalyticsZip = () => {
  return Fs.readFileSync(Path.join(__dirname, 'lambda-analytics.zip'));
};

const LambdaCronZip = () => {
  return Fs.readFileSync(Path.join(__dirname, 'lambda-cron.zip'));
};

const LambdaDwhZip = () => {
  return Fs.readFileSync(Path.join(__dirname, 'lambda-dwh.zip'));
};

export { LambdaAnalyticsZip, LambdaCronZip, LambdaDwhZip };
