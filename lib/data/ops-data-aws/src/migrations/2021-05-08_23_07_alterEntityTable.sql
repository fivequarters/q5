-- recreating schemaVersion table to hold history of migration dates

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