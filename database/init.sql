-- Run once as a Postgres superuser to create the role and database.
--   psql -U postgres -f database/init.sql

CREATE ROLE dayflow WITH LOGIN PASSWORD 'dayflow';
CREATE DATABASE dayflow OWNER dayflow;
GRANT ALL PRIVILEGES ON DATABASE dayflow TO dayflow;
