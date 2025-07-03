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

  // Lista de horários (array de objetos de horário com id)
  let feedingSchedules = [];

  // Índice do horário que está sendo editado (null se não estiver editando)
  let editIndex = null;

  // Inicializar Flatpickr no input
  flatpickr(scheduleTimeInput, {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
  });

  // Função para buscar o nível da ração do backend
  async function fetchFoodLevel() {
    const token = localStorage.getItem('authToken'); // Recupera o token do localStorage
 //   console.log("Token: ", token);
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

  // Atualiza a barra de nível da ração e o texto
  function updateFoodLevel(level) {
   // console.log("Atualizando o nível da ração para:", level);
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
    feedingSchedules.forEach((schedule, index) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';

      // Exibe data e hora formatadas
      const formattedDate = new Date(schedule.horario).toLocaleString('pt-BR', {
        timeZone: 'UTC',
      });

      li.textContent = formattedDate; // Exibe a data formatada

      // Botões de editar e excluir
      const btnGroup = document.createElement('div');

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-sm btn-warning me-2';
      editBtn.textContent = 'Editar';
      editBtn.onclick = () => startEditSchedule(schedule.id);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-danger';
      deleteBtn.textContent = 'Excluir';
      deleteBtn.onclick = () => deleteSchedule(schedule.id);

      btnGroup.appendChild(editBtn);
      btnGroup.appendChild(deleteBtn);
      li.appendChild(btnGroup);

      scheduleList.appendChild(li);
    });
  }

  // Começa a edição de um horário
  function startEditSchedule(id) {
    const schedule = feedingSchedules.find(schedule => schedule.id === id);
    editIndex = feedingSchedules.indexOf(schedule);  // encontra o índice do horário
    scheduleTimeInput._flatpickr.setDate(schedule.horario);
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
  function deleteSchedule(id) {
    if (confirm('Deseja realmente excluir este horário?')) {
      feedingSchedules = feedingSchedules.filter(schedule => schedule.id !== id);
      renderSchedules();
      deleteScheduleFromBackend(id);
    }
  }

  // Função para excluir horário do backend
  async function deleteScheduleFromBackend(id) {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Você precisa estar autenticado!');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/schedules/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        alert('Horário excluído com sucesso!');
      } else {
        alert(data.message || 'Erro ao excluir horário');
      }
    } catch (error) {
      console.error('Erro ao excluir horário:', error);
      alert('Erro ao excluir horário');
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
      addSchedule(datetime); // Se não estiver editando, envia para adicionar
    } else {
      feedingSchedules[editIndex].horario = datetime; // Atualiza diretamente no array
      editIndex = null;
      cancelEditBtn.classList.add('d-none');
      saveScheduleBtn.textContent = 'Salvar';
      updateScheduleOnBackend(datetime); // Atualiza o backend
    }

    scheduleTimeInput.value = '';
    renderSchedules();
  });

  // Função para adicionar horário no backend
  async function addSchedule(scheduleTime) {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Você precisa estar autenticado!');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ schedule_time: scheduleTime }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchSchedules(); // Atualiza a lista de horários após adicionar
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Erro ao adicionar horário:', error);
      alert('Erro ao adicionar horário');
    }
  }

  // Função para atualizar horário no backend
  async function updateScheduleOnBackend(datetime) {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Você precisa estar autenticado!');
      return;
    }

    const schedule = feedingSchedules[editIndex];
    if (!schedule || !schedule.id) {
      alert('Horário não encontrado para atualização!');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ schedule_time: datetime }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchSchedules(); // Atualiza a lista de horários após atualizar
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Erro ao atualizar horário:', error);
      alert('Erro ao atualizar horário');
    }
  }

  // Buscar horários programados do backend
  async function fetchSchedules() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Você precisa estar autenticado!');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/schedules', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        feedingSchedules = data.schedules;
        renderSchedules(); // Atualiza a renderização com os dados recebidos
      } else {
        alert(data.message || 'Erro ao buscar horários');
      }
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      alert('Erro ao buscar horários');
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
  fetchSchedules();

})();
