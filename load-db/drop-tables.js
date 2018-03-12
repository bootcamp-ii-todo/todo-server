'use strict';

const client = require('../db-client');

client.query(`
    DROP TABLE IF EXISTS todos;
`)
    .then(
        () => console.log('db task successful'),
        err => console.error(err)
    )
    .then(() => client.end());