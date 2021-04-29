-- The entity table supports hierarchical, tagged storage with optional TTL.
-- It is used to store integrations, connectors, identities, integration instances, as well as async operations
-- but is extensible to other categories of things that are simple key value things.

create table entity (
  categoryId int not null,
  accountId varchar not null,
  subscriptionId varchar not null,
  entityId varchar not null,
  version bigint not null,
  data jsonb not null,
  tags jsonb not null,
  expires bigint
);
 
alter table entity 
add constraint entity_pri_key primary key (categoryId, accountId, subscriptionId, entityId);

create index entity_tags_idx on entity using gin (tags);
create index entity_expires_idx on entity (expires);
