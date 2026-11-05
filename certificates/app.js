(() => {
  const certificates = Array.isArray(window.CERTIFICATES) ? window.CERTIFICATES : [];
  const pageSize = 12;
  let visibleLimit = pageSize;
  let activeCategory = 'all';
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#credential-grid');
  const searchInput = $('#search-input');
  const categoryFilter = $('#category-filter');
  const sortSelect = $('#sort-select');
  const resultsCount = $('#results-count');
  const loadMore = $('#load-more');
  const emptyState = $('#empty-state');
  const clearFilters = $('#clear-filters');
  const categories = [...new Set(certificates.map((item) => item.category))];
  const byCategory = new Map(categories.map((slug) => [slug, certificates.filter((item) => item.category === slug)]));
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const initials = (issuer) => issuer.split(/[\s/·]+/).filter(Boolean).slice(0,2).map((word) => word[0]).join('').toUpperCase();
  const dateLabel = (item) => item.date ? new Date(`${item.date}T12:00:00`).toLocaleDateString('en', {month:'short',year:'numeric'}) : (item.year || 'Date not listed');

  $('#current-year').textContent = new Date().getFullYear();
  $('#stat-total').textContent = certificates.length;
  $('#stat-areas').textContent = categories.length;
  $('#stat-providers').textContent = new Set(certificates.map((item) => item.issuer)).size;
  $('#stat-verified').textContent = certificates.filter((item) => item.verifyUrl).length;

  categories.sort((a,b) => byCategory.get(b).length - byCategory.get(a).length || a.localeCompare(b));
  for (const slug of categories) {
    const label = byCategory.get(slug)[0].categoryLabel;
    const option = document.createElement('option');
    option.value = slug; option.textContent = `${label} (${byCategory.get(slug).length})`;
    categoryFilter.append(option);
  }
  const largest = byCategory.get(categories[0]) || [];
  $('#insight-title').textContent = `${largest[0]?.categoryLabel || 'Learning'} is the strongest thread.`;
  $('#insight-copy').textContent = `With ${largest.length} listed records, ${largest[0]?.categoryLabel?.toLowerCase() || 'this area'} is the largest cluster. The portfolio also reaches into ${categories.slice(1,4).map((slug) => byCategory.get(slug)[0].categoryLabel.toLowerCase()).join(', ')}.`;
  $('#insight-tags').innerHTML = categories.slice(0,3).map((slug) => `<span>${escapeHtml(byCategory.get(slug)[0].categoryLabel)}</span>`).join('');

  const chart = $('#category-chart');
  const maxCount = Math.max(1, ...categories.map((slug) => byCategory.get(slug).length));
  for (const slug of categories) {
    const group = byCategory.get(slug);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'chart-row'; button.setAttribute('role','listitem');
    button.dataset.category = slug;
    button.setAttribute('aria-label', `Filter to ${group[0].categoryLabel}: ${group.length} credentials`);
    button.innerHTML = `<span class="chart-label">${escapeHtml(group[0].categoryLabel)}</span><span class="chart-track"><span class="chart-fill" style="--bar-width:${Math.max(5,group.length/maxCount*100)}%"></span></span><span class="chart-value">${group.length}</span>`;
    button.addEventListener('click', () => { categoryFilter.value = activeCategory === slug ? 'all' : slug; activeCategory = categoryFilter.value; visibleLimit = pageSize; render(); document.querySelector('#credentials').scrollIntoView({behavior:'smooth'}); });
    chart.append(button);
  }

  const getFiltered = () => {
    const query = searchInput.value.trim().toLowerCase();
    let rows = certificates.filter((item) => {
      const matchesCategory = categoryFilter.value === 'all' || item.category === categoryFilter.value;
      const haystack = [item.title,item.issuer,item.categoryLabel,item.description,item.credentialId,item.language].filter(Boolean).join(' ').toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });
    if (sortSelect.value === 'az') rows.sort((a,b) => a.title.localeCompare(b.title));
    else if (sortSelect.value === 'oldest') rows.sort((a,b) => (a.date || '9999').localeCompare(b.date || '9999'));
    else rows.sort((a,b) => (b.date || '0000').localeCompare(a.date || '0000') || a.title.localeCompare(b.title));
    return rows;
  };

  function render() {
    const rows = getFiltered();
    const shown = rows.slice(0,visibleLimit);
    resultsCount.textContent = `Showing ${shown.length} of ${rows.length} credential files`;
    emptyState.hidden = rows.length !== 0;
    grid.hidden = rows.length === 0;
    clearFilters.hidden = !(searchInput.value || categoryFilter.value !== 'all' || sortSelect.value !== 'recent');
    loadMore.hidden = rows.length <= visibleLimit;
    grid.innerHTML = shown.map((item) => {
      const verify = item.verifyUrl ? `<a class="verify-link" href="${escapeHtml(item.verifyUrl)}" target="_blank" rel="noreferrer">Verify ↗</a>` : '';
      const edition = item.language ? `<span class="year-tag">${escapeHtml(item.language)} edition</span>` : '';
      const id = item.credentialId ? `<span class="year-tag">ID ${escapeHtml(item.credentialId)}</span>` : '';
      return `<article class="credential-card">
        <div class="credential-top"><span class="provider-mark" aria-hidden="true">${escapeHtml(initials(item.issuer))}</span><span class="format-tag">${escapeHtml(item.format)}</span></div>
        <h3>${escapeHtml(item.title)}</h3><p class="credential-issuer">${escapeHtml(item.issuer)}</p>
        <div class="credential-meta"><span class="credential-category">${escapeHtml(item.categoryLabel)}</span><span class="year-tag">${escapeHtml(dateLabel(item))}</span>${edition}${id}</div>
        <div class="credential-actions"><a href="${escapeHtml(item.path)}" target="_blank" rel="noreferrer">View credential ↗</a>${verify}</div>
      </article>`;
    }).join('');
    chart.querySelectorAll('.chart-row').forEach((node) => node.classList.toggle('active',categoryFilter.value === node.dataset.category));
  }

  searchInput.addEventListener('input', () => { visibleLimit=pageSize; render(); });
  categoryFilter.addEventListener('change', () => { activeCategory=categoryFilter.value; visibleLimit=pageSize; render(); });
  sortSelect.addEventListener('change', () => { visibleLimit=pageSize; render(); });
  loadMore.addEventListener('click', () => { visibleLimit+=pageSize; render(); });
  clearFilters.addEventListener('click', () => { searchInput.value=''; categoryFilter.value='all'; sortSelect.value='recent'; activeCategory='all'; visibleLimit=pageSize; render(); searchInput.focus(); });
  document.addEventListener('keydown', (event) => { if (event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) { event.preventDefault(); searchInput.focus(); } });
  const themeToggle = $('#theme-toggle');
  const savedTheme = localStorage.getItem('portfolio-theme');
  if (savedTheme === 'dark') document.body.classList.add('dark');
  themeToggle.addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem('portfolio-theme',document.body.classList.contains('dark')?'dark':'light'); themeToggle.querySelector('.theme-label').textContent=document.body.classList.contains('dark')?'Light mode':'Dark mode'; });
  themeToggle.querySelector('.theme-label').textContent=document.body.classList.contains('dark')?'Light mode':'Dark mode';
  render();
})();
