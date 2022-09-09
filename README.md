# Koalati Tools API

This is the web service that handles requests for all website testing on Koalati.

## Table of contents
- Setup
  - [Database](/docs/database.md)
  - [Environment variables](/docs/environment-variables.md)
- [API](/docs/api.md)
  - [Webhook](/docs/webhook.md)
- Contributing
  - [How it works](/docs/contributing/how-it-works.md)
  - [Mock mode](/docs/contributing/mock.md)


## Getting started
The easiest way to get started is to use Docker Compose with the provided configurations.

1. Create or setup the MySQL database (check out [the database documentation](/docs/database.md))
2. Create and fill in your own `.env` file at the root of the project (take a look at the `.env.dist` file and to the [Environment variables](/docs/environment-variables.md) section for reference).
3. Launch the API service by running `docker-compose up`.


## License

This repository is distributed with the [MIT License](/LICENSE).
