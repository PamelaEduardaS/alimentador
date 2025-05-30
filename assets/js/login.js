(() => {
    'use strict';

    console.log('login.js carregado!');

  
    const form = document.getElementById('loginForm');
  
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
  
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }
  
      //  chamada para o backend via fetch (simulado)
      const email = form.email.value.trim();
      const password = form.password.value.trim();
  
      // Simulação
      if (email === 'admin@admin.com' && password === 'admin') {
        // Redireciona para home.html 
        window.location.href = 'home.html';
      } else {
        alert('Email ou senha inválidos!');
      }
    });
  })();
  