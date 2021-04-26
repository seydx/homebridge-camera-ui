const app = require('../../server/app');
const config = require('../../services/config/config.service.js');
const lowdb = require('../../server/services/lowdb.service');

const supertest = require('supertest');
const request = supertest(app);

const userCredentials = {
  name: 'user',
  password: 'test',
  permissionLevel: ['users:access'],
};

const masterCredentials = {
  name: 'master',
  password: 'master',
  permissionLevel: ['admin'],
};

const masterCredentials2 = {
  name: 'master2',
  password: 'test',
  permissionLevel: ['admin'],
};

beforeAll(async () => {
  await lowdb.ensureDatabase();
  await lowdb.resetDatabase();
  await lowdb.prepareDatabase(config.plugin);
  lowdb.initTokensDatabase();
});

describe('POST /api/users', () => {
  it('should create a new user with low permission level', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .post('/api/users')
      .auth(auth.body.access_token, { type: 'bearer' })
      .send(userCredentials);
    expect(response.statusCode).toEqual(201);
  });

  it('should fail if a required field is missing', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .post('/api/users')
      .auth(auth.body.access_token, { type: 'bearer' })
      .send({ name: 'test' });
    expect(response.statusCode).toEqual(422);
  });

  it('should fail if a user with same username exists', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .post('/api/users')
      .auth(auth.body.access_token, { type: 'bearer' })
      .send(masterCredentials);
    expect(response.statusCode).toEqual(409);
  });

  it('should fail if a user with ADMIN permisson level already exists', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .post('/api/users')
      .auth(auth.body.access_token, { type: 'bearer' })
      .send(masterCredentials2);
    expect(response.statusCode).toEqual(409);
  });
});

describe('GET /api/users', () => {
  it('should response with JSON array of all registered users', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request.get('/api/users').auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(200);
    expect(Array.isArray(response.body.result)).toBe(true);
  });
});

describe('GET /api/users/:name', () => {
  it('should fail if user dont exists', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request.get('/api/users/lulz').auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(404);
  });

  it('should response with JSON object of the user', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .get('/api/users/' + masterCredentials.name)
      .auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(200);
    expect(Object.keys(response.body).length).toBeTruthy();
  });
});

describe('PATCH /api/users/:name', () => {
  it('should fail if user dont exists', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .patch('/api/users/lulz')
      .auth(auth.body.access_token, { type: 'bearer' })
      .send({ photo: '/images/user/admin.png' });
    expect(response.statusCode).toEqual(404);
  });

  it('should fail if body is undefined', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .patch('/api/users/' + masterCredentials.name)
      .auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(400);
  });

  it('should response with no content if successfull', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .patch('/api/users/' + masterCredentials.name)
      .auth(auth.body.access_token, { type: 'bearer' })
      .send({ photo: '/images/user/admin.png' });
    expect(response.statusCode).toEqual(204);
  });
});

describe('DELETE /api/users/:name', () => {
  it('should fail if user dont exists', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request.delete('/api/users/lulz').auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(404);
  });

  it('should fail if user has ADMIN permission', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .delete('/api/users/' + masterCredentials.name)
      .auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(409);
  });

  it('should response with no content if successfull', async () => {
    const auth = await request.post('/api/auth/login').send(masterCredentials);
    expect(auth.statusCode).toEqual(201);

    const response = await request
      .delete('/api/users/' + userCredentials.name)
      .auth(auth.body.access_token, { type: 'bearer' });
    expect(response.statusCode).toEqual(204);
  });
});
