const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { AuthenticationClient, UserInfoClient } = require('auth0');
const { auth } = require('express-oauth2-jwt-bearer');
const port = 3000;

const auth0 = new AuthenticationClient({
    domain: 'dev-oq87tp0qk6gh1qp8.us.auth0.com',
    clientId: 'BG640TUfkyjyMdYg1a8ljHuhbVpuVqIe',
    clientSecret: 'klgAc7CW9Jv1SNqHl55VCrv1kX1joxlzKH50pxfpUbSUS9EE0WTRKqXkjeQd52rw',
});

const checkJwt = auth({
    audience: ' https://localhost:3000',
    issuerBaseURL: `https://dev-oq87tp0qk6gh1qp8.us.auth0.com/`,
});

const userInfo = new UserInfoClient({
    domain: 'dev-oq87tp0qk6gh1qp8.us.auth0.com',
});

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const TOKEN_KEY = 'Authorization';

app.get('/api/user', checkJwt, async (req, res) => {
    const auth = req.auth;
    if (auth) {
        const token = auth.token;
        const { data } = await userInfo.getUserInfo(token);
        return res.json(data);
    }
    return res.status(401).json({'error': 'Forbidden'});
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;

    try {
        const { data } = await auth0.oauth.passwordGrant({
            username: login,
            password,
            scope: 'offline_access openid',
            audience: ' https://localhost:3000'
        });

        res.json(data).send();
    } catch (err) {
        res.status(401).send();
    }
});

app.post('/api/refresh', async (req, res) => {
    const refresh_token = req.get(TOKEN_KEY);

    const { data } = await auth0.oauth.refreshTokenGrant({ refresh_token });

    res.json(data).send();
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})