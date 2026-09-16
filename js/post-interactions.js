(function () {
  'use strict';

  const root = document.querySelector('.post-interactions');
  if (!root) return;

  const endpoint = root.dataset.reactionEndpoint;
  const buttons = Array.from(root.querySelectorAll('[data-reaction]'));
  const status = root.querySelector('.post-reactions__status');
  const postKey = window.location.pathname;
  const storageKey = 'ikn-reaction-visitor-id';

  function makeVisitorId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function getVisitorId() {
    let visitorId = window.localStorage.getItem(storageKey);
    if (!visitorId) {
      visitorId = makeVisitorId();
      window.localStorage.setItem(storageKey, visitorId);
    }
    return visitorId;
  }

  function setPending(pending) {
    buttons.forEach(button => {
      button.disabled = pending;
    });
  }

  function render(data) {
    root.querySelector('[data-reaction-count="1"]').textContent = String(data.up ?? 0);
    root.querySelector('[data-reaction-count="-1"]').textContent = String(data.down ?? 0);
    buttons.forEach(button => {
      const selected = Number(button.dataset.reaction) === Number(data.mine);
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  async function request(options) {
    const url = new URL(endpoint);
    const visitorId = getVisitorId();
    const init = options || {};

    if (!init.method || init.method === 'GET') {
      url.searchParams.set('post', postKey);
      url.searchParams.set('visitor', visitorId);
    }

    const response = await window.fetch(url.toString(), init);
    if (!response.ok) throw new Error(`Reaction API returned ${response.status}`);
    return response.json();
  }

  async function load() {
    if (!endpoint) return;
    try {
      render(await request());
    } catch (error) {
      status.textContent = '互动数据暂时不可用';
      console.warn(error);
    }
  }

  buttons.forEach(button => {
    button.addEventListener('click', async event => {
      // Keep the site's existing click-heart effect everywhere except these controls.
      event.stopPropagation();
      const current = button.getAttribute('aria-pressed') === 'true';
      const reaction = current ? 0 : Number(button.dataset.reaction);

      setPending(true);
      status.textContent = '';
      try {
        const data = await request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post: postKey, visitor: getVisitorId(), reaction })
        });
        render(data);
        status.textContent = reaction === 0 ? '已取消' : '已记录';
      } catch (error) {
        status.textContent = '提交失败，请稍后再试';
        console.warn(error);
      } finally {
        setPending(false);
      }
    });
  });

  load();
})();
