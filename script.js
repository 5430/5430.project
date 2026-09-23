/**
 * Google Start Page - Core Application Logic (script.js)
 * Features:
 * - Realtime Clock & Date
 * - Seoul & Jeju Weather API (Open-Meteo)
 * - Google Search Engine & Recent Searches
 * - Daily Inspirational Quotes & Clipboard Copy
 * - Dark/Light Theme Switching with LocalStorage
 * - Customizable Fast Shortcuts / Bookmarks
 */

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initTheme();
  initWeather();
  initSearch();
  initQuotes();
  initShortcuts();
  initGoogleAppsDropdown();
});

/* ==========================================================================
   1. Realtime Clock & Date
   ========================================================================== */
function initClock() {
  const timeEl = document.getElementById('currentTime');
  const dateEl = document.getElementById('currentDate');

  const daysKo = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  function updateClock() {
    const now = new Date();
    
    // Time format: HH:MM:SS
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    if (timeEl) {
      timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }

    // Date format: YYYY년 M월 D일 요일
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = daysKo[now.getDay()];
    if (dateEl) {
      dateEl.textContent = `${year}년 ${month}월 ${date}일 ${day}`;
    }
  }

  updateClock();
  setInterval(updateClock, 1000);
}

/* ==========================================================================
   2. Dark / Light Theme System
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('google_startpage_theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Apply saved theme or system preference
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('google_startpage_theme', newTheme);
      showToast(newTheme === 'dark' ? '🌙 다크 모드로 전환되었습니다.' : '☀️ 라이트 모드로 전환되었습니다.');
    });
  }
}

/* ==========================================================================
   3. Realtime Weather Engine (Seoul & Jeju) via Open-Meteo
   ========================================================================== */
const CITY_COORDINATES = {
  seoul: {
    name: '서울',
    en: 'Seoul',
    lat: 37.5665,
    lon: 126.9780
  },
  jeju: {
    name: '제주',
    en: 'Jeju',
    lat: 33.4996,
    lon: 126.5312
  }
};

