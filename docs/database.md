# Database

The tool service works with a MySQL-compatible database.

Although a standard MySQL database is provided in the docker-compose setup for
ease of development, the tool service is meant to run on a Vitess MySQL 
environment. This means that **foreign key constraints cannot be used**.


## Initializing the queue's database
To get started, you'll need to manually create the queue's table in the database if it doesn't exist already.  

You can do so by using the following queries:

```sql
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    url TEXT,
    hostname VARCHAR(255),
    priority SMALLINT DEFAULT 1,
    tool VARCHAR(255),
    received_at TIMESTAMP DEFAULT now(),
    processed_by character(40) NULL,
    processed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    processing_time BIGINT NULL
);
CREATE INDEX requests_id ON requests (id);
CREATE INDEX requests_signature ON requests (url(512), tool);
CREATE INDEX requests_hostname ON requests (hostname);
CREATE INDEX requests_processed_by ON requests (processed_by);
CREATE TABLE average_processing_times (
    tool VARCHAR(100) PRIMARY KEY,
	request_count BIGINT DEFAULT 0,
	average_processing_time BIGINT NULL,
	total_processing_time BIGINT NULL
);
CREATE INDEX average_processing_times_tool ON average_processing_times (tool);
```
