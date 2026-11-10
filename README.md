# Portal Acadêmico

Aplicação didática de autenticação local, sessões e autorização por perfil em um
Portal Acadêmico. A camada de segurança protege o painel, restringe a
administração a administradores e adapta a navegação ao estado do usuário.

## Instalação e configuração

Requer Node.js 18 ou superior e npm.

No terminal, entre na pasta do projeto:

```bash
cd portal-academico
```

Depois instale as dependências e crie a configuração local:

```bash
npm install
cp .env.example .env
```

Edite o `.env` conforme necessário:

- `PORT`: porta HTTP (por padrão, `3000`);
- `SESSION_SECRET`: segredo longo e aleatório usado para assinar o cookie da sessão;
  substitua o valor didático e não versione o `.env`;
- `DATABASE_STORAGE`: caminho do banco SQLite.

## Execução

```bash
npm start
```

Acesse `http://localhost:3000`. O caminho completo é:

1. `server.js` carrega o `.env`, prepara o banco e inicia o servidor;
2. `app.js` configura Express, sessões, arquivos públicos e rotas;
3. as rotas renderizam as páginas ou aplicam as regras de segurança.

Para desenvolvimento, use `npm run dev`. Em produção, o cookie exige HTTPS
(`NODE_ENV=production`).

## Função de cada parte

- `server.js`: ponto de entrada; conecta ao banco, cria as contas didáticas e
  inicia o servidor.
- `app.js`: monta a aplicação Express, configura Handlebars, sessão, arquivos
  públicos e tratamento de erros.
- `models/`: define o acesso aos usuários no SQLite.
- `routes/autenticacao.js`: mostra o login, valida credenciais e executa o
  logout.
- `routes/paginas.js`: define painel, administração e rota de saúde.
- `middlewares/autorizacao.js`: compartilha o usuário com as views e bloqueia
  acessos sem autenticação ou sem perfil.
- `views/`: contém as páginas HTML renderizadas pelo Handlebars.
- `public/stylesheets/`: contém o CSS da interface.
- `test/interface.test.js`: verifica o fluxo de autenticação e autorização.

## Contas didáticas

- estudante@escola.test / aluno123
- admin@escola.test / admin123

As contas são criadas na primeira execução somente quando não existem usuários
no banco. O banco existente é preservado.

## Fluxo de autenticação

Envie e-mail e senha para `POST /login`. O usuário é localizado pelo e-mail,
a senha é comparada com `bcrypt.compare()` e, em caso de sucesso, a sessão é
regenerada antes de guardar somente os dados públicos do usuário. Credenciais
inválidas, ou uma conta inativa, retornam HTTP 401. A sessão é salva antes do
redirecionamento para `/painel` e não contém senha nem hash. O navegador recebe
apenas o identificador assinado no cookie `connect.sid`, com `HttpOnly` e
`SameSite=Lax`.

## Rotas e autorização

- `GET /`: redireciona para `/login`;
- `GET /login` e `POST /login`: autenticação pública;
- `GET /saude`: verificação pública do serviço;
- `GET /painel`: exige autenticação e redireciona visitantes para `/login`;
- `GET /administracao`: exige autenticação e o perfil `administrador`;
- `POST /logout`: destrói a sessão e remove o cookie `connect.sid`.

Estudantes autenticados podem acessar o painel e recebem HTTP 403 na
administração. Administradores podem acessar as duas áreas. O cabeçalho exibe
Login para visitantes, e para usuários autenticados exibe Painel, o link de
Administração quando aplicável. O botão vermelho Sair fica no painel e envia
o formulário de logout por POST.

## Testes

```bash
npm test
```

Os sete testes estão habilitados e usam um banco SQLite em memória, sem alterar
o banco da aplicação. Verificam também credenciais inválidas, navegação por
perfil, regeneração da sessão e rejeição de cookies antigos após o logout.

As sessões ficam no MemoryStore do `express-session` e são perdidas ao reiniciar
o processo. Esse armazenamento serve apenas para fins didáticos; ele não é
adequado para múltiplos processos ou produção. Para esses cenários, configure
um armazenamento de sessões compartilhado e persistente.
