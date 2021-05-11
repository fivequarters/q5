-- new enum for entity type
CREATE TYPE entity_type AS ENUM ('integration', 'connector', 'storage', 'operation');

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
-- Add constraints
CREATE UNIQUE INDEX entity_pri_key ON entity (entityType, accountId, subscriptionId, entityId);
create index entity_tags_idx on entity using gin (tags);
create index entity_expires_idx on entity (expires);

create function version_conflict() returns trigger as $$
begin
	raise exception 'version_conflict' using errcode = '22000';
end;
$$ language plpgsql;

create trigger version_check before update of version on entity for each row
when (NEW.version != (OLD.version + 1))
execute procedure version_conflict();
