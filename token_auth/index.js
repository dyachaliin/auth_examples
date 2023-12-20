const uuid = require('uuid');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';

class Session {
    #sessions = {}

    constructor() {
        try {
            this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
            this.#sessions = JSON.parse(this.#sessions.trim());

            console.log(this.#sessions);
        } catch(e) {
            this.#sessions = {};
        }
    }

    #storeSessions() {
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8');
    }

    set(key, value) {
        if (!value) {
            value = {};
        }
        this.#sessions[key] = value;
        this.#storeSessions();
    }

    get(key) {
        return this.#sessions[key];
    }

    init(res) {
        const sessionId = uuid.v4();
        this.set(sessionId);

        return sessionId;
    }

    destroy(req, res) {
        const sessionId = req.sessionId;
        delete this.#sessions[sessionId];
        this.#storeSessions();
    }
}

const sessions = new Session();

app.use((req, res, next) => {
    let currentSession = {};
    let sessionId = req.get(SESSION_KEY);

    if (sessionId) {
        currentSession = sessions.get(sessionId);
        if (!currentSession) {
            currentSession = {};
            sessionId = sessions.init(res);
        }
    } else {
        sessionId = sessions.init(res);
    }

    req.session = currentSession;
    req.sessionId = sessionId;

    onFinished(req, () => {
        const currentSession = req.session;
        const sessionId = req.sessionId;
        sessions.set(sessionId, currentSession);
    });

    next();
});

app.get('/', (req, res) => {
    if (req.session.username) {
        return res.json({
            username: req.session.username,
            logout: 'http://localhost:3000/logout'
        })
    }
    res.sendFile(path.join(__dirname+'/index.html'));
})

app.get('/logout', (req, res) => {
    sessions.destroy(req, res);
    res.redirect('/');
});

const users = [
    {
        login: 'Login',
        password: 'Password',
        username: 'Username',
    },
    {
        login: 'Login1',
        password: 'Password1',
        username: 'Username1',
    }
]


app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;

    try {
        // Make a request to Auth0 to authenticate the user
        const authResponse = await axios.post('https://dev-oq87tp0qk6gh1qp8.us.auth0.com/oauth/token', {
            grant_type: 'password',
            username: login,
            password: password,
            client_id: 'BG640TUfkyjyMdYg1a8ljHuhbVpuVqIe',
            client_secret: 'klgAc7CW9Jv1SNqHl55VCrv1kX1joxlzKH50pxfpUbSUS9EE0WTRKqXkjeQd52rw',
            audience: ' https://localhost:3000',
            scope: 'openid profile email',
        });

        const accessToken = authResponse.data.access_token;

        // You may want to decode the access token to get user information
        const userInformation = jwt.decode(accessToken);

        // Store user information in the session
        req.session.username = userInformation.username;
        req.session.login = userInformation.login;

        // Send a response with the access token
        res.json({ token: accessToken });
    } catch (error) {
        console.error(error);

        // Handle authentication failure
        res.status(401).json({ error: 'Authentication failed', message: 'Wrong email or password.' });
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})