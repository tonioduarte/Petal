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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
      site: usuario.site,
      foto: usuario.foto || null,
      capa: usuario.capa || null,
      atividades: usuario.atividades ? JSON.parse(usuario.atividades) : []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar dados do usuário.' });
  }
});

app.put('/api/me', precisaEstarLogado, async (req, res) => {
  try {
    const { nome, bio, atividades, foto, capa, usuario } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
    }

    const dadosParaAtualizar = {
      nome: nome.trim(),
      bio: bio ? bio.trim() : null,
      atividades: atividades ? JSON.stringify(atividades) : null,
    };

    if (foto !== undefined) dadosParaAtualizar.foto = foto;
    if (capa !== undefined) dadosParaAtualizar.capa = capa;

    if (usuario) {
      const usuarioLimpo = usuario.trim().replace(/@+/, '');

      if (usuarioLimpo.length < 3) {
        return res.status(400).json({ erro: 'O @ deve ter pelo menos 3 caracteres.' });
      }

      const existe = await knex('usuarios')
        .where({ usuario: usuarioLimpo })
        .whereNot({ id: req.session.userId })
        .first();

      if (existe) {
        return res.status(400).json({ erro: 'Esse @ já está em uso.' });
      }

      dadosParaAtualizar.usuario = usuarioLimpo;
    }

    await knex('usuarios')
      .where({ id: req.session.userId })
      .update(dadosParaAtualizar);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar perfil.' });
  }
});

// Listar coleções do usuário logado
app.get('/api/colecoes', precisaEstarLogado, async (req, res) => {
  try {
    const colecoes = await knex('colecoes')
      .where({ usuario_id: req.session.userId })
      .orderBy('created_at', 'desc');

    for (const col of colecoes) {
      const fotos = await knex('colecao_fotos')
        .where({ colecao_id: col.id })
        .orderBy('created_at', 'asc');
      col.fotos = fotos;
    }

    res.json(colecoes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar coleções.' });
  }
});

// Criar coleção
app.post('/api/colecoes', precisaEstarLogado, async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ erro: 'O nome da coleção é obrigatório.' });
    }

    const [id] = await knex('colecoes').insert({
      usuario_id: req.session.userId,
      nome: nome.trim(),
      descricao: descricao ? descricao.trim() : null
    });

    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar coleção.' });
  }
});

// Deletar coleção
app.delete('/api/colecoes/:id', precisaEstarLogado, async (req, res) => {
  try {
    const colecao = await knex('colecoes')
      .where({ id: req.params.id, usuario_id: req.session.userId })
      .first();

    if (!colecao) return res.status(404).json({ erro: 'Coleção não encontrada.' });

    await knex('colecoes').where({ id: req.params.id }).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao deletar coleção.' });
  }
});

// Adicionar foto à coleção
app.post('/api/colecoes/:id/fotos', precisaEstarLogado, async (req, res) => {
  try {
    const colecao = await knex('colecoes')
      .where({ id: req.params.id, usuario_id: req.session.userId })
      .first();

    if (!colecao) return res.status(404).json({ erro: 'Coleção não encontrada.' });

    const { foto, titulo } = req.body;
    if (!foto) return res.status(400).json({ erro: 'Foto obrigatória.' });

    const [id] = await knex('colecao_fotos').insert({
      colecao_id: req.params.id,
      foto,
      titulo: titulo || null
    });

    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao adicionar foto.' });
  }
});

// Deletar foto da coleção
app.delete('/api/colecoes/:colecaoId/fotos/:fotoId', precisaEstarLogado, async (req, res) => {
  try {
    const colecao = await knex('colecoes')
      .where({ id: req.params.colecaoId, usuario_id: req.session.userId })
      .first();

    if (!colecao) return res.status(404).json({ erro: 'Coleção não encontrada.' });

    await knex('colecao_fotos').where({ id: req.params.fotoId }).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao deletar foto.' });
  }
});

// Listar posts (todos podem ver)
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await knex('posts')
      .join('usuarios', 'posts.usuario_id', 'usuarios.id')
      .select(
        'posts.id',
        'posts.legenda',
        'posts.imagem',
        'posts.created_at',
        'usuarios.id as autor_id',
        'usuarios.nome as autor_nome',
        'usuarios.usuario as autor_usuario',
        'usuarios.foto as autor_foto'
      )
      .orderBy('posts.created_at', 'desc');

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar posts.' });
  }
});

// Listar posts de um usuário específico
app.get('/api/posts/usuario/:id', async (req, res) => {
  try {
    const posts = await knex('posts')
      .join('usuarios', 'posts.usuario_id', 'usuarios.id')
      .select(
        'posts.id',
        'posts.legenda',
        'posts.imagem',
        'posts.created_at',
        'usuarios.id as autor_id',
        'usuarios.nome as autor_nome',
        'usuarios.usuario as autor_usuario',
        'usuarios.foto as autor_foto'
      )
      .where('posts.usuario_id', req.params.id)
      .orderBy('posts.created_at', 'desc');

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar posts.' });
  }
});

// Criar post
app.post('/api/posts', precisaEstarLogado, async (req, res) => {
  try {
    const { legenda, imagem } = req.body;

    if (!legenda && !imagem) {
      return res.status(400).json({ erro: 'O post precisa ter texto ou imagem.' });
    }

    const [id] = await knex('posts').insert({
      usuario_id: req.session.userId,
      legenda: legenda || null,
      imagem: imagem || null
    });

    const post = await knex('posts')
      .join('usuarios', 'posts.usuario_id', 'usuarios.id')
      .select(
        'posts.id',
        'posts.legenda',
        'posts.imagem',
        'posts.created_at',
        'usuarios.id as autor_id',
        'usuarios.nome as autor_nome',
        'usuarios.usuario as autor_usuario',
        'usuarios.foto as autor_foto'
      )
      .where('posts.id', id)
      .first();

    res.status(201).json({ ok: true, post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar post.' });
  }
});

// Deletar post
app.delete('/api/posts/:id', precisaEstarLogado, async (req, res) => {
  try {
    const post = await knex('posts')
      .where({ id: req.params.id, usuario_id: req.session.userId })
      .first();

    if (!post) return res.status(404).json({ erro: 'Post não encontrado.' });

    await knex('posts').where({ id: req.params.id }).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao deletar post.' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✨ Servidor Petal rodando em http://localhost:${PORT}`);
});