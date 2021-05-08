/*

This module defines the schema of the Aurora PostgresSQL databse and provides a mechanism for versioning this schema, 
including making necessary data migrations. 

The default export of this module specifies an array with a sequence of SQL scripts to be executed in the database. 
Each Nth element in the array represents a specific version of the database schema, which can be re-created 
from an empty database by executing scripts 0...N in sequence.

Whenever a modification in the database schema is required (e.g. new table, new column, new index), add a new file
to the `/lib/data/ops-data-aws/src/migrations` directory, with an appropriate date prefix in the format of `yyyy-mm-dd`.
Then rerun the `fuse deployment add ...` command to implement the changes.

Rules of the road: 
1. NEVER remove, rename, or modify the files in the migrations directory.  All changes need be additive.
2. ALWAYS name new migration files with an appropriate `yyyy-mm-dd` prefix so that they are ordered chronologically.
3. In rare cases where multiple migrations need be added on the same date, the date string should be extended to
  `yyyy-mm-dd-hh-mm` (hh for 24 hour time) for every migration within that same day.
3. Current schema version of the database is stored in the single row of the schemaVersion table.

*/

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const get = (name: string) => readFileSync(join(__dirname, '..', 'src', 'migrations', name), { encoding: 'utf8' });

const getAllFiles: () => string[] = () => {
  const files = readdirSync(join(__dirname, '..', 'src', 'migrations'));
  return files.map(get);
};

export default getAllFiles();
