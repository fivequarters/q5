-- new enum for entity type
CREATE TYPE entity_type AS ENUM ('integration', 'connector', 'storage', 'operation');

-- create new table
CREATE TABLE entity (
    id SERIAL PRIMARY KEY NOT NULL,
    entityType entity_type NOT NULL,
    accountId VARCHAR NOT NULL,
    subscriptionId VARCHAR NOT NULL,
    entityId VARCHAR NOT NULL,
    version VARCHAR(36) NOT NULL,
    data JSONB NOT NULL,
    tags JSONB NOT NULL,
    expires TIMESTAMPTZ
);

-- Add constraints
CREATE UNIQUE INDEX entity_pri_key ON entity (entityType, accountId, subscriptionId, entityId);
CREATE INDEX entity_tags_idx ON entity USING gin (tags);
CREATE INDEX entity_expires_idx ON entity (expires);
