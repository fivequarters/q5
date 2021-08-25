-- Drop all operations from the table
DELETE FROM entity WHERE entityType = 'operation';

-- Add a state and stateMessage column.
CREATE TYPE entity_state AS ENUM('creating', 'invalid', 'active');

-- Set all of the existing entities to 'active' with no outstanding operation.
ALTER TABLE entity ADD COLUMN state entity_state NOT NULL DEFAULT 'active';
ALTER TABLE entity ADD COLUMN operationStatus JSONB NOT NULL DEFAULT '{"statusCode":200, "message":""}';

-- Add dateAdded and dateModified timestamps, along with an update trigger
ALTER TABLE entity ADD COLUMN dateAdded TIMESTAMPTZ DEFAULT now();
ALTER TABLE entity ADD COLUMN dateModified TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION update_date_modified () RETURNS TRIGGER AS $$
BEGIN
  NEW.dateModified := now();
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER trigger_update_date_modified AFTER UPDATE OF version ON entity
  FOR EACH ROW EXECUTE PROCEDURE update_date_modified();

-- Add some defensive default timeouts for transactions
ALTER DATABASE fusebit SET statement_timeout = 60000;
ALTER DATABASE fusebit SET idle_in_transaction_session_timeout = 3600000;

-- Update update_if_version to include the state and operationStatus parameters
CREATE OR REPLACE FUNCTION update_if_version(
  eType entity_type, aId VARCHAR, sId VARCHAR, eId VARCHAR,
  filterExpired BOOLEAN, prefixMatchId BOOLEAN, upsert BOOLEAN,
  dataParam JSONB, tagsParam JSONB, expiresParam timestamptz,
  stateParam entity_state, operationStatusParam JSONB,
  versionParam CHAR(36) DEFAULT NULL)
    RETURNS SETOF entity AS $$
DECLARE
  action_cursor REFCURSOR;
  resultRow entity%ROWTYPE;
BEGIN
  IF upsert AND filterExpired THEN
    RAISE EXCEPTION 'illegal use of both upsert and filterExpired' USING errcode = '22003';
  END IF;
  SELECT * FROM check_if_version(
    eType, aId, sId, eId, filterExpired, prefixMatchId, versionParam)
  INTO action_cursor;

  RETURN QUERY UPDATE entity
    SET
      data = COALESCE(dataParam, entity.data),
      tags = COALESCE(tagsParam, entity.tags),
      expires = COALESCE(expiresParam, entity.expires),
      version = gen_random_uuid(),
      state = COALESCE(stateParam, entity.state),
      operationStatus = COALESCE(operationStatusParam, entity.operationStatus)
    WHERE CURRENT OF action_cursor
    RETURNING entity.*;
  CLOSE action_cursor;

  EXCEPTION WHEN SQLSTATE '22001' THEN
    IF NOT upsert THEN
      RAISE EXCEPTION 'not_found' USING errcode = '22001';
    END IF;
    -- Not including any state or operationStatus fields here as they aren't relevant on upsert entities.
    RETURN QUERY INSERT INTO entity(entityType, accountId, subscriptionId, entityId, data, tags, version, expires)
      VALUES ( eType, aId, sId, eId, dataParam, tagsParam, gen_random_uuid(), expiresParam) RETURNING *;
END;
$$ LANGUAGE PLPGSQL;
