(() => {
  'use strict';

  const registerForm = document.getElementById('registerForm');
  const registerResult = document.getElementById('registerResult');
  const loadingMessage = document.getElementById('loadingMessage');     

  // Função para registrar usuário no backend
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita o envio padrão do formulário

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Valida se o e-mail é válido
    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailPattern.test(email)) {
      alert('Por favor, informe um e-mail válido!');
      return;
    }

    // Valida se as senhas coincidem
    if (password !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    // Exibe a mensagem de carregamento
    loadingMessage.classList.remove('d-none');

    // Envia a requisição para o backend
    try {
      const res = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        registerResult.textContent = 'Cadastro realizado com sucesso!';
        registerResult.className = 'alert alert-success';
        
        // Após 2 segundos, redireciona para a página de login
        setTimeout(() => {
          window.location.href = 'login.html';  // Redireciona para a tela de login
        }, 2000);  // 2000 milissegundos = 2 segundos
      } else {
        registerResult.textContent = data.message || 'Erro no cadastro.';
        registerResult.className = 'alert alert-danger';
      }

      registerResult.classList.remove('d-none');
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      registerResult.textContent = 'Erro no servidor.';
      registerResult.className = 'alert alert-danger';
      registerResult.classList.remove('d-none');
    } finally {
      // Esconde a mensagem de carregamento após o tempo de espera ou erro
      loadingMessage.classList.add('d-none');
    }
  });
})();
