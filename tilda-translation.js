// JavaScript code
// Конфигурация
const supportedLangs = ['ru', 'en', 'th'];
const defaultLang = 'ru';
const githubRepo = 'blacklydman/WHYMORE';
const githubBranch = 'master';
let translations = {};
let originalTexts = new Map();
let observer;

// 1. Нормализация текста (регистронезависимая)
function normalizeText(text) {
  return text
    .toLowerCase() // Приводим к нижнему регистру
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .trim();
}

// 2. Получение текущего языка
function getCurrentLang() {
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  return supportedLangs.includes(langParam) ? langParam : defaultLang;
}

// 3. Получение ID страницы
function getPageId() {
  const path = window.location.pathname.split('/').filter(Boolean);
  return path[path.length - 1] || 'index';
}

// 4. Загрузка переводов (с нормализацией ключей)
function loadTranslations(lang, pageId) {
  return fetch(`https://raw.githubusercontent.com/${githubRepo}/${githubBranch}/translations/${pageId}.json?t=${Date.now()}`)
    .then(response => {
      if (!response.ok) throw new Error('Failed to load translations');
      return response.json();
    })
    .then(data => {
      const normalizedTranslations = {};
      for (const [key, value] of Object.entries(data[lang] || {})) {
        normalizedTranslations[normalizeText(key)] = value;
      }
      translations[lang] = normalizedTranslations;
      console.log('Translations loaded:', translations[lang]);
    });
}

// 5. Глубокий поиск текстовых узлов
function* walkTextNodes(node) {
  if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
    yield node;
  } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
    for (const child of node.childNodes) {
      yield* walkTextNodes(child);
    }
  }
}

// 6. Сохранение оригинальных текстов
function saveOriginalTexts() {
  const header = document.querySelector('header, .t-header');
  const elementsToCheck = [
    '.t-text', '.t-title', '.t-descr', 
    '.t-cover__title', '.t-cover__text',
    '[class*="tn_text_"]', '[class*="tn_atitle_"]',
    'p', 'h1', 'h2', 'h3', 'span', 'div'
  ];
  
  if (header) elementsToCheck.push('header', '.t-header');

  document.querySelectorAll(elementsToCheck.join(',')).forEach(el => {
    for (const textNode of walkTextNodes(el)) {
      const original = textNode.textContent;
      const normalized = normalizeText(original);
      if (normalized && !originalTexts.has(textNode)) {
        originalTexts.set(textNode, { original, normalized });
      }
    }
  });
}

// 7. Применение переводов (регистронезависимое)
function applyTranslations(lang) {
  if (lang === defaultLang) {
    restoreOriginalTexts();
    return;
  }

  const langTranslations = translations[lang];
  if (!langTranslations) return;

  let translatedCount = 0;
  
  originalTexts.forEach((textData, textNode) => {
    const translation = langTranslations[textData.normalized];
    if (translation) {
      textNode.textContent = translation;
      translatedCount++;
    }
  });

  console.log(`Translated ${translatedCount} text nodes`);
  forceTildaRedraw();
}

// 8. Принудительное обновление Tilda
function forceTildaRedraw() {
  if (window.tilda) {
    if (window.tilda.lazyLoad) window.tilda.lazyLoad.redraw();
    if (window.tilda.pageInit) window.tilda.pageInit();
  }
  document.querySelectorAll('img, .t-animation').forEach(el => {
    el.style.opacity = '0.999';
  });
}

// 9. Восстановление оригиналов
function restoreOriginalTexts() {
  originalTexts.forEach((textData, node) => {
    node.textContent = textData.original;
  });
}

// 10. Наблюдатель за изменениями DOM
function setupObserver() {
  if (observer) observer.disconnect();
  
  observer = new MutationObserver(() => {
    saveOriginalTexts();
    applyTranslations(getCurrentLang());
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 11. Переключатель языков
function createLanguageSwitcher() {
  if (document.getElementById('tilda-lang-switcher')) return;

  const container = document.createElement('div');
  container.id = 'tilda-lang-switcher';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '9999',
    display: 'flex',
    gap: '8px',
    background: 'white',
    padding: '10px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    fontFamily: 'Arial, sans-serif'
  });

  const currentLang = getCurrentLang();

  supportedLangs.forEach(lang => {
    const btn = document.createElement('button');
    btn.textContent = lang.toUpperCase();
    Object.assign(btn.style, {
      padding: '5px 10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      background: lang === currentLang ? '#f0f0f0' : '#fff',
      cursor: 'pointer'
    });
    btn.onclick = (e) => {
      e.preventDefault();
      switchLanguage(lang);
    };
    container.appendChild(btn);
  });

  document.body.appendChild(container);
}

// 12. Переключение языка
function switchLanguage(lang) {
  if (lang === getCurrentLang()) return;

  const url = new URL(window.location);
  url.searchParams.set('lang', lang);
  window.history.pushState({}, '', url);
  location.reload();
}

// 13. Инициализация
function initLanguageSystem() {
  const lang = getCurrentLang();
  const pageId = getPageId();

  saveOriginalTexts();
  
  loadTranslations(lang, pageId)
    .then(() => {
      applyTranslations(lang);
      createLanguageSwitcher();
      setupObserver();
      
      setInterval(() => {
        saveOriginalTexts();
        applyTranslations(lang);
      }, 3000);
    })
    .catch(console.error);
}

// Запуск системы
if (document.readyState === 'complete') {
  initLanguageSystem();
} else {
  document.addEventListener('DOMContentLoaded', initLanguageSystem);
}

// Обработчик истории
window.addEventListener('popstate', initLanguageSystem);
