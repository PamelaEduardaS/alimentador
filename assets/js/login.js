(() => {
  'use strict';

  console.log('login.js carregado!');

  const form = document.getElementById('loginForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    // Captura os valores de email e senha
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    // Envia as credenciais para o backend via fetch
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Armazena o token JWT no localStorage
        localStorage.setItem('authToken', data.token);

        // Redireciona para a home.html
        window.location.href = 'home.html';
      } else {
        alert(data.message || 'Erro ao fazer login');
      }
    } catch (error) {
      alert('Erro de comunicação com o backend');
    }
  });
})();
