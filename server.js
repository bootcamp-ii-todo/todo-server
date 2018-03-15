'use strict';

// Environment variable reading
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3000;
const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;
const CLIENT_URL = process.env.CLIENT_URL;
const OMDB_API_URL = process.env.OMDB_API_URL;
const OMDB_POSTER_API_URL = process.env.OMDB_POSTER_API_URL;
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const TOKEN_KEY = process.env.TOKEN_KEY;

// Create Express App

// Required Dependencies
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const sa = require('superagent');
const jwt = require('jsonwebtoken');

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
    let payload;
    try {
        payload = jwt.verify(token, TOKEN_KEY);
    } catch(err) {
        return next({ status: 403, message: 'Unauthorized' });
    }

    request.user = payload;
    
    // you can pass
    next();
}

function makeToken(id) {
    return { token: jwt.sign({ id: id }, TOKEN_KEY) };
}

app.post('/api/auth/signup', (request, response, next) => {
    const credentials = request.body;
    if(!credentials.email || !credentials.password) {
        return next({ status: 400, message: 'email and password must be provided'});
    }

    client.query(`
        SELECT id
        FROM users
        WHERE email=$1
    `,
    [credentials.email])
        .then(result => {
            if(result.rows.length !== 0) {
                return next({ status: 400, message: 'email already in use' });
            }

            return client.query(`
                INSERT INTO users (email, password)
                VALUES ($1, $2)
                RETURNING id, email;
            `,
            [credentials.email, credentials.password]);
        })
        .then(result => {
            const token = makeToken(result.rows[0].id);
            response.send(token);
        })
        .catch(next);
});

app.post('/api/auth/signin', (request, response, next) => {
    const credentials = request.body;
    if(!credentials.email || !credentials.password) {
        return next({ status: 400, message: 'email and password must be provided'});
    }

    client.query(`
        SELECT id, password
        FROM users
        WHERE email=$1
    `,
    [credentials.email]
    )
        .then(result => {
            if(result.rows.length === 0 || result.rows[0].password !== credentials.password) {
                return next({ status: 401, message: 'invalid email or password' });
            }
            const token = makeToken(result.rows[0].id);
            response.send(token);
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

function insertTodo(todo) {
    return client.query(`
        INSERT INTO todos (task, priority, notes)
        VALUES ($1, $2, $3)
        RETURNING id, task, completed, priority, notes;
    `,
    [
        todo.task,
        todo.priority,
        todo.notes
    ])
        .then(result => result.rows[0]);
}

app.post('/api/todos', (request, response, next) => {
    const body = request.body;

    insertTodo(body)
        .then(result => response.send(result))
        .catch(next);
});

app.put('/api/todos/:id', (request, response, next) => {
    const body = request.body;

    client.query(`
        UPDATE todos
        SET task=$1,
            completed=$2,
            priority=$3,
            notes=$4
        WHERE id=$5
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


app.delete('/api/todos/:id', ensureAdmin, (request, response, next) => {
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

app.get('/api/movies', (request, response, next) => {
    const search = request.query.search;
    if(!search) return next({ status: 400, message: 'search query must be provided'});

    sa.get(OMDB_API_URL)
        .query({
            s: search.trim(),
            apikey: OMDB_API_KEY
        })
        .then(res => {
            const body = res.body;
            const formatted = {
                total: body.totalResults,
                movies: body.Search.map(movie => {
                    return {
                        title: movie.Title,
                        year: movie.Year,
                        imdbId: movie.imdbID,
                        type: movie.Type,
                        poster: movie.Poster === 'N/A'
                            ? 'http://lexingtonvenue.com/media/poster-placeholder.jpg'
                            : `${OMDB_POSTER_API_URL}?i=${movie.imdbID}&w=200&apikey=${OMDB_API_KEY}`
                    };
                })
            };

            response.send(formatted);
        })
        .catch(next);
});

app.put('/api/todos/movies/:id', (request, response, next) => {
    const id = request.params.id;

    sa.get(OMDB_API_URL)
        .query({
            i: id,
            apikey: OMDB_API_KEY
        })
        .then(res => {
            const movie = res.body;
            return insertTodo({
                task: `Watch ${movie.Title}`,
                priority: 3,
                notes: movie.Actors
            });
        })
        .then(result => response.send(result))
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
