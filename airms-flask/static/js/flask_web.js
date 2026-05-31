(() => {
  const forms = document.querySelectorAll('[data-api-form]');
  forms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const target = form.getAttribute('data-target');
      const result = document.getElementById(target);
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const res = await fetch(form.action, { method: form.method || 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
        const json = await res.json();
        if (result) result.textContent = JSON.stringify(json, null, 2);
      } catch (err) {
        if (result) result.textContent = String(err);
      }
    });
  });
})();
