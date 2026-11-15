const request = require('supertest');
const cloudinary = require('cloudinary').v2;
const { io: Client } = require('socket.io-client');
const { startTestServer } = require('./setup');
const env = require('../src/config/env');

let ctx; let api;
beforeAll(async () => { ctx = await startTestServer(); api = request(ctx.app); });
afterAll(async () => ctx.stop());

const auth = (t) => ({ Authorization: `Bearer ${t}` });
let owner; let editor; let viewer; let otherOwner; let form;

const FIELDS = [
  { label: 'Full name', type: 'text', required: true },
  { label: 'Email', type: 'email', required: true },
  { label: 'Which plan?', type: 'select', options: ['Free', 'Pro', 'Enterprise'], required: true },
  { label: 'Interested in', type: 'checkbox', options: ['API', 'Analytics', 'Support'] },
  { label: 'Rate us', type: 'rating' },
];

describe('accounts & roles', () => {
  test('register creates an org with an owner', async () => {
    const res = await api.post('/api/auth/register').send({ orgName: 'Acme', name: 'Asha', email: 'asha@acme.com', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('owner');
    owner = res.body;
    otherOwner = (await api.post('/api/auth/register').send({ orgName: 'Globex', name: 'G', email: 'g@globex.com', password: 'secret123' })).body;
  });

  test('duplicate email is rejected', async () => {
    const res = await api.post('/api/auth/register').send({ orgName: 'X', name: 'X', email: 'asha@acme.com', password: 'secret123' });
    expect(res.status).toBe(409);
  });

  test('owner adds an editor and a viewer; they can log in', async () => {
    for (const [role, email] of [['editor', 'ed@acme.com'], ['viewer', 'vi@acme.com']]) {
      const r = await api.post('/api/users').set(auth(owner.token)).send({ name: role, email, password: 'secret123', role });
      expect(r.status).toBe(201);
    }
    editor = (await api.post('/api/auth/login').send({ email: 'ed@acme.com', password: 'secret123' })).body;
    viewer = (await api.post('/api/auth/login').send({ email: 'vi@acme.com', password: 'secret123' })).body;
    expect(editor.user.role).toBe('editor');
  });

  test('only the owner can add team members', async () => {
    const r = await api.post('/api/users').set(auth(editor.token)).send({ name: 'x', email: 'x@acme.com', password: 'secret123', role: 'viewer' });
    expect(r.status).toBe(403);
  });
});

describe('form builder', () => {
  test('viewer cannot create forms', async () => {
    const r = await api.post('/api/forms').set(auth(viewer.token)).send({ title: 'Nope', fields: FIELDS });
    expect(r.status).toBe(403);
  });

  test('choice fields must have options', async () => {
    const r = await api.post('/api/forms').set(auth(editor.token)).send({ title: 'Bad', fields: [{ label: 'Pick', type: 'select', options: [] }] });
    expect(r.status).toBe(400);
  });

  test('editor creates a form; field keys and a public slug are generated', async () => {
    const r = await api.post('/api/forms').set(auth(editor.token)).send({ title: 'Product survey', fields: FIELDS });
    expect(r.status).toBe(201);
    form = r.body.form;
    expect(form.status).toBe('draft');
    expect(form.slug).toHaveLength(10);
    expect(form.fields.every((f) => /^f_/.test(f.key))).toBe(true);
  });

  test('draft forms are not publicly reachable; published ones are', async () => {
    expect((await api.get(`/api/public/forms/${form.slug}`)).status).toBe(404);
    const p = await api.patch(`/api/forms/${form._id}/status`).set(auth(editor.token)).send({ status: 'published' });
    expect(p.status).toBe(200);
    const pub = await api.get(`/api/public/forms/${form.slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.form.orgId).toBeUndefined(); // internal ids are not exposed
    expect(pub.body.form.acceptingResponses).toBe(true);
  });

  test('another organisation cannot read the form', async () => {
    expect((await api.get(`/api/forms/${form._id}`).set(auth(otherOwner.token))).status).toBe(404);
    expect((await api.get(`/api/forms/${form._id}/analytics`).set(auth(otherOwner.token))).status).toBe(404);
  });
});

describe('public submissions', () => {
  const k = (i) => form.fields[i].key;

  test('server-side validation rejects bad answers with per-field errors', async () => {
    const r = await api.post(`/api/public/forms/${form.slug}/responses`).send({
      answers: { [k(1)]: 'not-an-email', [k(2)]: 'Platinum', [k(4)]: 7 },
    });
    expect(r.status).toBe(400);
    expect(Object.keys(r.body.details).sort()).toEqual([k(0), k(1), k(2), k(4)].sort());
  });

  test('valid answers are stored and unknown keys are dropped', async () => {
    const answers = [
      { [k(0)]: 'Riya', [k(1)]: 'riya@mail.com', [k(2)]: 'Pro', [k(3)]: ['API', 'Analytics'], [k(4)]: 5, hacker: 'x' },
      { [k(0)]: 'Dev', [k(1)]: 'dev@mail.com', [k(2)]: 'Free', [k(3)]: ['API'], [k(4)]: 3 },
      { [k(0)]: 'Sam', [k(1)]: 'sam@mail.com', [k(2)]: 'Pro' },
    ];
    for (const a of answers) {
      const r = await api.post(`/api/public/forms/${form.slug}/responses`).send({ answers: a });
      expect(r.status).toBe(201);
    }
    const list = await api.get(`/api/forms/${form._id}/responses`).set(auth(owner.token));
    expect(list.body.total).toBe(3);
    expect(list.body.items[2].answers.hacker).toBeUndefined();
    const forms = await api.get('/api/forms').set(auth(owner.token));
    expect(forms.body.forms[0].responseCount).toBe(3);
  });

  test('viewers see analytics but not raw responses', async () => {
    expect((await api.get(`/api/forms/${form._id}/responses`).set(auth(viewer.token))).status).toBe(403);
    const a = await api.get(`/api/forms/${form._id}/analytics`).set(auth(viewer.token));
    expect(a.status).toBe(200);
    expect(a.body.total).toBe(3);
    const plan = a.body.fields.find((f) => f.key === k(2));
    expect(plan.counts).toEqual({ Free: 1, Pro: 2, Enterprise: 0 });
    const interests = a.body.fields.find((f) => f.key === k(3));
    expect(interests.counts).toEqual({ API: 2, Analytics: 1, Support: 0 });
    const rating = a.body.fields.find((f) => f.key === k(4));
    expect(rating.avg).toBe(4);
    expect(a.body.perDay[0].count).toBe(3);
  });

  test('CSV export has a header row and one row per response', async () => {
    const r = await api.get(`/api/forms/${form._id}/export.csv`).set(auth(editor.token));
    expect(r.status).toBe(200);
    const lines = r.text.split('\n');
    expect(lines[0]).toBe('Submitted at,Full name,Email,Which plan?,Interested in,Rate us');
    expect(lines).toHaveLength(4);
    expect(r.text).toContain('API; Analytics');
  });

  test('closed forms stop accepting responses', async () => {
    await api.patch(`/api/forms/${form._id}/status`).set(auth(owner.token)).send({ status: 'closed' });
    const pub = await api.get(`/api/public/forms/${form.slug}`);
    expect(pub.body.form.acceptingResponses).toBe(false);
    const r = await api.post(`/api/public/forms/${form.slug}/responses`).send({ answers: {} });
    expect(r.status).toBe(410);
    await api.patch(`/api/forms/${form._id}/status`).set(auth(owner.token)).send({ status: 'published' });
  });
});

describe('Cloudinary file uploads', () => {
  let fileForm;
  test('signature endpoint: 503 when not configured, signed params when configured', async () => {
    const created = await api.post('/api/forms').set(auth(owner.token)).send({
      title: 'Job application', fields: [{ label: 'Name', type: 'text', required: true }, { label: 'Resume', type: 'file', required: true }],
    });
    fileForm = created.body.form;
    await api.patch(`/api/forms/${fileForm._id}/status`).set(auth(owner.token)).send({ status: 'published' });
    expect((await api.get(`/api/public/forms/${fileForm.slug}/upload-signature`)).status).toBe(503);

    Object.assign(env.cloudinary, { cloudName: 'demo', apiKey: '123', apiSecret: 'shh' });
    const r = await api.get(`/api/public/forms/${fileForm.slug}/upload-signature`);
    expect(r.status).toBe(200);
    expect(r.body.signature).toBe(cloudinary.utils.api_sign_request({ timestamp: r.body.timestamp, folder: r.body.folder }, 'shh'));
    expect(r.body.apiSecret).toBeUndefined(); // the secret never leaves the server
  });

  test('file answers must be Cloudinary URLs', async () => {
    const [name, resume] = fileForm.fields.map((f) => f.key);
    const bad = await api.post(`/api/public/forms/${fileForm.slug}/responses`).send({ answers: { [name]: 'A', [resume]: 'https://evil.com/x.pdf' } });
    expect(bad.status).toBe(400);
    const ok = await api.post(`/api/public/forms/${fileForm.slug}/responses`)
      .send({ answers: { [name]: 'A', [resume]: 'https://res.cloudinary.com/demo/raw/upload/v1/cv.pdf' } });
    expect(ok.status).toBe(201);
  });
});

describe('real-time response tracking', () => {
  const connect = (token) => new Promise((resolve, reject) => {
    const s = Client(ctx.url, { auth: { token }, transports: ['websocket'], forceNew: true });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (e) => { s.close(); reject(e); });
  });
  const watch = (s, id) => new Promise((resolve) => s.emit('form:watch', id, resolve));

  test('rejects unauthenticated sockets', async () => {
    await expect(connect('bad')).rejects.toThrow('unauthorized');
  });

  test('owner watching the form gets response:new; other tenants cannot watch it', async () => {
    const mine = await connect(owner.token);
    const theirs = await connect(otherOwner.token);
    expect(await watch(mine, form._id)).toEqual({ ok: true });
    expect(await watch(theirs, form._id)).toEqual({ ok: false });
    let leaked = false;
    theirs.on('response:new', () => { leaked = true; });

    const got = new Promise((resolve) => mine.on('response:new', resolve));
    const k = form.fields.map((f) => f.key);
    await api.post(`/api/public/forms/${form.slug}/responses`).send({ answers: { [k[0]]: 'Live', [k[1]]: 'live@mail.com', [k[2]]: 'Enterprise' } });
    const payload = await got;
    expect(payload.responseCount).toBe(4);
    expect(payload.answers[k[0]]).toBe('Live');
    await new Promise((r) => setTimeout(r, 200));
    expect(leaked).toBe(false);
    mine.close(); theirs.close();
  });
});
