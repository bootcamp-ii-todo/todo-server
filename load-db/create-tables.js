'use strict';

const client = require('../db-client');

client.query(`
    CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        task VARCHAR(256),
        completed BOOL NOT NULL DEFAULT FALSE
    );
`)
    .then(
        () => console.log('db task successful'),
        err => console.error(err)
    )
    .then(() => client.end());