-- The schemaVersion table holds the current database schema version.

create table schemaVersion (
    onerow_id bool primary key default true,
    version int,
    constraint onerow_uni check (onerow_id)
);

revoke delete, truncate on schemaVersion from public;

insert into schemaVersion values (true, -1);
-- recreating schemaVersion table to hold history of migration dates
-- this is pasted both here and in a future migration to facilitate
--  the migration process for deployments at either stage
alter table schemaVersion rename to schemaVersionRotateOut;

create table schemaVersion (
    id SERIAL PRIMARY KEY NOT NULL,
    version bigint unique,
    fuse_ops_version varchar(30),
    ran_at timestamptz
);

insert into schemaVersion (version, ran_at)
SELECT generate_series(-1,version), now() from  schemaVersionRotateOut;

revoke delete, truncate on schemaVersion from public;

drop table schemaVersionRotateOut;
