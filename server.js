'use strict';

// Environment variable reading
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3000;
const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;
const CLIENT_URL = process.env.CLIENT_URL;

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

function ensureAdmin(request, response, next) {
    // got token?
    const token = request.get('token') || request.query.token;
    if(!token) next({ status: 401, message: 'No token found' });

    // right token?
    else if(token !== ADMIN_PASSPHRASE) next({ status: 403, message: 'Unauthorized' });
    
    // you can pass
    else next();
}

app.get('/api/admin', ensureAdmin, (request, response) => {
    ensureAdmin(request, response, err => {
        response.send({ admin: !err });
    });
});

app.get('/api/todos', (request, response, next) => {
    client.query(`
        SELECT id, task, completed
        FROM todos;
    `)
        .then(result => response.send(result.rows))
        .catch(next);
});

app.get('/api/todos/:id', (request, response, next) => {
    const id = request.params.id;
    
    client.query(`
        SELECT id, task, completed, priority, notes
        FROM todos
        WHERE id=$1;
    `,
    [id]
    )
        .then(result => {
            if(result.rows.length === 0) next({ status: 404, message: `Todo id ${id} does not exist`});
            else response.send(result.rows[0]);
        })
        .catch(next);
});

app.post('/api/todos', (request, response, next) => {
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
        .catch(next);
});

app.put('/api/todos/:id', ensureAdmin, (request, response, next) => {
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
        .catch(next);
});


app.delete('/api/todos/:id', (request, response, next) => {
    const id = request.params.id;

    client.query(`
        DELETE FROM todos
        WHERE id=$1;
    `,
    [id]
    )
        .then(result => response.send({ removed: result.rowCount !== 0 }))
        .catch(next);
});

app.get('*', (request, response) => {
    response.redirect(CLIENT_URL);
});

// eslint-disable-next-line
app.use((err, request, response, next) => {
    console.error(err);

    if(err.status) {
        response.status(err.status).send({ error: err.message });
    }
    else {
        response.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log('Server running on port', PORT);
});
