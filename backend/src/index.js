// backend/src/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());              // Permite requisições de outras origens (frontend)
app.use(express.json());      // Para interpretar JSON no corpo das requisições

const PORT = process.env.PORT || 3000;

// Estado simulado do nível de ração
let foodLevel = 75;

// Rota raiz para teste rápido
app.get('/', (req, res) => {
  res.json({ message: 'API do Alimentador Automático funcionando!' });
});

// Rota para obter nível da ração
app.get('/api/food-level', (req, res) => {
  res.json({ level: foodLevel });
});

// Rota para liberar ração (diminuir nível)
app.post('/api/feed', (req, res) => {
  if (foodLevel <= 0) {
    return res.status(400).json({ message: 'Nível de ração insuficiente!' });
  }
  // Simula liberar ração e diminuir o nível
  foodLevel -= 10;
  if (foodLevel < 0) foodLevel = 0;
  res.json({ message: 'Ração liberada com sucesso!', level: foodLevel });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
