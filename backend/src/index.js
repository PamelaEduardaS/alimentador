require('dotenv').config();  // Carrega as variáveis do arquivo .env
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg'); // Importar a biblioteca pg para conectar ao PostgreSQL

const app = express();

app.use(cors());              // Permite requisições de outras origens (frontend)
app.use(express.json());      // Para interpretar JSON no corpo das requisições

const PORT = process.env.PORT || 3000;

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,  // Endereço do banco de dados
  port: process.env.DB_PORT,  // Porta do banco de dados
  user: process.env.DB_USER,  // Usuário do banco de dados
  password: process.env.DB_PASSWORD, // Senha do banco de dados
  database: process.env.DB_DATABASE, // Nome do banco de dados
  schema: 'public',  // Especificando o schema 'public' (se necessário)
});

// Teste de conexão com o banco de dados
pool.connect()
  .then(() => {
    console.log('Conexão com o banco de dados PostgreSQL bem-sucedida!');
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
  });

// Middleware para verificar o token JWT
function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(403).json({ message: 'Token não fornecido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = decoded;  // Salva o payload do token no req.user
    next();  // Chama a próxima função
  });
}

// Rota de autenticação (login)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Busca o usuário no banco de dados
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    // Verifica se a senha é válida (aqui seria necessário usar algo como bcrypt para comparar as senhas de forma segura)
    if (password === user.senha) {  // Para produção, use bcrypt.compare() aqui
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      return res.json({ message: 'Login bem-sucedido', token });
    }

    res.status(401).json({ message: 'Credenciais inválidas' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Rota para obter o nível de ração (protegida por autenticação)
app.get('/api/food-level', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT nivel FROM nivel_racao ORDER BY atualizado_em DESC LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nível de ração não encontrado' });
    }
    res.json({ level: result.rows[0].nivel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar o nível de ração' });
  }
});

// Rota para liberar ração (protegida por autenticação)
app.post('/api/feed', authenticateToken, async (req, res) => {
  try {
    // Obter o nível atual de ração
    const result = await pool.query('SELECT nivel FROM nivel_racao ORDER BY atualizado_em DESC LIMIT 1');
    let currentFoodLevel = result.rows[0]?.nivel || 0;

    if (currentFoodLevel <= 0) {
      return res.status(400).json({ message: 'Nível de ração insuficiente!' });
    }

    currentFoodLevel -= 10;
    if (currentFoodLevel < 0) currentFoodLevel = 0;

    // Atualizar o nível de ração na tabela
    await pool.query('INSERT INTO nivel_racao (nivel) VALUES($1)', [currentFoodLevel]);

    res.json({ message: 'Ração liberada com sucesso!', level: currentFoodLevel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao liberar ração' });
  }
});

// Rota para adicionar horário programado
app.post('/api/schedules', authenticateToken, async (req, res) => {
  const { schedule_time } = req.body;

  if (!schedule_time) {
    return res.status(400).json({ message: 'Horário não informado!' });
  }

  try {
    await pool.query('INSERT INTO horarios_programados (horario) VALUES($1)', [schedule_time]);
    res.json({ message: 'Horário programado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao adicionar horário' });
  }
});

// Rota para listar horários programados
app.get('/api/schedules', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM horarios_programados ORDER BY horario ASC');
    res.json({ schedules: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar horários programados' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
