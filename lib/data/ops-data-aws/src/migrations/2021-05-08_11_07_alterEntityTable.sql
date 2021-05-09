-- new enum type instead of int to define entity type.  Same performance, but human readable.
CREATE TYPE entity_type AS ENUM ('integration', 'connector', 'storage', 'operation');

-- we need to completely recreate the entity table in order to have the `id` column correctly placed
-- as the first column.  A little annoying, but better to do it now than later (or never).

-- backup existing table
alter table entity rename to entityRotateOut;
-- create new table
create table entity (
    id SERIAL PRIMARY KEY NOT NULL,
    entityType entity_type not null,
    accountId varchar not null,
    subscriptionId varchar not null,
    entityId varchar not null,
    version bigint not null,
    data jsonb not null,
    tags jsonb not null,
    expires timestamptz
);
-- Migrate from old entity table to new one
insert into entity (
    entityType,
    accountId,
    subscriptionId,
    entityId,
    version,
    data,
    tags,
    expires
)
select
    case
        when categoryId = 1 THEN 'integration'::entity_type
        when categoryId = 2 THEN 'connector'::entity_type
        when categoryId = 3 THEN 'operation'::entity_type
        when categoryId = 4 THEN 'storage'::entity_type
    END,
    accountId,
    subscriptionId,
    entityId,
    version,
    data,
    tags,
    to_timestamp(expires)::date
 from entityRotateOut;
-- Drop old table
DROP TABLE entityRotateOut;

-- Add back constraints
CREATE UNIQUE INDEX entity_pri_key ON entity (entityType, accountId, subscriptionId, entityId);
create index entity_tags_idx on entity using gin (tags);
create index entity_expires_idx on entity (expires);

create trigger version_check before update of version on entity for each row
when (NEW.version != (OLD.version + 1))
execute procedure version_conflict();