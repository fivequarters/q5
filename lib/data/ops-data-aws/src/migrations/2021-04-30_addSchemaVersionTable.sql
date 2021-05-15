-- The schemaVersion table holds the current database schema version.

CREATE TABLE schemaVersion (
    onerow_id BOOL PRIMARY KEY DEFAULT TRUE,
    version INT,
    fuse_ops_version VARCHAR(30),
    CONSTRAINT onerow_uni CHECK (onerow_id)
);

REVOKE DELETE, TRUNCATE ON schemaVersion FROM public;

INSERT INTO schemaVersion VALUES(true, -1, '');
