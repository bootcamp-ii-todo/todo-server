'use strict';

const client = require('../db-client');
const todos = require('./todos.json');

Promise.all(todos.map(todo => {
    return client.query(`
        INSERT INTO todos (task, completed)
        VALUES ($1, $2);
    `,
    [
        todo.task, todo.completed
    ]);
}))
    .then(
        () => console.log('db task successful'),
        err => console.error(err)
    )
    .then(() => client.end());