'use strict';

const client = require('../db-client');

client.query(`
    CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        task VARCHAR(256),
        completed BOOL NOT NULL DEFAULT FALSE,
        priority INTEGER DEFAULT 3,
        notes TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(256) NOT NULL,
        password VARCHAR(256) NOT NULL
    );
`)
    .then(
        () => console.log('db task successful'),
        err => console.error(err)
    )
    .then(() => client.end());