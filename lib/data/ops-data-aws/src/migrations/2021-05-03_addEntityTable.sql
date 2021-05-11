-- new enum for entity type
CREATE TYPE entity_type AS ENUM ('integration', 'connector', 'storage', 'operation');

-- create new table
CREATE TABLE entity (
    id SERIAL PRIMARY KEY NOT NULL,
    entityType entity_type NOT NULL,
    accountId VARCHAR NOT NULL,
    subscriptionId VARCHAR NOT NULL,
    entityId VARCHAR NOT NULL,
    version BIGINT NOT NULL,
    data JSONB NOT NULL,
    tags JSONB NOT NULL,
    expires TIMESTAMPTZ
);
-- Add constraints
CREATE UNIQUE INDEX entity_pri_key ON entity (entityType, accountId, subscriptionId, entityId);
CREATE INDEX entity_tags_idx ON entity USING gin (tags);
CREATE INDEX entity_expires_idx ON entity (expires);

CREATE FUNCTION version_conflict() RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'version_conflict' USING errcode = '22000';
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER version_check BEFORE UPDATE OF version ON entity FOR EACH ROW
  WHEN (NEW.version != (OLD.version + 1))
  EXECUTE PROCEDURE version_conflict();
