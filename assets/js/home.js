(() => {
  'use strict';

  const foodLevelBar = document.getElementById('foodLevelBar');
  const foodLevelStatus = document.getElementById('foodLevelStatus');
  const btnFeedNow = document.getElementById('btnFeedNow');
  const feedResult = document.getElementById('feedResult');

  const scheduleList = document.getElementById('scheduleList');
  const scheduleForm = document.getElementById('scheduleForm');
  const scheduleTimeInput = document.getElementById('scheduleTime');
  const saveScheduleBtn = document.getElementById('saveScheduleBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  // Estado do nível de ração
  let currentFoodLevel = 0;

  // Lista de horários (array de strings ISO)
  let feedingSchedules = [];

  // Índice do horário que está sendo editado (null se não estiver editando)
  let editIndex = null;

  // Inicializar Flatpickr no input
  flatpickr(scheduleTimeInput, {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
  });

  // Atualiza a barra de nível da ração e o texto
  function updateFoodLevel(level) {
    foodLevelBar.style.width = level + '%';
    foodLevelBar.setAttribute('aria-valuenow', level);
    foodLevelBar.textContent = level + '%';

    if (level < 20) {
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

  // Renderiza a lista de horários
  function renderSchedules() {
    scheduleList.innerHTML = '';
    feedingSchedules.forEach((datetime, index) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';

      // Exibe data e hora formatadas
      li.textContent = datetime.replace('T', ' ').substring(0, 16);

      // Botões de editar e excluir
      const btnGroup = document.createElement('div');

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-sm btn-warning me-2';
      editBtn.textContent = 'Editar';
      editBtn.onclick = () => startEditSchedule(index);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-danger';
      deleteBtn.textContent = 'Excluir';
      deleteBtn.onclick = () => deleteSchedule(index);

      btnGroup.appendChild(editBtn);
      btnGroup.appendChild(deleteBtn);
      li.appendChild(btnGroup);

      scheduleList.appendChild(li);
    });
  }

  // Começa a edição de um horário
  function startEditSchedule(index) {
    editIndex = index;
    scheduleTimeInput._flatpickr.setDate(feedingSchedules[index]);
    saveScheduleBtn.textContent = 'Atualizar';
    cancelEditBtn.classList.remove('d-none');
  }

  // Cancela edição
  cancelEditBtn.addEventListener('click', () => {
    editIndex = null;
    scheduleTimeInput.value = '';
    saveScheduleBtn.textContent = 'Salvar';
    cancelEditBtn.classList.add('d-none');
  });

  // Exclui um horário
  function deleteSchedule(index) {
    if (confirm('Deseja realmente excluir este horário?')) {
      feedingSchedules.splice(index, 1);
      if (editIndex === index) {
        cancelEditBtn.click(); // cancela edição se estiver editando esse horário
      }
      renderSchedules();
    }
  }

  // Envio do formulário para adicionar/editar horário
  scheduleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const datetime = scheduleTimeInput.value;
    if (!datetime) {
      alert('Por favor, selecione data e hora.');
      return;
    }

    if (editIndex === null) {
      feedingSchedules.push(datetime);
    } else {
      feedingSchedules[editIndex] = datetime;
      editIndex = null;
      cancelEditBtn.classList.add('d-none');
      saveScheduleBtn.textContent = 'Salvar';
    }

    scheduleTimeInput.value = '';
    renderSchedules();
  });

  // Buscar nível da ração do backend
  async function fetchFoodLevel() {
    const token = localStorage.getItem('authToken'); // Recupera o token do localStorage
    if (!token) {
      alert('Você precisa estar autenticado!');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/food-level', {
        headers: {
          'Authorization': `Bearer ${token}`, // Envia o token no cabeçalho
        },
      });

      const data = await res.json();
      if (res.ok) {
        currentFoodLevel = data.level;
        updateFoodLevel(currentFoodLevel);
      } else {
        alert(data.message || 'Erro ao buscar o nível da ração');
      }
    } catch {
      feedResult.textContent = 'Erro ao buscar o nível da ração.';
      feedResult.className = 'alert alert-danger';
      feedResult.classList.remove('d-none');
    }
  }

  // Enviar comando para liberar ração
  async function feedNow() {
    const token = localStorage.getItem('authToken'); // Recupera o token do localStorage
    if (!token) {
      alert('Você precisa estar autenticado!');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Envia o token no cabeçalho
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro no servidor');
      }
      const data = await res.json();
      currentFoodLevel = data.level;
      updateFoodLevel(currentFoodLevel);
      feedResult.textContent = data.message;
      feedResult.className = 'alert alert-success';
      feedResult.classList.remove('d-none');
    } catch (error) {
      feedResult.textContent = error.message;
      feedResult.className = 'alert alert-danger';
      feedResult.classList.remove('d-none');
    }
  }

  btnFeedNow.addEventListener('click', feedNow);

  // Inicializações
  fetchFoodLevel();
  renderSchedules();

})();
