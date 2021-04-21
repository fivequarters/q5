/*

This module defines the schema of the Aurora PostgresSQL databse and provides a mechanism for versioning this schema, 
including making necessary data migrations. 

The default export of this module specifies an array with a sequence of SQL scripts to be executed in the database. 
Each Nth element in the array represents a specific version of the database schema, which can be re-created 
from an empty database by executing scripts 0...N in sequence. Whenever a modification in the database schema is 
required (e.g. new table, new column, new index), add a new entry at the end of the array, and rerun 
`fuse deployment add ...` command. 

Rules of the road: 
1. NEVER remove or reorder elements in the array that is the default export of this module. 
2. ALWAYS add new elements at the end of the array. 
3. Current schema version of the database is stored in the single row of the schemaVersion table.

*/

import { readFileSync } from 'fs';
import { join } from 'path';

const get = (name: string) => readFileSync(join(__dirname, '..', 'src', 'migrations', name), { encoding: 'utf8' });

export default [get('v0-addSchemaVersionTable.sql'), get('v1-addEntityTable.sql')];
