'use strict';

// Environment variable reading
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3000;

// Create Express App

// Required Dependencies
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// logging for requests
app.use(morgan('dev'));
// add cors
app.use(cors());
// body parsers (adds a request.body prop)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add Data Routes
const client = require('./db-client');

app.get('/api/todos', (request, response) => {
    client.query(`
        SELECT id, task, completed
        FROM todos;
    `)
        .then(result => response.send(result.rows))
        .catch(err => {
            console.log(err);
            response.sendStatus(500);
        });
});

app.get('/api/todos/:id', (request, response) => {
    const id = request.params.id;
    
    client.query(`
        SELECT id, task, completed, priority, notes
        FROM todos
        WHERE id=$1;
    `,
    [id]
    )
        .then(result => {
            if(result.rows.length === 0) response.sendStatus(404);
            else response.send(result.rows[0]);
        })
        .catch(err => {
            console.log(err);
            response.sendStatus(500);
        });
});

app.post('/api/todos', (request, response) => {
    const body = request.body;

    client.query(`
        INSERT INTO todos (task, priority, notes)
        VALUES ($1, $2, $3)
        RETURNING id, task, completed, priority, notes;
    `,
    [
        body.task,
        body.priority,
        body.notes
    ]
    )
        .then(result => response.send(result.rows[0]))
        .catch(err => {
            console.log(err);
            response.sendStatus(500);
        });
});

app.put('/api/todos/:id', (request, response) => {
    const body = request.body;

    client.query(`
        UPDATE todos
        SET task=$1,
            completed=$2,
            priority=$3,
            notes=$4
        WHERE id=$3
        RETURNING id, task, completed;
    `,
    [
        body.task,
        body.completed,
        body.priority,
        body.notes,
        body.id
    ]
    )
        .then(result => response.send(result.rows[0]))
        .catch(err => {
            console.log(err);
            response.sendStatus(500);
        });
});

app.listen(PORT, () => {
    console.log('Server running on port', PORT);
});