function parseWeatherCode(code, isDay = 1) {
  // WMO Weather interpretation codes (WW)
  switch (code) {
    case 0:
      return { status: '맑음', icon: isDay ? '☀️' : '🌙' };
    case 1:
      return { status: '대체로 맑음', icon: isDay ? '🌤️' : '🌤️' };
    case 2:
      return { status: '구름 조금', icon: '⛅' };
    case 3:
      return { status: '흐림', icon: '☁️' };
    case 45:
    case 48:
      return { status: '안개', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { status: '이슬비', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { status: '비', icon: '🌧️' };
    case 66:
    case 67:
      return { status: '진눈깨비', icon: '🌨️' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { status: '눈', icon: '❄️' };
    case 80:
    case 81:
    case 82:
      return { status: '소나기', icon: '🌧️' };
    case 85:
    case 86:
      return { status: '눈보라', icon: '🌨️' };
    case 95:
    case 96:
    case 99:
      return { status: '뇌우', icon: '⛈️' };
    default:
      return { status: '맑음', icon: '☀️' };
  }
}

async function fetchCityWeather(cityKey) {
  const { lat, lon } = CITY_COORDINATES[cityKey];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn(`[Weather] Error loading ${cityKey}:`, err);
    // Fallback Mock Data in case of network issue
    return {
      current: {
        temperature_2m: cityKey === 'seoul' ? 24.5 : 26.2,
        apparent_temperature: cityKey === 'seoul' ? 25.1 : 27.0,
        relative_humidity_2m: 55,
        wind_speed_10m: 2.1,
        weather_code: 1,
        is_day: 1
      },
      daily: {
        temperature_2m_min: [20.0],
        temperature_2m_max: [28.5]
      }
    };
  }
}

async function updateAllWeather() {
  const refreshBtn = document.getElementById('weatherRefreshBtn');
  if (refreshBtn) refreshBtn.classList.add('spinning');

  try {
    const [seoulData, jejuData] = await Promise.all([
      fetchCityWeather('seoul'),
      fetchCityWeather('jeju')
    ]);

    renderWeatherData('seoul', seoulData);
    renderWeatherData('jeju', jejuData);
  } finally {
    if (refreshBtn) {
      setTimeout(() => refreshBtn.classList.remove('spinning'), 600);
    }
  }
}

function renderWeatherData(cityKey, data) {
  const current = data.current;
  const daily = data.daily;
  const weatherInfo = parseWeatherCode(current.weather_code, current.is_day);

  // Main Card Elements
  const tempEl = document.getElementById(`${cityKey}Temp`);
  const statusEl = document.getElementById(`${cityKey}Status`);
  const iconEl = document.getElementById(`${cityKey}ConditionIcon`);
  const apparentEl = document.getElementById(`${cityKey}Apparent`);
  const humidityEl = document.getElementById(`${cityKey}Humidity`);
  const windEl = document.getElementById(`${cityKey}Wind`);
  const minMaxEl = document.getElementById(`${cityKey}MinMax`);

  // Mini Pill Elements
  const pillTempEl = document.getElementById(`pill${capitalize(cityKey)}Temp`);
  const pillIconEl = document.getElementById(`pill${capitalize(cityKey)}Icon`);

  const tempVal = Math.round(current.temperature_2m);
  const apparentVal = Math.round(current.apparent_temperature);
  const minVal = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : '--';
  const maxVal = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : '--';

  if (tempEl) tempEl.innerHTML = `${tempVal}<span class="temp-unit">°C</span>`;
  if (statusEl) statusEl.textContent = weatherInfo.status;
  if (iconEl) iconEl.textContent = weatherInfo.icon;
  if (apparentEl) apparentEl.textContent = `${apparentVal}°C`;
  if (humidityEl) humidityEl.textContent = `${current.relative_humidity_2m}%`;
  if (windEl) windEl.textContent = `${current.wind_speed_10m} m/s`;
  if (minMaxEl) minMaxEl.textContent = `${minVal}° / ${maxVal}°`;

  if (pillTempEl) pillTempEl.textContent = `${tempVal}°`;
  if (pillIconEl) pillIconEl.textContent = weatherInfo.icon;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function initWeather() {
  updateAllWeather();

  const refreshBtn = document.getElementById('weatherRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      updateAllWeather();
      showToast('🌤️ 날씨 정보를 업데이트했습니다.');
    });
  }

  // City Tabs filter
  const tabAll = document.getElementById('tabAll');
  const tabSeoul = document.getElementById('tabSeoul');
  const tabJeju = document.getElementById('tabJeju');
  const cardSeoul = document.getElementById('cardSeoul');
  const cardJeju = document.getElementById('cardJeju');

  const tabs = [
    { btn: tabAll, type: 'all' },
    { btn: tabSeoul, type: 'seoul' },
    { btn: tabJeju, type: 'jeju' }
  ];

  tabs.forEach(t => {
    if (!t.btn) return;
    t.btn.addEventListener('click', () => {
      tabs.forEach(tab => tab.btn && tab.btn.classList.remove('active'));
      t.btn.classList.add('active');

      if (t.type === 'all') {
        cardSeoul.style.display = 'block';
        cardJeju.style.display = 'block';
      } else if (t.type === 'seoul') {
        cardSeoul.style.display = 'block';
        cardJeju.style.display = 'none';
      } else if (t.type === 'jeju') {
        cardSeoul.style.display = 'none';
        cardJeju.style.display = 'block';
      }
    });
  });

  // Top Pill Triggers
  const pillSeoul = document.getElementById('weatherPillSeoul');
  const pillJeju = document.getElementById('weatherPillJeju');

  if (pillSeoul) {
    pillSeoul.addEventListener('click', () => {
      tabSeoul.click();
      document.getElementById('weatherDashboard').scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (pillJeju) {
    pillJeju.addEventListener('click', () => {
      tabJeju.click();
      document.getElementById('weatherDashboard').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Auto refresh every 15 minutes
  setInterval(updateAllWeather, 15 * 60 * 1000);
}

/* ==========================================================================
   4. Google Search Engine & Recent Searches
   ========================================================================== */
function initSearch() {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  const recentBox = document.getElementById('recentSearchesBox');
  const recentList = document.getElementById('recentList');
  const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
  const voiceBtn = document.getElementById('voiceSearchBtn');
  const lensBtn = document.getElementById('lensSearchBtn');

  // Input Clear Button Toggle
  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
      clearBtn.classList.add('visible');
    } else {
      clearBtn.classList.remove('visible');
    }
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.remove('visible');
    searchInput.focus();
  });

  // Handle Search Submission
  searchForm.addEventListener('submit', (e) => {
    const query = searchInput.value.trim();
    if (!query) {
      e.preventDefault();
      searchInput.focus();
      return;
    }

    // Check if query is URL
    if (isURL(query)) {
      e.preventDefault();
      let targetUrl = query;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }
      saveRecentSearch(query);
      window.location.href = targetUrl;
      return;
    }

    saveRecentSearch(query);
    // Form will proceed to https://www.google.com/search?q=...
  });

  // Recent Searches dropdown management
  function getRecentSearches() {
    const data = localStorage.getItem('google_recent_searches');
    return data ? JSON.parse(data) : [];
  }

  function saveRecentSearch(keyword) {
    if (!keyword) return;
    let list = getRecentSearches();
    list = list.filter(item => item.toLowerCase() !== keyword.toLowerCase());
    list.unshift(keyword);
    if (list.length > 8) list.pop();
    localStorage.setItem('google_recent_searches', JSON.stringify(list));
  }

  function renderRecentSearches() {
    const list = getRecentSearches();
    recentList.innerHTML = '';

    if (list.length === 0) {
      recentBox.classList.remove('show');
      return;
    }

    list.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'recent-item';
      li.innerHTML = `
        <div class="recent-item-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>${escapeHTML(item)}</span>
        </div>
        <button type="button" class="recent-item-delete" title="삭제" aria-label="삭제">✕</button>
      `;

      li.querySelector('.recent-item-left').addEventListener('click', () => {
        searchInput.value = item;
        searchForm.submit();
      });

      li.querySelector('.recent-item-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteRecentSearch(index);
      });

      recentList.appendChild(li);
    });
  }

  function deleteRecentSearch(index) {
    const list = getRecentSearches();
    list.splice(index, 1);
    localStorage.setItem('google_recent_searches', JSON.stringify(list));
    renderRecentSearches();
  }

  if (clearAllHistoryBtn) {
    clearAllHistoryBtn.addEventListener('click', () => {
      localStorage.removeItem('google_recent_searches');
      recentBox.classList.remove('show');
      showToast('🗑️ 검색 기록을 모두 삭제했습니다.');
    });
  }

  // Show recent searches on input focus if field is empty
  searchInput.addEventListener('focus', () => {
    const list = getRecentSearches();
    if (list.length > 0 && !searchInput.value.trim()) {
      renderRecentSearches();
      recentBox.classList.add('show');
    }
  });

  // Hide recent searches on outside click
  document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) {
      recentBox.classList.remove('show');
    }
  });

  // Voice Search (Web Speech API)
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast('⚠️ 이 브라우저에서는 음성 인식을 지원하지 않습니다.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.interimResults = false;

      showToast('🎙️ 듣고 있습니다... 말씀해 주세요.');

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        clearBtn.classList.add('visible');
        showToast(`🔍 "${transcript}" 검색을 진행합니다.`);
        setTimeout(() => searchForm.submit(), 600);
      };

      recognition.onerror = (event) => {
        showToast('⚠️ 음성을 인식하지 못했습니다. 다시 시도해 주세요.');
      };

      recognition.start();
    });
  }

  // Lens Search
  if (lensBtn) {
    lensBtn.addEventListener('click', () => {
      window.open('https://lens.google.com/', '_blank');
    });
  }
}

