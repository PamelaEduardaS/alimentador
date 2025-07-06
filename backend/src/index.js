require('dotenv').config();  // Carrega as variáveis do arquivo .env
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');  // Importa o bcrypt para criptografar a senha
const { Pool } = require('pg'); // Importar a biblioteca pg para conectar ao PostgreSQL
const axios = require('axios'); 
const app = express();

app.use(cors());              // Permite requisições de outras origens (frontend)
app.use(express.json());      // Para interpretar JSON no corpo das requisições

const PORT = process.env.PORT || 3000;

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
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
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    // Verifica se a senha é válida (compara a senha armazenada com a senha informada)
    const isValidPassword = await bcrypt.compare(password, user.senha);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.json({ message: 'Login bem-sucedido', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Rota para registrar um novo usuário
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
  }

  try {
    // Verifica se o e-mail já está registrado
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });
    }

    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);  // Gera o salt
    const hashedPassword = await bcrypt.hash(password, salt);  // Criptografa a senha

    // Insere o novo usuário no banco de dados
    await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: 'Usuário registrado com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
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
    const result = await pool.query('SELECT nivel FROM nivel_racao ORDER BY atualizado_em DESC LIMIT 1');
    let currentFoodLevel = result.rows[0]?.nivel || 0;

    if (currentFoodLevel <= 0) {
      return res.status(400).json({ message: 'Nível de ração insuficiente!' });
    }

    currentFoodLevel -= 10;
    if (currentFoodLevel < 0) currentFoodLevel = 0;

    await pool.query('INSERT INTO nivel_racao (nivel) VALUES($1)', [currentFoodLevel]);

    // Envia o comando para o ESP32 via HTTP para girar o servo motor
    const esp32Ip = 'http://192.168.86.8/liberar';  // IP do ESP32
    await axios.get(esp32Ip);  // Envia a requisição para liberar a ração no ESP32

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
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhum horário encontrado' });
    }
    res.json({ schedules: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar horários programados' });
  }
});

// Rota para atualizar horário programado
app.put('/api/schedules', authenticateToken, async (req, res) => {
  const { schedule_time, id } = req.body;

  if (!schedule_time || !id) {
    return res.status(400).json({ message: 'Horário ou ID não informados!' });
  }

  try {
    const result = await pool.query('SELECT * FROM horarios_programados WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Horário não encontrado para atualização!' });
    }

    await pool.query('UPDATE horarios_programados SET horario = $1 WHERE id = $2', [schedule_time, id]);

    res.json({ message: 'Horário atualizado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar horário' });
  }
});

// Rota para excluir horário programado
app.delete('/api/schedules/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'ID não informado!' });
  }

  try {
    await pool.query('DELETE FROM horarios_programados WHERE id = $1', [id]);
    res.json({ message: 'Horário excluído com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir horário' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
