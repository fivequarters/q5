-- No Transaction

-- The `No Transaction` comment on the first line allows this migration to be run outside of a transaction.
-- This is unfortunately necessary for updates to enum values.
ALTER TYPE entity_type RENAME VALUE 'instance' TO 'install';
