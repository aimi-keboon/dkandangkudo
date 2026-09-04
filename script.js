document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-alert]').forEach(btn => {
    btn.addEventListener('click', () => alert(btn.dataset.alert));
  });
});
