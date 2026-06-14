// Real-time search functionality
let searchTimeout;
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const searchContainer = document.querySelector('.search-container');

if (searchInput) {
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const query = this.value.trim();

    if (query.length < 2) {
      searchResults.innerHTML = '';
      searchResults.style.display = 'none';
      return;
    }

    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 250);
  });

  searchInput.addEventListener('focus', function() {
    if (this.value.trim().length >= 2 && searchResults.innerHTML) {
      searchResults.style.display = 'block';
    }
  });

  document.addEventListener('click', function(event) {
    if (!searchContainer.contains(event.target)) {
      searchResults.style.display = 'none';
    }
  });
}

async function performSearch(query) {
  try {
    const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Search request failed');
    }

    const results = await response.json();
    renderSearchResults(results, query);
  } catch (error) {
    console.error('Search error:', error);
    searchResults.innerHTML = '<div class="search-no-results">เกิดข้อผิดพลาดในการค้นหา</div>';
    searchResults.style.display = 'block';
  }
}

function renderSearchResults(results, query) {
  if (!Array.isArray(results) || results.length === 0) {
    searchResults.innerHTML = '<div class="search-no-results">ไม่พบผลการค้นหา</div>';
    searchResults.style.display = 'block';
    return;
  }

  const html = results
    .map((item) => {
      return `
        <a href="${item.url}" class="search-result-item">
          <div class="search-result-title">${highlightQuery(item.title, query)}</div>
          <div class="search-result-category">${item.category}</div>
        </a>
      `;
    })
    .join('');

  searchResults.innerHTML = html;
  searchResults.style.display = 'block';
}

function highlightQuery(text, query) {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<strong>$1</strong>');
}
