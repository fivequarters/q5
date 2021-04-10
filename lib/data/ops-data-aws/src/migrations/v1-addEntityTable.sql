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
