(() => {
  'use strict';

  const form = document.getElementById('form-reserva');
  if (!form) return;

  // Número em formato internacional: código do país + número, sem "+" ou espaços.
  const WHATSAPP_NUMBER = '258869005050';
  const quantityFields = ['regia', 'bailarina', 'millettia'];
  const prices = { regia: 100, bailarina: 100, millettia: 100 };

  const totalElement = document.getElementById('total-mudas');
  const valueElement = document.getElementById('valor-estimado');
  const message = document.getElementById('mensagem-formulario');
  const dateInput = form.elements.data_recebimento;
  const submitButton = document.getElementById('botao-submeter');

  const money = value =>
    new Intl.NumberFormat('pt-MZ').format(value) + ' MT';

  function todayISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (dateInput) {
    dateInput.min = todayISO();
    if (!dateInput.value) dateInput.value = todayISO();
  }

  function getQuantities() {
    return Object.fromEntries(quantityFields.map(field => {
      const raw = Number.parseInt(form.elements[field].value, 10);
      const quantity = Number.isFinite(raw) ? Math.max(0, Math.min(10000, raw)) : 0;
      return [field, quantity];
    }));
  }

  function updateSummary() {
    const quantities = getQuantities();
    const total = Object.values(quantities).reduce((sum, value) => sum + value, 0);
    const estimated = quantityFields.reduce(
      (sum, field) => sum + quantities[field] * prices[field], 0
    );

    if (totalElement) totalElement.textContent = `Total de mudas: ${total}`;
    if (valueElement) valueElement.textContent = `Valor estimado: ${money(estimated)}`;
    return { quantities, total, estimated };
  }

  quantityFields.forEach(field => {
    const input = form.elements[field];
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '').slice(0, 5);
      updateSummary();
    });
  });

  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= todayISO();
  }

  if (dateInput) {
    dateInput.addEventListener('change', () => {
      dateInput.setCustomValidity(
        validDate(dateInput.value) ? '' : 'Seleccione uma data válida de hoje em diante.'
      );
    });
  }

  form.elements.telefone.addEventListener('input', event => {
    event.target.value = event.target.value.replace(/[^0-9]/g, '').slice(0, 15);
  });

  ['nome', 'localidade', 'referencia'].forEach(field => {
    form.elements[field].addEventListener('input', event => {
      event.target.value = event.target.value
        .replace(/[0-9]/g, '')
        .toLocaleUpperCase('pt-MZ');
    });
  });

  updateSummary();

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (message) {
      message.textContent = '';
      message.className = 'mensagem-formulario';
    }

    if (dateInput) {
      dateInput.setCustomValidity(
        validDate(dateInput.value) ? '' : 'Seleccione uma data válida de hoje em diante.'
      );
    }
    if (!form.reportValidity()) return;

    const { quantities, total, estimated } = updateSummary();
    if (total === 0) {
      if (message) {
        message.textContent = 'Seleccione pelo menos uma muda para efectuar a reserva.';
        message.classList.add('erro');
      }
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const whatsappText = [
      'Olá, Artora Mudas! Pretendo efectuar uma reserva:',
      '',
      `Nome: ${data.nome}`,
      `Contacto: ${data.telefone}`,
      `Localidade/Bairro: ${data.localidade || 'Não indicado'}`,
      `Próximo de: ${data.referencia || 'Não indicado'}`,
      `Data pretendida para receber: ${data.data_recebimento ? data.data_recebimento.split('-').reverse().join('/') : 'Não indicada'}`,
      '',
      `Régia: ${quantities.regia} muda(s)`,
      `Bailarina: ${quantities.bailarina} muda(s)`,
      `Millettia: ${quantities.millettia} muda(s)`,
      '',
      `TOTAL DE MUDAS: ${total}`,
      `VALOR ESTIMADO: ${money(estimated)}`
    ].join('\n');

    const whatsappUrl =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`;

    // Abrir directamente a partir do clique do utilizador ajuda a evitar bloqueios.
    const whatsappWindow = window.open(whatsappUrl, '_blank');

    // Se o navegador bloquear a nova janela, usar a mesma aba como alternativa.
    if (!whatsappWindow) {
      window.location.href = whatsappUrl;
    } else {
      try { whatsappWindow.opener = null; } catch (_) {}
      if (message) {
        message.textContent =
          'A mensagem foi preparada no WhatsApp. Reveja os dados e carregue em Enviar para concluir a reserva.';
        message.classList.add('sucesso');
      }
    }
  });
})();
