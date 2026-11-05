(() => {
  const certificates = Array.isArray(window.CERTIFICATES) ? window.CERTIFICATES : [];
  const pageSize = 12;
  let visibleLimit = pageSize;
  let activeRows = [];
  let dialogIndex = 0;

  const $ = (selector) => document.querySelector(selector);
  const grid = $('#credential-grid');
  const searchInput = $('#search-input');
  const categoryFilter = $('#category-filter');
  const sortSelect = $('#sort-select');
  const resultsCount = $('#results-count');
  const loadMore = $('#load-more');
  const emptyState = $('#empty-state');
  const clearFilters = $('#clear-filters');
  const dialog = $('#certificate-dialog');
  const dialogImage = $('#dialog-image');
  const dialogTitle = $('#dialog-title');
  const dialogIssuer = $('#dialog-issuer');
  const dialogMeta = $('#dialog-meta');
  const dialogSource = $('#dialog-source');
  const dialogVerify = $('#dialog-verify');
  const dialogDescription = $('#dialog-description');
  const categories = [...new Set(certificates.map((item) => item.category))];
  const byCategory = new Map(categories.map((slug) => [slug, certificates.filter((item) => item.category === slug)]));
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const initials = (issuer) => String(issuer || '').split(/[\s/·]+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const dateLabel = (item) => item.date ? new Date(`${item.date}T12:00:00`).toLocaleDateString('en', {month: 'short', year: 'numeric'}) : (item.year || 'Date not listed');
  const previewPath = (item) => {
    if (String(item.format).toLowerCase() !== 'pdf') return item.path;
    const fileName = item.path.split('/').pop().replace(/\.pdf$/i, '.jpg');
    return `previews/${item.category}/${fileName}`;
  };

  $('#current-year').textContent = new Date().getFullYear();
  $('#stat-total').textContent = certificates.length;
  $('#stat-areas').textContent = categories.length;
  $('#stat-providers').textContent = new Set(certificates.map((item) => item.issuer)).size;
  $('#stat-verified').textContent = certificates.filter((item) => item.verifyUrl).length;

  categories.sort((a, b) => byCategory.get(b).length - byCategory.get(a).length || a.localeCompare(b));
  for (const slug of categories) {
    const group = byCategory.get(slug);
    const option = document.createElement('option');
    option.value = slug;
    option.textContent = `${group[0].categoryLabel} (${group.length})`;
    categoryFilter.append(option);
  }

  const largest = byCategory.get(categories[0]) || [];
  const remainingAreas = categories.slice(1, 4).map((slug) => byCategory.get(slug)[0].categoryLabel.toLowerCase());
  $('#insight-title').textContent = `${largest[0]?.categoryLabel || 'Learning'} is the strongest thread.`;
  $('#insight-copy').textContent = `With ${largest.length} listed credentials, ${largest[0]?.categoryLabel?.toLowerCase() || 'this area'} forms the largest cluster. The collection also reaches into ${remainingAreas.join(', ')}.`;
  $('#insight-tags').innerHTML = categories.slice(0, 3).map((slug) => `<span>${escapeHtml(byCategory.get(slug)[0].categoryLabel)}</span>`).join('');

  const featured = certificates.find((item) => item.title === 'Discover20 Data Analysis Internship') || certificates[0];
  if (featured) {
    const featuredButton = $('#featured-preview');
    featuredButton.dataset.openId = featured.id;
    $('#featured-image').src = previewPath(featured);
    $('#featured-image').alt = `${featured.title} certificate preview`;
    $('#featured-title').textContent = featured.title;
    $('#featured-issuer').textContent = `${featured.issuer} · ${dateLabel(featured)}`;
  }

  const chart = $('#category-chart');
  const maxCount = Math.max(1, ...categories.map((slug) => byCategory.get(slug).length));
  for (const slug of categories) {
    const group = byCategory.get(slug);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chart-row';
    button.setAttribute('role', 'listitem');
    button.dataset.category = slug;
    button.setAttribute('aria-label', `Filter to ${group[0].categoryLabel}: ${group.length} credentials`);
    button.innerHTML = `<span class="chart-label">${escapeHtml(group[0].categoryLabel)}</span><span class="chart-track"><span class="chart-fill" style="--bar-width:${Math.max(5, group.length / maxCount * 100)}%"></span></span><span class="chart-value">${group.length}</span>`;
    button.addEventListener('click', () => {
      categoryFilter.value = categoryFilter.value === slug ? 'all' : slug;
      visibleLimit = pageSize;
      render();
      $('#credentials').scrollIntoView({behavior: 'smooth'});
    });
    chart.append(button);
  }

  const getFiltered = () => {
    const query = searchInput.value.trim().toLowerCase();
    const rows = certificates.filter((item) => {
      const matchesCategory = categoryFilter.value === 'all' || item.category === categoryFilter.value;
      const haystack = [item.title, item.issuer, item.categoryLabel, item.description, item.credentialId, item.language].filter(Boolean).join(' ').toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });
    if (sortSelect.value === 'az') rows.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortSelect.value === 'oldest') rows.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title));
    else rows.sort((a, b) => (b.date || '0000').localeCompare(a.date || '0000') || a.title.localeCompare(b.title));
    return rows;
  };

  function render() {
    activeRows = getFiltered();
    const shown = activeRows.slice(0, visibleLimit);
    resultsCount.textContent = `Showing ${shown.length} of ${activeRows.length} credentials`;
    emptyState.hidden = activeRows.length !== 0;
    grid.hidden = activeRows.length === 0;
    clearFilters.hidden = !(searchInput.value || categoryFilter.value !== 'all' || sortSelect.value !== 'recent');
    loadMore.hidden = activeRows.length <= visibleLimit;
    grid.innerHTML = shown.map((item, index) => {
      const edition = item.language ? `<span class="meta-chip">${escapeHtml(item.language)} edition</span>` : '';
      const verify = item.verifyUrl ? `<a class="verify-link" href="${escapeHtml(item.verifyUrl)}" target="_blank" rel="noreferrer">Verify ↗</a>` : '';
      const format = String(item.format || 'FILE').toUpperCase();
      return `<article class="credential-card">
        <div class="credential-card-top"><span class="card-number">${String(index + 1).padStart(2, '0')}</span><span class="card-format">${escapeHtml(format)} · CERTIFICATE</span></div>
        <button class="credential-preview" type="button" data-open-id="${escapeHtml(item.id)}" aria-label="Preview ${escapeHtml(item.title)}">
          <img src="${escapeHtml(previewPath(item))}" alt="${escapeHtml(item.title)} certificate preview" loading="lazy" decoding="async">
          <span class="preview-wash" aria-hidden="true"></span><span class="preview-open">Inspect artifact <span aria-hidden="true">↗</span></span>
        </button>
        <div class="credential-card-copy">
          <div class="provider-line"><span class="provider-mark" aria-hidden="true">${escapeHtml(initials(item.issuer))}</span><p class="credential-issuer">${escapeHtml(item.issuer)}</p></div>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="credential-meta"><span class="credential-category">${escapeHtml(item.categoryLabel)}</span><span class="meta-chip">${escapeHtml(dateLabel(item))}</span>${edition}</div>
          <div class="credential-actions"><button type="button" data-open-id="${escapeHtml(item.id)}">Details <span aria-hidden="true">↗</span></button><a href="${escapeHtml(item.path)}" target="_blank" rel="noreferrer">Original file ↗</a>${verify}</div>
        </div>
      </article>`;
    }).join('');
    chart.querySelectorAll('.chart-row').forEach((node) => node.classList.toggle('active', categoryFilter.value === node.dataset.category));
  }

  function updateDialog(index) {
    dialogIndex = (index + activeRows.length) % activeRows.length;
    const item = activeRows[dialogIndex];
    dialogImage.src = previewPath(item);
    dialogImage.alt = `${item.title} certificate preview`;
    dialogTitle.textContent = item.title;
    dialogIssuer.textContent = item.issuer;
    dialogDescription.textContent = item.description || 'A record of continued professional learning.';
    $('#dialog-position').textContent = `${String(dialogIndex + 1).padStart(2, '0')} / ${String(activeRows.length).padStart(2, '0')}`;
    const detailChips = [item.categoryLabel, dateLabel(item), item.language ? `${item.language} edition` : null, item.credentialId ? `ID ${item.credentialId}` : null].filter(Boolean);
    dialogMeta.innerHTML = detailChips.map((value) => `<span class="meta-chip">${escapeHtml(value)}</span>`).join('');
    dialogSource.href = item.path;
    dialogSource.textContent = String(item.format).toUpperCase() === 'PDF' ? 'Open original PDF ↗' : 'Open original image ↗';
    dialogVerify.hidden = !item.verifyUrl;
    if (item.verifyUrl) dialogVerify.href = item.verifyUrl;
    $('#dialog-prev').disabled = activeRows.length < 2;
    $('#dialog-next').disabled = activeRows.length < 2;
  }

  function openDialog(id) {
    const index = activeRows.findIndex((item) => item.id === id);
    if (index < 0) return;
    updateDialog(index);
    dialog.showModal();
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-id]');
    if (trigger) openDialog(trigger.dataset.openId);
  });
  $('#dialog-close').addEventListener('click', () => dialog.close());
  $('#dialog-prev').addEventListener('click', () => updateDialog(dialogIndex - 1));
  $('#dialog-next').addEventListener('click', () => updateDialog(dialogIndex + 1));
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { dialogImage.removeAttribute('src'); });

  searchInput.addEventListener('input', () => { visibleLimit = pageSize; render(); });
  categoryFilter.addEventListener('change', () => { visibleLimit = pageSize; render(); });
  sortSelect.addEventListener('change', () => { visibleLimit = pageSize; render(); });
  loadMore.addEventListener('click', () => { visibleLimit += pageSize; render(); });
  clearFilters.addEventListener('click', () => {
    searchInput.value = '';
    categoryFilter.value = 'all';
    sortSelect.value = 'recent';
    visibleLimit = pageSize;
    render();
    searchInput.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (dialog.open && event.key === 'ArrowLeft') updateDialog(dialogIndex - 1);
    if (dialog.open && event.key === 'ArrowRight') updateDialog(dialogIndex + 1);
    if (event.key === '/' && !dialog.open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  const themeToggle = $('#theme-toggle');
  const applyThemeLabel = () => { themeToggle.querySelector('.theme-label').textContent = document.body.classList.contains('dark') ? 'Light mode' : 'Dark mode'; };
  if (localStorage.getItem('portfolio-theme') === 'dark') document.body.classList.add('dark');
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('portfolio-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    applyThemeLabel();
  });
  applyThemeLabel();
  render();
})();
