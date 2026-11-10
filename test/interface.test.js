process.env.DATABASE_STORAGE = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { createApp } = require("../app");
const { sequelize, Usuario } = require("../models");

test.before(async () => {
  await sequelize.sync({ force: true });
  await Usuario.bulkCreate([
    { nome: "Estudante Demo", email: "estudante@escola.test", senhaHash: await bcrypt.hash("aluno123", 4), perfil: "estudante", ativo: true },
    { nome: "Administrador Demo", email: "admin@escola.test", senhaHash: await bcrypt.hash("admin123", 4), perfil: "administrador", ativo: true }
  ]);
});
test.after(() => sequelize.close());

test("GET /login apresenta o formulário", async () => {
  const resposta = await request(createApp()).get("/login");
  assert.equal(resposta.status, 200);
  assert.match(resposta.text, /Entrar no Portal Acadêmico/);
  assert.doesNotMatch(resposta.text, /href="\/(painel|administracao)"|action="\/logout"/);
  for (const credenciais of [
    { email: "estudante@escola.test", senha: "errada" },
    { email: "inexistente@escola.test", senha: "aluno123" },
    {}
  ]) {
    const agente = request.agent(createApp());
    const falha = await agente.post("/login").type("form").send(credenciais).expect(401);
    assert.match(falha.text, /E-mail ou senha inválidos/);
    assert.equal(falha.headers["set-cookie"], undefined);
    await agente.get("/painel").expect(302).expect("Location", "/login");
  }
});
test("GET /saude responde em JSON", async () => {
  const resposta = await request(createApp()).get("/saude");
  assert.equal(resposta.status, 200);
  assert.deepEqual(resposta.body, { status: "ok" });
});
test("a interface do painel funciona após o login", async () => {
  const agente = request.agent(createApp());
  await agente.post("/login")
    .type("form")
    .send({ email: "estudante@escola.test", senha: "aluno123" })
    .expect(302);
  const resposta = await agente.get("/painel");
  assert.equal(resposta.status, 200);
  assert.match(resposta.text, /Área autenticada/i);
  assert.match(resposta.text, /Estudante Demo/);
  assert.match(resposta.text, /action="\/logout" method="post"/);
  assert.doesNotMatch(resposta.text, /href="\/(administracao|login)"/);
  assert.doesNotMatch(resposta.text, /aluno123|senhaHash/);
});

test("visitante é redirecionado ao tentar abrir o painel", async () => {
  const resposta = await request(createApp()).get("/painel");
  assert.equal(resposta.status, 302);
  assert.equal(resposta.headers.location, "/login");
  await request(createApp()).get("/administracao").expect(302).expect("Location", "/login");
});

test("estudante recebe 403 ao tentar abrir a administração", async () => {
  const agente = request.agent(createApp());
  await agente.post("/login").type("form")
    .send({ email: "estudante@escola.test", senha: "aluno123" });
  const resposta = await agente.get("/administracao");
  assert.equal(resposta.status, 403);
});

test("administrador pode abrir a administração", async () => {
  const agente = request.agent(createApp());
  await agente.post("/login").type("form")
    .send({ email: "admin@escola.test", senha: "admin123" });
  const resposta = await agente.get("/administracao");
  assert.equal(resposta.status, 200);
  assert.match(resposta.text, /Administração/);
  assert.match(resposta.text, /href="\/administracao"/);
  await agente.get("/painel").expect(200);
});

test("logout encerra a sessão", async () => {
  const app = createApp();
  const agente = request.agent(app);
  const login = await agente.post("/login").type("form")
    .send({ email: "estudante@escola.test", senha: "aluno123" }).expect(302);
  const cookieAnterior = login.headers["set-cookie"][0].split(";")[0];
  const novoLogin = await agente.post("/login").type("form")
    .send({ email: "estudante@escola.test", senha: "aluno123" }).expect(302);
  const cookieAtual = novoLogin.headers["set-cookie"][0].split(";")[0];
  assert.notEqual(cookieAtual, cookieAnterior);
  await request(app).get("/painel").set("Cookie", cookieAnterior)
    .expect(302).expect("Location", "/login");
  await agente.get("/logout").expect(404);
  await agente.get("/painel").expect(200);
  const logout = await agente.post("/logout").expect(302);
  assert.match(logout.headers["set-cookie"][0], /^connect.sid=;/);
  assert.match(logout.headers["set-cookie"][0], /Expires=Thu, 01 Jan 1970/);
  await agente.get("/painel").expect(302).expect("Location", "/login");
  await request(app).get("/painel").set("Cookie", cookieAtual)
    .expect(302).expect("Location", "/login");
});