function isURL(str) {
  const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(str) && (str.includes('.') || str.startsWith('localhost'));
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

/* ==========================================================================
   5. Quotes Engine (오늘의 명언)
   ========================================================================== */
const QUOTES_DATABASE = [
  {
    text: "인생이란 용기의 양에 따라 줄어들거나 늘어난다.",
    author: "아나이스 닌 (Anaïs Nin)",
    category: "용기 & 도전"
  },
  {
    text: "오늘 할 수 있는 일을 내일로 미루지 마라.",
    author: "벤저민 프랭클린 (Benjamin Franklin)",
    category: "실행 & 성실"
  },
  {
    text: "바람이 불지 않으면 노를 저어라.",
    author: "윈스턴 처칠 (Winston Churchill)",
    category: "의지 & 개척"
  },
  {
    text: "단순함이 궁극의 정교함이다.",
    author: "레오나르도 다빈치 (Leonardo da Vinci)",
    category: "철학 & 디자인"
  },
  {
    text: "우리가 두려워해야 할 유일한 것은 두려움 그 자체다.",
    author: "프랭클린 D. 루스벨트 (Franklin D. Roosevelt)",
    category: "용기 & 극복"
  },
  {
    text: "어제와 똑같이 살면서 다른 미래를 기대하는 것은 정신병 초기증세이다.",
    author: "알베르트 아인슈타인 (Albert Einstein)",
    category: "변화 & 성장"
  },
  {
    text: "위대한 일을 하는 유일한 방법은 당신이 하는 일을 사랑하는 것이다.",
    author: "스티브 잡스 (Steve Jobs)",
    category: "열정 & 성공"
  },
  {
    text: "꿈을 이루고자 하는 용기만 있다면 모든 꿈은 이루어질 수 있다.",
    author: "월트 디즈니 (Walt Disney)",
    category: "꿈 & 희망"
  },
  {
    text: "행복은 목적지가 아니라 여행하는 방식이다.",
    author: "마거릿 리 런벡 (Margaret Lee Runbeck)",
    category: "행복 & 삶"
  },
  {
    text: "천 리 길도 한 걸음부터 시작된다.",
    author: "노자 (Laozi)",
    category: "시작 & 끈기"
  },
  {
    text: "실패는 다시 시작할 수 있는 기회다. 이번에는 더 현명하게.",
    author: "헨리 포드 (Henry Ford)",
    category: "도전 & 지혜"
  },
  {
    text: "당신이 할 수 있다고 믿든 할 수 없다고 믿든, 믿는 대로 될 것이다.",
    author: "헨리 포드 (Henry Ford)",
    category: "신념 & 긍정"
  },
  {
    text: "미래를 예측하는 가장 좋은 방법은 미래를 창조하는 것이다.",
    author: "피터 드러커 (Peter Drucker)",
    category: "비전 & 혁신"
  },
  {
    text: "가장 어두운 밤도 언젠가는 끝나고 해는 떠오를 것이다.",
    author: "빅토르 위고 (Victor Hugo)",
    category: "희망 & 위로"
  },
  {
    text: "생각하는 대로 살지 않으면 사는 대로 생각하게 된다.",
    author: "폴 부르제 (Paul Bourget)",
    category: "자기주도"
  }
];

function initQuotes() {
  const quoteTextEl = document.getElementById('quoteText');
  const quoteAuthorEl = document.getElementById('quoteAuthor');
  const quoteCategoryEl = document.getElementById('quoteCategory');
  const nextQuoteBtn = document.getElementById('nextQuoteBtn');
  const randomQuoteBtn = document.getElementById('randomQuoteBtn');
  const copyQuoteBtn = document.getElementById('copyQuoteBtn');
  const copyTooltip = document.getElementById('copyTooltip');

  let currentQuoteIndex = -1;

  function renderRandomQuote() {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * QUOTES_DATABASE.length);
    } while (newIndex === currentQuoteIndex && QUOTES_DATABASE.length > 1);

    currentQuoteIndex = newIndex;
    const quote = QUOTES_DATABASE[currentQuoteIndex];

    if (quoteTextEl) {
      quoteTextEl.style.opacity = '0';
      setTimeout(() => {
        quoteTextEl.textContent = quote.text;
        if (quoteAuthorEl) quoteAuthorEl.textContent = quote.author;
        if (quoteCategoryEl) quoteCategoryEl.textContent = quote.category;
        quoteTextEl.style.opacity = '1';
      }, 150);
    }
  }

  // Display initial quote
  renderRandomQuote();

  // Next Quote Button
  if (nextQuoteBtn) {
    nextQuoteBtn.addEventListener('click', () => {
      nextQuoteBtn.classList.add('spinning');
      renderRandomQuote();
      setTimeout(() => nextQuoteBtn.classList.remove('spinning'), 600);
    });
  }

  // "I'm Feeling Lucky" Button triggers quote & scroll
  if (randomQuoteBtn) {
    randomQuoteBtn.addEventListener('click', () => {
      renderRandomQuote();
      document.getElementById('quoteSection').scrollIntoView({ behavior: 'smooth' });
      showToast('✨ 새로운 오늘의 명언을 불러왔습니다!');
    });
  }

  // Copy Quote to Clipboard
  if (copyQuoteBtn) {
    copyQuoteBtn.addEventListener('click', async () => {
      const quote = QUOTES_DATABASE[currentQuoteIndex];
      const copyContent = `"${quote.text}" — ${quote.author}`;

      try {
        await navigator.clipboard.writeText(copyContent);
        if (copyTooltip) {
          copyTooltip.classList.add('show');
          setTimeout(() => copyTooltip.classList.remove('show'), 1800);
        }
        showToast('📋 명언이 클립보드에 복사되었습니다.');
      } catch (err) {
        showToast('⚠️ 복사에 실패했습니다.');
      }
    });
  }
}

