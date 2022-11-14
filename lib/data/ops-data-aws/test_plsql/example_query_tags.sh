./shell.mjs --profile benn.dev "SELECT COUNT(*) FROM entity WHERE entityId LIKE '/integration/%' AND entitytype = 'install' AND tags ??& ARRAY['test-function-1']::text[]"
