(() => {
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  if (header && menuButton) {
    menuButton.addEventListener('click', () => {
      const isOpen = header.classList.toggle('menu-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.textContent = isOpen ? '关闭' : '菜单';
    });
  }

  const modal = document.querySelector('.download-modal');
  const platformName = document.querySelector('.platform-name');
  const feedback = document.querySelector('.modal-feedback');
  const openModal = (platform) => {
    if (!modal) return;
    if (platformName) platformName.textContent = platform;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  };
  document.querySelectorAll('.open-download').forEach((button) => button.addEventListener('click', () => openModal(button.dataset.platform || '桌面端')));
  document.querySelectorAll('.modal-close').forEach((button) => button.addEventListener('click', closeModal));
  modal?.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  document.querySelectorAll('.platform-actions button').forEach((button) => button.addEventListener('click', () => {
    if (feedback) feedback.textContent = `${button.dataset.platform || button.textContent} Early Access 已登记，我们会在发布时通知你。`;
  }));
  document.querySelectorAll('.access-form, .newsletter-form').forEach((form) => form.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = form.querySelector('small') || feedback;
    if (message) message.textContent = '已收到。我们会在下一次产品更新时联系你。';
    form.reset();
  }));
  document.querySelectorAll('.faq-item').forEach((item) => item.addEventListener('click', () => item.classList.toggle('is-open')));
})();