/* ==========================================================================
   6. Customizable Shortcuts / Bookmarks
   ========================================================================== */
const DEFAULT_SHORTCUTS = [
  { id: 'sdu', name: '서울디지털대', url: 'https://www.sdu.ac.kr', icon: '🎓' },
  { id: '1', name: 'YouTube', url: 'https://www.youtube.com', icon: '📺' },
  { id: '2', name: 'Gmail', url: 'https://mail.google.com', icon: '✉️' },
  { id: '3', name: '네이버', url: 'https://www.naver.com', icon: '🟢' },
  { id: '4', name: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { id: '5', name: 'ChatGPT', url: 'https://chatgpt.com', icon: '🤖' },
  { id: '6', name: 'Google 지도', url: 'https://maps.google.com', icon: '🗺️' }
];

function initShortcuts() {
  const shortcutsGrid = document.getElementById('shortcutsGrid');
  const modalOverlay = document.getElementById('shortcutModalOverlay');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const addForm = document.getElementById('addShortcutForm');
  const nameInput = document.getElementById('shortcutName');
  const urlInput = document.getElementById('shortcutUrl');

  function getShortcuts() {
    const saved = localStorage.getItem('google_shortcuts');
    return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
  }

  function saveShortcuts(shortcuts) {
    localStorage.setItem('google_shortcuts', JSON.stringify(shortcuts));
  }

  function renderShortcuts() {
    const shortcuts = getShortcuts();
    shortcutsGrid.innerHTML = '';

    shortcuts.forEach(item => {
      const card = document.createElement('div');
      card.className = 'shortcut-card';
      card.innerHTML = `
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; width: 100%;">
          <div class="shortcut-icon-wrap">
            <span>${item.icon || '🔗'}</span>
          </div>
          <span class="shortcut-title" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</span>
        </a>
        <button class="shortcut-delete-btn" title="삭제" aria-label="${item.name} 바로가기 삭제">✕</button>
      `;

      card.querySelector('.shortcut-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteShortcut(item.id);
      });

      shortcutsGrid.appendChild(card);
    });

    // Add "+" Button
    const addCard = document.createElement('button');
    addCard.className = 'shortcut-card add-shortcut-btn';
    addCard.title = '바로가기 추가';
    addCard.innerHTML = `
      <div class="shortcut-icon-wrap">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      <span class="shortcut-title">추가</span>
    `;

    addCard.addEventListener('click', () => {
      modalOverlay.classList.add('show');
      nameInput.value = '';
      urlInput.value = '';
      setTimeout(() => nameInput.focus(), 100);
    });

    shortcutsGrid.appendChild(addCard);
  }

  function deleteShortcut(id) {
    let shortcuts = getShortcuts();
    shortcuts = shortcuts.filter(s => s.id !== id);
    saveShortcuts(shortcuts);
    renderShortcuts();
    showToast('🗑️ 바로가기가 삭제되었습니다.');
  }

  function closeModal() {
    modalOverlay.classList.remove('show');
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      let url = urlInput.value.trim();

      if (!name || !url) return;

      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      const shortcuts = getShortcuts();
      const newShortcut = {
        id: String(Date.now()),
        name: name,
        url: url,
        icon: getFaviconEmoji(name)
      };

      shortcuts.push(newShortcut);
      saveShortcuts(shortcuts);
      renderShortcuts();
      closeModal();
      showToast(`✨ "${name}" 바로가기가 추가되었습니다.`);
    });
  }

  renderShortcuts();
}

