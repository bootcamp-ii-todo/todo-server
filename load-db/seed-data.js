'use strict';

const client = require('../db-client');
const todos = require('./todos.json');

Promise.all(todos.map(todo => {
    return client.query(`
        INSERT INTO todos (task, completed, priority, notes)
        VALUES ($1, $2, $3, $4);
    `,
    [
        todo.task, todo.completed, todo.priority, todo.notes
    ]);
}))
    .then(
        () => console.log('db task successful'),
        err => console.error(err)
    )
    .then(() => client.end());