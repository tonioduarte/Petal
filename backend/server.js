const express = require('express');
const session = require('express-session');
const Knex = require('knex');
const knexConfig = require('./knexfile').development;
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
const knex = Knex(knexConfig);

app.set('trust proxy', 1);

app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

app.use(session({
  name: 'petal_session',
  secret: 'petal-segredinho-bem-guardado',
  resave: true,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

function precisaEstarLogado(req, res, next) {
  console.log("-> Verificando sessão. ID do Usuário ativo:", req.session.userId);
  
  if (!req.session.userId) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }
  next();
}

app.get('/', (req, res) => {
  res.send('API Petal funcionando ✨');
});

app.post('/api/cadastro', async (req, res) => {
  try {
    const { nome, usuario, email, parseInt, senha, tipo_artista, bio } = req.body;

    if (!nome || !usuario || !email || !senha) {
      return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });
    }

    const existenteEmail = await knex('usuarios').where({ email }).first();
    if (existenteEmail) {
      return res.status(400).json({ erro: 'E-mail já cadastrado.' });
    }

    const existenteUsuario = await knex('usuarios').where({ usuario }).first();
    if (existenteUsuario) {
      return res.status(400).json({ erro: 'Nome de usuário já em uso.' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const [id] = await knex('usuarios').insert({
      nome,
      usuario,
      email,
      senha_hash,
      tipo_artista: tipo_artista || null,
      bio: bio || null
    });

    req.session.userId = id;

    res.status(201).json({
      ok: true,
      usuario: {
        id,
        nome,
        usuario,
        email,
        tipo_artista,
        bio
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { emailOuUsuario, senha } = req.body;

    if (!emailOuUsuario || !senha) {
      return res.status(400).json({ erro: 'Informe e-mail/usuário e senha.' });
    }

    const usuario = await knex('usuarios')
      .where({ email: emailOuUsuario })
      .orWhere({ usuario: emailOuUsuario })
      .first();

    if (!usuario) {
      return res.status(400).json({ erro: 'Usuário ou senha inválidos.' });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaConfere) {
      return res.status(400).json({ erro: 'Usuário ou senha inválidos.' });
    }

    req.session.userId = usuario.id;

    res.json({
      ok: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        usuario: usuario.usuario,
        email: usuario.email,
        tipo_artista: usuario.tipo_artista,
        bio: usuario.bio
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao fazer login.' });
  }
});

app.get('/api/me', precisaEstarLogado, async (req, res) => {
  try {
    const usuario = await knex('usuarios')
      .where({ id: req.session.userId })
      .first();

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    res.json({
      id: usuario.id,
      nome: usuario.nome,
      usuario: usuario.usuario,
      email: usuario.email,
      tipo_artista: usuario.tipo_artista,
      bio: usuario.bio,
      localizacao: usuario.localizacao,
      site: usuario.site
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar dados do usuário.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('petal_session');
    res.json({ ok: true });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});