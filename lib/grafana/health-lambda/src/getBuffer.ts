import fs from 'fs';
import path from 'path';

export const getBuffer = () => {
  return fs.readFileSync(path.join(__dirname, 'health-lambda.zip'));
};
