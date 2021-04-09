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

const version0_addSchemaVersionTable = `
-- The schemaVersion table holds the current database schema version.

create table schemaVersion (
  version int
);

insert into schemaVersion values (0);
`;

const version1_addEntityTable = `
-- The entity table supports hierarchical, tagged storage with optional TTL.
-- It is used to store integrations, connectors, identities, integration instances, as well as async operations
-- but is extensible to other categories of things that are simple key value things.

create table entity (
  accountId varchar not null,
  subscriptionId varchar not null,
  categoryId int not null,
  entityId varchar not null,
  tags jsonb,
  expires bigint,
  etag varchar,
  data jsonb not null
);
 
alter table entity 
add constraint entity_pri_key primary key (accountId, subscriptionId, categoryId, entityId);

create index entity_tags_idx on entity using gin (tags);
`;

export default [version0_addSchemaVersionTable, version1_addEntityTable];
