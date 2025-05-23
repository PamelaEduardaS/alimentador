(() => {
    'use strict';
  
    const foodLevelBar = document.getElementById('foodLevelBar');
    const foodLevelStatus = document.getElementById('foodLevelStatus');
    const btnFeedNow = document.getElementById('btnFeedNow');
    const feedResult = document.getElementById('feedResult');
    const scheduleList = document.getElementById('scheduleList');
  
    // Simulação do nível de ração (%)
    let currentFoodLevel = 75;
  
    // Simulação da lista de horários (horário no formato HH:mm)
    const feedingSchedules = ['08:00', '12:00', '18:00'];
  
    // Atualiza a barra de progresso e texto
    function updateFoodLevel() {
      foodLevelBar.style.width = currentFoodLevel + '%';
      foodLevelBar.setAttribute('aria-valuenow', currentFoodLevel);
      foodLevelBar.textContent = currentFoodLevel + '%';
  
      if (currentFoodLevel < 20) {
        foodLevelBar.classList.remove('bg-success');
        foodLevelBar.classList.add('bg-danger');
        foodLevelStatus.textContent = 'Nível crítico! Reabasteça a ração.';
        foodLevelStatus.classList.add('text-danger');
      } else {
        foodLevelBar.classList.remove('bg-danger');
        foodLevelBar.classList.add('bg-success');
        foodLevelStatus.textContent = 'Nível suficiente.';
        foodLevelStatus.classList.remove('text-danger');
      }
    }
  
    // Renderiza os horários na lista
    function renderSchedules() {
      scheduleList.innerHTML = '';
      feedingSchedules.forEach((time) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = time;
        // Pode adicionar botão ou ícone para editar/excluir futuramente
        scheduleList.appendChild(li);
      });
    }
  
    // Ação do botão liberar ração
    btnFeedNow.addEventListener('click', () => {
      if (currentFoodLevel <= 0) {
        feedResult.textContent = 'Nível de ração muito baixo para liberar!';
        feedResult.className = 'alert alert-danger';
        feedResult.classList.remove('d-none');
        return;
      }
  
      // Simula liberar ração e diminuir o nível
      currentFoodLevel -= 10;
      if (currentFoodLevel < 0) currentFoodLevel = 0;
  
      updateFoodLevel();
  
      feedResult.textContent = 'Ração liberada com sucesso!';
      feedResult.className = 'alert alert-success';
      feedResult.classList.remove('d-none');
    });
  
    // Inicialização
    updateFoodLevel();
    renderSchedules();
  })();
  