const express = require("express");
const bcrypt = require("bcryptjs");
const { Usuario } = require("../models");
const router = express.Router();

router.get("/login", (req, res) => {
  // Exibe o formulário de entrada.
  res.render("login", { titulo: "Entrar", mensagem: req.query.mensagem });
});

router.post("/login", async (req, res, next) => {
  try {
    // Normaliza o e-mail e evita comparar senha em texto puro.
    const email = String(req.body.email || "").trim().toLowerCase();
    const senha = String(req.body.senha || "");
    const usuario = await Usuario.findOne({ where: { email } });
    const senhaValida = usuario
      ? await bcrypt.compare(senha, usuario.senhaHash)
      : false;

    if (!usuario || !usuario.ativo || !senhaValida) {
      // Não informa se o erro foi no e-mail ou na senha.
      return res.status(401).render("login", {
        titulo: "Entrar",
        erro: "E-mail ou senha inválidos.",
        email
      });
    }

    // Troca o identificador da sessão para evitar fixação de sessão.
    await new Promise((resolve, reject) => {
      req.session.regenerate((erro) => erro ? reject(erro) : resolve());
    });
    // Guarda somente informações necessárias para a interface.
    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ehAdministrador: usuario.perfil === "administrador"
    };
    await new Promise((resolve, reject) => {
      req.session.save((erro) => erro ? reject(erro) : resolve());
    });
    return res.redirect("/painel");
  } catch (erro) {
    return next(erro);
  }
});

router.post("/logout", (req, res, next) => {
  // Destrói a sessão e remove o cookie do navegador.
  req.session.destroy((erro) => {
    if (erro) return next(erro);
    res.clearCookie("connect.sid");
    return res.redirect("/login?mensagem=Logout+realizado");
  });
});

module.exports = router;
