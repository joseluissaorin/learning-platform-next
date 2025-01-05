-- Drop database if exists (be careful with this in production!)
DROP DATABASE IF EXISTS learning_platform;

-- Create database
CREATE DATABASE learning_platform;

-- Connect to the database
\c learning_platform;

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS public;

-- Create vector extension in public schema
CREATE EXTENSION IF NOT EXISTS vector SCHEMA public;

-- Create user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'learning_platform_user') THEN
      CREATE USER learning_platform_user WITH PASSWORD 'your_password_here';
   END IF;
END
$do$;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO learning_platform_user;

-- Grant vector extension usage
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO learning_platform_user;
GRANT USAGE ON SCHEMA public TO learning_platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO learning_platform_user;

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE learning_platform TO learning_platform_user;
GRANT CREATE ON SCHEMA public TO learning_platform_user;

-- Grant table privileges (needs to be run after tables are created)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO learning_platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO learning_platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO learning_platform_user;

-- Ensure proper ownership of the vector extension
ALTER EXTENSION vector OWNER TO learning_platform_user;

-- Set proper search path
ALTER DATABASE learning_platform SET search_path TO public; 