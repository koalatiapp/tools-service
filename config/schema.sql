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
