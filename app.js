const path = require("node:path");
const express = require("express");
const { engine } = require("express-handlebars");
const session = require("express-session");

const autenticacaoRouter = require("./routes/autenticacao");
const paginasRouter = require("./routes/paginas");
const { compartilharUsuario } = require("./middlewares/autorizacao");

function createApp() {
  const app = express();

  // Configura o Handlebars para renderizar as páginas .hbs.
  app.engine("hbs", engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views", "layouts"),
    partialsDir: path.join(__dirname, "views", "partials")
  }));
  app.set("view engine", "hbs");
  app.set("views", path.join(__dirname, "views"));

  // Lê formulários, JSON e arquivos públicos antes das rotas.
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  // Mantém o usuário autenticado entre as requisições.
  app.use(session({
    secret: process.env.SESSION_SECRET || "segredo-didatico-do-portal",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  }));
  // Disponibiliza o usuário atual para as rotas e os templates.
  app.use(compartilharUsuario);
  app.use(autenticacaoRouter);
  app.use(paginasRouter);

  app.use((req, res) => res.status(404).send("Página não encontrada."));
  app.use((erro, req, res, next) => {
    console.error(erro);
    if (res.headersSent) return next(erro);
    return res.status(500).send("Falha inesperada.");
  });

  return app;
}

module.exports = { createApp };
