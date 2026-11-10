function compartilharUsuario(req, res, next) {
  // O template recebe null quando não existe uma sessão autenticada.
  res.locals.usuario = req.session?.usuario || null;
  next();
}

function exigirAutenticacao(req, res, next) {
  // Visitantes só podem continuar depois de fazer login.
  if (!req.session?.usuario) return res.redirect("/login");
  next();
}

function exigirPerfil(perfilPermitido) {
  return (req, res, next) => {
    // Primeiro exige login; depois confere o perfil salvo na sessão.
    if (!req.session?.usuario) return res.redirect("/login");
    if (req.session.usuario.perfil !== perfilPermitido) {
      return res.status(403).send("Acesso negado.");
    }
    next();
  };
}

module.exports = { compartilharUsuario, exigirAutenticacao, exigirPerfil };
