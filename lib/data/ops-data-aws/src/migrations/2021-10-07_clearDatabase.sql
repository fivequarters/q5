-- Drop all operations, instances, identities, connectors, and integrations from the table
DELETE FROM entity WHERE entityType = 'operation' OR entityType = 'instance' OR entityType = 'identity' OR entityType = 'connector' OR entityType = 'integration' OR entityType = 'session';
