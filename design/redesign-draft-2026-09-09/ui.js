/* Navigation and presentation for the standalone design draft. */
(() => {
  const $ = (id) => document.getElementById(id);
  const codeExamples = {
    cli: {
      text: '# Analyze a draft locally\nnpx --yes textanalysis-tools frequency article.txt\n\n# Take the results into your workflow\nnpx --yes textanalysis-tools frequency article.txt --format json',
      docs: '/cli',
    },
    api: {
      text: 'curl https://textanalysis.tools/api/v1/analyze \\\n  -H "Content-Type: application/json" \\\n  -d \'{"source":"Good writing starts with clear thinking.","language":"en"}\'',
      docs: '/api-docs',
    },
    mcp: {
      text: '// Add to your MCP client configuration\n{\n  "mcpServers": {\n    "textanalysis": {\n      "command": "npx",\n      "args": ["--yes", "textanalysis-tools", "mcp"]\n    }\n  }\n}',
      docs: '/agents',
    },
  };
  function selectCode(key) {
    $('integration-code').firstElementChild.textContent = codeExamples[key].text;
    $('integration-docs').href = `https://textanalysis.tools${codeExamples[key].docs}`;
    document.querySelectorAll('[data-code]').forEach((button) => {
      const active = button.dataset.code === key;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }
  function syncTool() {
    const phrases = $('ngram-size').value !== '1';
    const name = phrases ? 'N-gram analyzer' : 'Word frequency';
    $('breadcrumb-tool').textContent = name;
    $('workspace-title').textContent = name;
    document.querySelectorAll('.tool-nav [data-mode]').forEach((link) => {
      const active = link.dataset.mode === (phrases ? 'phrases' : 'words');
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  function renderView() {
    const workspace = location.hash === '#workspace';
    $('home-view').hidden = workspace;
    $('workspace-view').hidden = !workspace;
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.view === (workspace ? 'workspace' : 'home')));
    });
    document.title = `${workspace ? 'Workspace' : 'Textanalysis'} — Design draft 01`;
    syncTool();
    if (workspace || !location.hash || location.hash === '#home') window.scrollTo(0, 0);
    else document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }
  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-view], [data-mode], [data-try-sample], [data-code]');
    if (!control) return;
    if (control.dataset.code) { selectCode(control.dataset.code); return; }
    event.preventDefault();
    if (control.hasAttribute('data-try-sample')) {
      $('source-text').value = 'Good writing starts with clear thinking. Clear thinking makes good writing possible.';
      $('term-search').value = '';
      $('ngram-size').value = '1';
      $('analysis-language').value = 'auto';
      window.draftAnalysis.run();
    }
    if (control.dataset.mode) {
      $('ngram-size').value = control.dataset.mode === 'phrases' ? '2' : '1';
      $('term-search').value = '';
      window.draftAnalysis.run();
    }
    const hash = control.dataset.view === 'home' ? '#home' : '#workspace';
    if (location.hash === hash) renderView();
    else location.hash = hash;
  });
  document.querySelector('.code-tabs').addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const keys = Object.keys(codeExamples);
    const current = keys.indexOf(event.target.dataset.code);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
    selectCode(keys[next]);
    document.querySelector(`[data-code="${keys[next]}"]`).focus();
  });
  $('theme-toggle').addEventListener('click', () => {
    const light = document.body.classList.toggle('light');
    $('theme-toggle').querySelector('span').textContent = light ? 'Тёмная тема' : 'Светлая тема';
    $('theme-toggle').setAttribute('aria-label', light ? 'Включить тёмную тему' : 'Включить светлую тему');
  });
  $('ngram-size').addEventListener('change', syncTool);
  ['tab-frequency', 'tab-phrases'].forEach((id) => $(id).addEventListener('click', syncTool));
  window.addEventListener('hashchange', renderView);
  selectCode('cli');
  renderView();
})();
