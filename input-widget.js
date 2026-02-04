/**
 * GetInput Widget - Vanilla JS version
 * Inline text editing and commenting for landing pages
 *
 * Usage: Add <script src="input-widget.js"></script> before </body>
 */

(function() {
  // Only show on localhost or specified domains
  const ALLOWED_HOSTS = ['localhost', '127.0.0.1'];
  const host = window.location.hostname;
  if (!ALLOWED_HOSTS.some(h => host.includes(h))) return;

  let mode = 'idle'; // 'idle' | 'editing' | 'commenting'
  let activeElement = null;
  let originalText = '';
  let inputCount = 0;

  // Load saved input count
  const saved = JSON.parse(localStorage.getItem('page-input') || '[]');
  inputCount = saved.length;

  // Styles
  const styles = document.createElement('style');
  styles.textContent = `
    #input-widget {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #input-widget .iw-buttons {
      display: flex;
      gap: 8px;
    }
    #input-widget button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.15s, opacity 0.15s;
    }
    #input-widget button:hover {
      transform: translateY(-1px);
    }
    #input-widget .iw-edit {
      background: #d97706;
      color: white;
    }
    #input-widget .iw-comment {
      background: #2563eb;
      color: white;
    }
    #input-widget .iw-count {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #374151;
      color: #9ca3af;
      border-radius: 50%;
      font-size: 11px;
    }
    #input-widget .iw-panel {
      background: #111827;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      min-width: 200px;
    }
    #input-widget .iw-panel p {
      color: white;
      font-size: 13px;
      margin: 0 0 8px 0;
    }
    #input-widget .iw-panel .iw-hint {
      color: #9ca3af;
      font-size: 12px;
    }
    #input-widget .iw-cancel {
      background: transparent;
      color: #9ca3af;
      padding: 4px 8px;
      box-shadow: none;
    }
    #input-widget .iw-cancel:hover {
      color: white;
      transform: none;
    }
    #input-widget textarea {
      width: 100%;
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 4px;
      padding: 8px;
      color: white;
      font-size: 13px;
      resize: none;
      margin-bottom: 8px;
    }
    #input-widget textarea:focus {
      outline: none;
      border-color: #3b82f6;
    }
    #input-widget .iw-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    #input-widget .iw-submit {
      background: #2563eb;
      color: white;
      padding: 6px 12px;
    }
    #input-widget .iw-toast {
      position: absolute;
      bottom: 48px;
      right: 0;
      background: #059669;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: iw-fade 2s forwards;
    }
    @keyframes iw-fade {
      0%, 70% { opacity: 1; }
      100% { opacity: 0; }
    }
    .iw-highlight-edit {
      outline: 2px solid #f59e0b !important;
      outline-offset: 2px !important;
    }
    .iw-highlight-comment {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px !important;
    }
  `;
  document.head.appendChild(styles);

  // Widget HTML
  const widget = document.createElement('div');
  widget.id = 'input-widget';
  widget.innerHTML = `
    <div class="iw-buttons">
      <button class="iw-edit" title="Click text to edit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        </svg>
        Edit
      </button>
      <button class="iw-comment" title="Click to comment">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Comment
      </button>
      <span class="iw-count" style="display: ${inputCount > 0 ? 'flex' : 'none'}">${inputCount}</span>
    </div>
  `;
  document.body.appendChild(widget);

  const buttons = widget.querySelector('.iw-buttons');
  const editBtn = widget.querySelector('.iw-edit');
  const commentBtn = widget.querySelector('.iw-comment');
  const countEl = widget.querySelector('.iw-count');

  function getSelector(el) {
    const path = [];
    let current = el;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        path.unshift('#' + current.id);
        break;
      }
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c && !c.startsWith('iw-')).slice(0, 2).join('.');
        if (classes) selector += '.' + classes;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }

  function isTextElement(el) {
    const tags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A', 'LI', 'LABEL', 'BUTTON'];
    if (!tags.includes(el.tagName)) return false;
    const text = (el.textContent || '').trim();
    return text.length > 0 && text.length < 500 && el.querySelectorAll('*').length < 5;
  }

  function saveInput(item) {
    const data = JSON.parse(localStorage.getItem('page-input') || '[]');
    data.push(item);
    localStorage.setItem('page-input', JSON.stringify(data));
    inputCount = data.length;
    countEl.textContent = inputCount;
    countEl.style.display = 'flex';
    showToast();
  }

  function showToast() {
    const toast = document.createElement('div');
    toast.className = 'iw-toast';
    toast.textContent = 'Saved!';
    widget.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  function setMode(newMode) {
    mode = newMode;
    if (mode === 'idle') {
      buttons.style.display = 'flex';
      document.body.style.cursor = '';
      const panel = widget.querySelector('.iw-panel');
      if (panel) panel.remove();
    } else {
      buttons.style.display = 'none';
      document.body.style.cursor = mode === 'editing' ? 'text' : 'crosshair';
      showModePanel();
    }
  }

  function showModePanel() {
    const panel = document.createElement('div');
    panel.className = 'iw-panel';
    panel.innerHTML = `
      <p>${mode === 'editing' ? 'Click any text to edit' : 'Click any element to comment'}</p>
      <button class="iw-cancel">Cancel</button>
    `;
    panel.querySelector('.iw-cancel').onclick = () => setMode('idle');
    widget.appendChild(panel);
  }

  function showCommentPanel(el) {
    const panel = widget.querySelector('.iw-panel');
    if (panel) panel.remove();

    const newPanel = document.createElement('div');
    newPanel.className = 'iw-panel';
    newPanel.style.width = '260px';
    newPanel.innerHTML = `
      <p class="iw-hint">${(el.textContent || '').slice(0, 40)}...</p>
      <textarea rows="2" placeholder="What should change?"></textarea>
      <div class="iw-actions">
        <button class="iw-cancel">Cancel</button>
        <button class="iw-submit">Save</button>
      </div>
    `;

    const textarea = newPanel.querySelector('textarea');
    newPanel.querySelector('.iw-cancel').onclick = () => {
      el.classList.remove('iw-highlight-comment');
      activeElement = null;
      setMode('idle');
    };
    newPanel.querySelector('.iw-submit').onclick = () => {
      if (textarea.value.trim()) {
        saveInput({
          type: 'comment',
          selector: getSelector(el),
          path: window.location.pathname,
          elementText: (el.textContent || '').slice(0, 100),
          comment: textarea.value.trim(),
          timestamp: new Date().toISOString()
        });
      }
      el.classList.remove('iw-highlight-comment');
      activeElement = null;
      setMode('idle');
    };
    textarea.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        newPanel.querySelector('.iw-submit').click();
      }
      if (e.key === 'Escape') newPanel.querySelector('.iw-cancel').click();
    };

    widget.appendChild(newPanel);
    setTimeout(() => textarea.focus(), 50);
  }

  editBtn.onclick = () => setMode('editing');
  commentBtn.onclick = () => setMode('commenting');

  document.addEventListener('click', (e) => {
    if (mode === 'idle') return;
    if (widget.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target;

    if (mode === 'editing' && isTextElement(target)) {
      activeElement = target;
      originalText = target.textContent || '';
      target.contentEditable = 'true';
      target.classList.add('iw-highlight-edit');
      target.focus();

      const handleBlur = () => {
        target.contentEditable = 'false';
        target.classList.remove('iw-highlight-edit');
        const newText = target.textContent || '';
        if (newText !== originalText) {
          saveInput({
            type: 'text-edit',
            selector: getSelector(target),
            path: window.location.pathname,
            original: originalText,
            edited: newText,
            timestamp: new Date().toISOString()
          });
        }
        activeElement = null;
        setMode('idle');
        target.removeEventListener('blur', handleBlur);
      };
      target.addEventListener('blur', handleBlur);

    } else if (mode === 'commenting') {
      if (activeElement) {
        activeElement.classList.remove('iw-highlight-comment');
      }
      activeElement = target;
      target.classList.add('iw-highlight-comment');
      showCommentPanel(target);
    }
  }, true);

})();
