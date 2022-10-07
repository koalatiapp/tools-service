# Database

The tool service works with a MySQL-compatible database.

Although a standard MySQL database is provided in the docker-compose setup for
ease of development, the tool service is meant to run on a Vitess MySQL 
environment. This means that **foreign key constraints cannot be used**.


## Initializing the queue's database

The database should be initialized automatically when you run the service.

However, if you run into issues, you can always create the database manually 
based on the SQL schema located in [`config/schema.sql`](../config/schema.sql).