function getFaviconEmoji(name) {
  const lower = name.toLowerCase();
  if (lower.includes('sdu') || lower.includes('서울디지털') || lower.includes('디지털대')) return '🎓';
  if (lower.includes('github')) return '🐙';
  if (lower.includes('naver') || lower.includes('네이버')) return '🟢';
  if (lower.includes('daum') || lower.includes('다음')) return '🔵';
  if (lower.includes('chatgpt') || lower.includes('openai')) return '🤖';
  if (lower.includes('google') || lower.includes('구글')) return '🌐';
  if (lower.includes('notion') || lower.includes('노션')) return '📝';
  if (lower.includes('figma') || lower.includes('피그마')) return '🎨';
  if (lower.includes('news') || lower.includes('뉴스')) return '📰';
  if (lower.includes('bank') || lower.includes('은행')) return '💳';
  return '🔗';
}

/* ==========================================================================
   7. Google Apps Dropdown Menu
   ========================================================================== */
function initGoogleAppsDropdown() {
  const appsMenuBtn = document.getElementById('appsMenuBtn');
  const appsDropdown = document.getElementById('appsDropdown');

  if (!appsMenuBtn || !appsDropdown) return;

  appsMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    appsDropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!appsDropdown.contains(e.target) && e.target !== appsMenuBtn) {
      appsDropdown.classList.remove('show');
    }
  });
}

/* ==========================================================================
   8. Toast Notification Utility
   ========================================================================== */
let toastTimeout;
function showToast(message) {
  const toast = document.getElementById('toastMessage');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}
