// ===== agy-patch zh-CN localization engine v1 =====
(function () {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const proto = (window.location && window.location.protocol) || '';
    const host = (window.location && window.location.hostname) || '';
    if (host && host !== '127.0.0.1' && host !== 'localhost' && proto !== 'file:' && proto !== 'data:' && proto !== 'about:') {
      return;
    }
    if (window.__AGY_ZH_CN_PATCHED__) return;
    window.__AGY_ZH_CN_PATCHED__ = true;
  } catch (_) {
    return;
  }

  const dictionary = __AGY_DICT_JSON__;
  const coreWords = __AGY_CORE_WORDS_JSON__;

  const lowerDictionary = new Map();
  for (const k in dictionary) {
    if (Object.prototype.hasOwnProperty.call(dictionary, k)) {
      const lk = k.toLowerCase();
      if (!lowerDictionary.has(lk)) {
        lowerDictionary.set(lk, dictionary[k]);
      }
    }
  }

  const stringCache = new Map();
  const MAX_STRING_CACHE = 6000;

  const escapeRegExp = (str) => {
    const specials = ['[', ']', '(', ')', '{', '}', '*', '+', '?', '.', '^', '$', '|', '\\'];
    return str.split('').map(c => specials.includes(c) ? '\\' + c : c).join('');
  };

  const sortedCoreKeys = Object.keys(coreWords)
    .sort((a, b) => b.length - a.length)
    .filter(w => w.length > 2 || /^[a-zA-Z0-9]+$/.test(w));
  const CORE_WORDS_UNION_REGEX = sortedCoreKeys.length
    ? new RegExp('\\b(' + sortedCoreKeys.map(escapeRegExp).join('|') + ')\\b', 'gi')
    : null;

  function cacheAndReturn(text, trimmed, translated) {
    if (stringCache.size < MAX_STRING_CACHE) {
      stringCache.set(trimmed, translated);
    }
    return text.replace(trimmed, translated);
  }

  function translateString(text) {
    if (!text) return text;
    const trimmed = text.trim();
    if (!trimmed || !/[a-zA-Z]/.test(trimmed)) return text;

    if (stringCache.has(trimmed)) {
      return text.replace(trimmed, stringCache.get(trimmed));
    }

    // Quote / Ask /btw floating selection pills
    if (/^Quote(?:\s+(Ctrl\+[a-zA-Z0-9]+|Cmd\+[a-zA-Z0-9]+))?$/i.test(trimmed)) {
      const fixed = trimmed.replace(/^Quote(?:\s+(Ctrl\+[a-zA-Z0-9]+|Cmd\+[a-zA-Z0-9]+))?$/i, (_, s) =>
        s ? ('引用 ' + s.toUpperCase().replace('CTRL', 'Ctrl').replace('CMD', 'Cmd')) : '引用'
      );
      return cacheAndReturn(text, trimmed, fixed);
    }
    if (/^Ask(?:\s+|\s*\/\s*)btw(?:\s+(Ctrl\+[a-zA-Z0-9]+|Cmd\+[a-zA-Z0-9]+))?$/i.test(trimmed)) {
      const fixed = trimmed.replace(/^Ask(?:\s+|\s*\/\s*)btw(?:\s+(Ctrl\+[a-zA-Z0-9]+|Cmd\+[a-zA-Z0-9]+))?$/i, (_, s) =>
        s ? ('通过 /btw 提问 ' + s.toUpperCase().replace('CTRL', 'Ctrl').replace('CMD', 'Cmd')) : '通过 /btw 提问'
      );
      return cacheAndReturn(text, trimmed, fixed);
    }

    // Dynamic duration / thinking / work logs
    if (/^Thought (?:for|持续) (.+)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Thought (?:for|持续) (.+)$/i, '思考了 $1'));
    }
    if (/^Thinking (?:for|持续) (.+)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Thinking (?:for|持续) (.+)$/i, '思考了 $1'));
    }
    if (/^Thinking \((.+)\)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Thinking \((.+)\)$/i, '正在思考 ($1)'));
    }
    if (/^Worked (?:for|持续) (.+)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Worked (?:for|持续) (.+)$/i, '总耗时 $1'));
    }
    if (/^\d+ files? changed(.*)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^(\d+) files? changed(.*)/i, '$1 个文件已更改$2'));
    }
    if (/^(\d+)\s+searches?$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^(\d+)\s+searches?/i, '$1 次搜索'));
    }
    if (/^Edited (.*) \+(\d+) -(\d+)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Edited (.*) \+(\d+) -(\d+)/i, '编辑 $1 (+$2 -$3)'));
    }
    if (/^\d+(?:\.\d+)?% of the (?:customization )?budget is (?:available|used)[.。]?$/i.test(trimmed)) {
      const fixed = trimmed
        .replace(/(\d+(?:\.\d+)?)% of the (?:customization )?budget is available[.。]?/i, '自定义额度尚有 $1% 可用。')
        .replace(/(\d+(?:\.\d+)?)% of the (?:customization )?budget is used[.。]?/i, '已使用 $1% 的自定义额度。');
      return cacheAndReturn(text, trimmed, fixed);
    }

    // Quota & reset countdowns
    if (/^(Weekly|Five[- ]Hour|5[- ]Hour|Hourly|Daily)\s+Limit\s+Remaining$/i.test(trimmed)) {
      const lower = trimmed.toLowerCase();
      const fixed = lower.includes('weekly') ? '每周限额剩余'
        : (lower.includes('five') || lower.includes('5')) ? '5 小时限额剩余'
        : lower.includes('hourly') ? '每小时限额剩余'
        : '每日限额剩余';
      return cacheAndReturn(text, trimmed, fixed);
    }
    if (/^(\d+(?:\.\d+)?%?)\s+(?:remaining|left)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^(\d+(?:\.\d+)?%?)\s+(?:remaining|left)$/i, '$1 剩余'));
    }
    if (/^(\d+)h\s+limit$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^(\d+)h\s+limit$/i, '$1 小时限额'));
    }
    if (/^Resets?\s+in\s+(.+)$/i.test(trimmed)) {
      const timePart = trimmed.replace(/^Resets?\s+in\s+/i, '')
        .replace(/(\d+)\s*d(?:ays?)?/gi, '$1 天 ')
        .replace(/(\d+)\s*h(?:(?:ou)?rs?)?/gi, '$1 小时 ')
        .replace(/(\d+)\s*m(?:in(?:ute)?s?)?/gi, '$1 分钟 ')
        .replace(/(\d+)\s*s(?:ec(?:ond)?s?)?/gi, '$1 秒 ')
        .replace(/\s+/g, ' ').trim();
      return cacheAndReturn(text, trimmed, timePart + '后重置');
    }
    if (/^(\d+)\s+hours?\s+(\d+)\s+minutes?$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^(\d+)\s+hours?\s+(\d+)\s+minutes?$/i, '$1 小时 $2 分钟'));
    }
    if (/^(\d+)\s+minutes?$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^(\d+)\s+minutes?$/i, '$1 分钟'));
    }
    if (/^(\d+)\s+hours?$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^(\d+)\s+hours?$/i, '$1 小时'));
    }
    if (/^(\d+)\s+days?$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^(\d+)\s+days?$/i, '$1 天'));
    }
    if (/^Last\s+(\d+)\s+days?$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Last\s+(\d+)\s+days?$/i, '最近 $1 天'));
    }
    if (/^Last\s+(\d+)\s+hours?$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Last\s+(\d+)\s+hours?$/i, '最近 $1 小时'));
    }
    if (/^(\d+)\s+turns?$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^(\d+)\s+turns?$/i, '$1 回合'));
    }
    if (/^Turn (\d+)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Turn (\d+)$/i, '第 $1 回合'));
    }
    if (/^Version\s+(\d+.*)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Version\s+(\d+.*)$/i, '版本 $1'));
    }
    if (/^Models within this group:\s*(.*)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Models within this group:\s*(.*)$/i, (_, l) => '本组内的模型：' + l.trim()));
    }
    if (/^Select project, current: (.+)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Select project, current: (.+)$/i, (_, v) => '选择项目，当前：' + v));
    }
    if (/^Agent permissions preset selector, current: (.+)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Agent permissions preset selector, current: (.+)$/i, (_, v) => '智能体权限预设选择器，当前：' + v.replace(/Turbo/gi, '极速模式')));
    }
    if (/^No\s+(?:automations?|自动化)\s+yet$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, '暂无自动化');
    }
    if (/^Search customizations\.{0,3}$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, '搜索自定义项...');
    }
    if (/^Reconnecting to (.+?)[.…⋯]?$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Reconnecting to (.+?)[.…⋯]?$/i, '正在重新连接到 $1…'));
    }
    if (/^Disconnected from (.+?)$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^Disconnected from (.+?)$/i, '已断开与 $1 的连接'));
    }
    if (/^See\s+(\d+)\s+more$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^See\s+(\d+)\s+more$/i, '查看更多 ($1)'));
    }
    if (/^See\s+less$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, '收起');
    }
    if (/^(\d+)\s+(?:tools?|工具)\s+enabled$/i.test(trimmed)) {
      return cacheAndReturn(text, trimmed, trimmed.replace(/^(\d+)\s+(?:tools?|工具)\s+enabled$/i, '已启用 $1 个工具'));
    }

    // 1. Direct literal match
    if (Object.prototype.hasOwnProperty.call(dictionary, trimmed)) {
      return cacheAndReturn(text, trimmed, dictionary[trimmed]);
    }
    const normalizedSpace = trimmed.replace(/\s+/g, ' ');
    if (Object.prototype.hasOwnProperty.call(dictionary, normalizedSpace)) {
      return cacheAndReturn(text, trimmed, dictionary[normalizedSpace]);
    }
    const caseHit = lowerDictionary.get(trimmed.toLowerCase());
    if (caseHit !== undefined) {
      return cacheAndReturn(text, trimmed, caseHit);
    }

    // 2. Punctuation stripping & reconstruction
    let core = trimmed;
    let trailPunc = '';
    let matchPunc = '';
    const puncMatch = core.match(/(\.\.\.|…|\.|\?|!|:|：|？|！|。)$/);
    if (puncMatch) {
      matchPunc = puncMatch[0];
      core = core.slice(0, -matchPunc.length).trim();
      if (matchPunc === '.') trailPunc = '。';
      else if (matchPunc === '?') trailPunc = '？';
      else if (matchPunc === '!') trailPunc = '！';
      else if (matchPunc === ':') trailPunc = '：';
      else trailPunc = matchPunc;
    }

    const coreHit = (Object.prototype.hasOwnProperty.call(dictionary, core) ? dictionary[core] : undefined) || lowerDictionary.get(core.toLowerCase());
    if (coreHit !== undefined) {
      return cacheAndReturn(text, trimmed, coreHit + trailPunc);
    }

    // 3. Word-by-word fallback strictly for <= 3 plain words
    if (/[\u4e00-\u9fa5]/.test(core)) return text;
    if (/[-_\\/.]/.test(core)) return text;
    const wordsCount = core.split(/\s+/).filter(Boolean).length;
    if (wordsCount > 3 || !CORE_WORDS_UNION_REGEX) return text;

    let replaced = false;
    const temp = core.replace(CORE_WORDS_UNION_REGEX, (matched) => {
      const lower = matched.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(coreWords, lower)) {
        replaced = true;
        return coreWords[lower];
      }
      return matched;
    });
    if (!replaced) return text;

    let finalTranslated = temp.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2');
    if (matchPunc) finalTranslated += trailPunc;
    return cacheAndReturn(text, trimmed, finalTranslated);
  }

  const codeClassPattern = /(?:^|[\s_-])(monaco-editor|editor-instance|hljs|shiki|prism|codemirror|line-content|gutter|codeblock|code-block|code-line|view-line)(?:$|[\s_-])/i;
  const iconClassPattern = /(?:^|[\s_-])(google-symbols|codicon|material-icons|material-symbols-outlined|material-symbols-rounded)(?:$|[\s_-])/i;

  const MENTION_CATEGORIES = new Set([
    'Rules', '规则',
    'Conversation', '对话',
    'PDF Document', 'PDF 文档',
    'MCP Resource', 'MCP 资源',
    'Browser Page', '浏览器页面',
    'Browser Text', '浏览器文本',
    'Directory', '目录',
    'Git Commit', 'Git 提交',
    'Git Diff', 'Git 差异'
  ]);

  const skipCache = new WeakMap();

  function shouldSkipNode(node) {
    if (!node) return true;
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!element) return false;
    if (skipCache.has(element)) return skipCache.get(element);

    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'KBD', 'SAMP', 'VAR', 'SVG'];
    if (skipTags.includes(element.tagName)) {
      skipCache.set(element, true);
      return true;
    }

    if (element.className && typeof element.className === 'string' && iconClassPattern.test(element.className)) {
      skipCache.set(element, true);
      return true;
    }

    const isMenuOptionLabel = element.closest && element.closest('[data-testid="menu-option-label"]');
    if (isMenuOptionLabel) {
      const labelText = (isMenuOptionLabel.innerText || isMenuOptionLabel.textContent || '').trim();
      const skip = !MENTION_CATEGORIES.has(labelText);
      skipCache.set(element, skip);
      return skip;
    }

    if (element.closest && element.closest('button[data-testid="thinking-collapsible-trigger"]')) {
      skipCache.set(element, false);
      return false;
    }

    const textContent = (element.innerText || element.textContent || '').trim();
    if (/^(?:Quote|Ask(?:\s+|\s*\/\s*)btw)(?:\s+(?:Ctrl|Cmd)\+[a-zA-Z0-9]+)?$/i.test(textContent)) {
      skipCache.set(element, false);
      return false;
    }

    const isActionPill = textContent.length <= 40 && /^(Explored|Exploring|Ran|Run|Running|Viewed|Viewing|Edited|Editing|Thought|Thinking|Working|Done|Analyzed|Analyzing|Created|Creating|Deleted|Deleting|Waiting|Rejected|Errored|Completed|Used)(\s+(command|commands|files?|tools?|artifacts?))?$/i.test(textContent);
    if (isActionPill) {
      let inProtected = false;
      let checkCur = element;
      while (checkCur && checkCur !== document.body) {
        if (checkCur.classList && (checkCur.classList.contains('group/user-input-step') || checkCur.classList.contains('cursor-edit'))) {
          inProtected = true;
          break;
        }
        if (checkCur.parentElement && checkCur.parentElement.querySelector) {
          const trigger = checkCur.parentElement.querySelector(':scope > button[data-testid="thinking-collapsible-trigger"]');
          if (trigger && checkCur !== trigger && !trigger.contains(checkCur)) {
            inProtected = true;
            break;
          }
        }
        checkCur = checkCur.parentElement;
      }
      if (!inProtected) {
        skipCache.set(element, false);
        return false;
      }
    }

    if (element.tagName === 'CODE' && !isActionPill) {
      skipCache.set(element, true);
      return true;
    }
    if (element.tagName === 'PRE' || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      skipCache.set(element, true);
      return true;
    }

    let cur = element;
    let shouldSkip = false;
    while (cur && cur !== document.body) {
      if (skipCache.has(cur)) {
        shouldSkip = skipCache.get(cur);
        break;
      }
      if (cur.tagName === 'PRE' || cur.tagName === 'SVG') {
        shouldSkip = true;
        break;
      }
      if (cur.getAttribute) {
        const ce = cur.getAttribute('contenteditable');
        const role = cur.getAttribute('role');
        if (
          ce === 'true' ||
          role === 'textbox' ||
          role === 'code' ||
          role === 'tree' ||
          role === 'treeitem' ||
          cur.getAttribute('data-lexical-editor') === 'true' ||
          cur.getAttribute('data-ag-localization-skip') !== null ||
          cur.getAttribute('data-language') ||
          cur.getAttribute('data-code') ||
          cur.getAttribute('data-line') ||
          cur.getAttribute('data-line-number')
        ) {
          shouldSkip = true;
          break;
        }
      }
      if (cur.parentElement && cur.parentElement.querySelector) {
        const trigger = cur.parentElement.querySelector(':scope > button[data-testid="thinking-collapsible-trigger"]');
        if (trigger && cur !== trigger && !trigger.contains(cur)) {
          shouldSkip = true;
          break;
        }
      }
      if (cur.classList && (
        cur.classList.contains('cursor-edit') ||
        cur.classList.contains('thought-content') ||
        cur.classList.contains('thinking-content') ||
        cur.classList.contains('thought-box') ||
        cur.classList.contains('group/user-input-step') ||
        cur.classList.contains('user-message') ||
        cur.classList.contains('cursor-text') ||
        cur.classList.contains('monaco-editor') ||
        cur.classList.contains('editor-instance') ||
        cur.classList.contains('input-area') ||
        cur.classList.contains('chat-input')
      )) {
        shouldSkip = true;
        break;
      }
      if (cur.className && typeof cur.className === 'string') {
        const lowerClass = cur.className.toLowerCase();
        if (lowerClass.includes('code-line') || lowerClass.includes('view-line') || codeClassPattern.test(cur.className) || iconClassPattern.test(cur.className)) {
          shouldSkip = true;
          break;
        }
      }
      cur = cur.parentElement;
    }

    skipCache.set(element, shouldSkip);
    return shouldSkip;
  }

  const translatedNodes = new WeakSet();

  function tryCombinedSentenceTranslation(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    const children = Array.prototype.slice.call(element.childNodes);
    if (children.length < 2) return false;

    const slots = [];
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!child.nodeValue.trim()) {
          slots.push({ type: 'space', node: child });
        } else {
          slots.push({ type: 'text', node: child });
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.childNodes.length !== 1 || child.firstChild.nodeType !== Node.TEXT_NODE) return false;
        slots.push({ type: 'anchor', node: child, anchorText: child.firstChild.nodeValue.trim() });
      } else {
        return false;
      }
    }

    const anchors = slots.filter(s => s.type === 'anchor');
    if (!anchors.length) return false;

    let fullText = '';
    for (const child of children) {
      fullText += child.nodeType === Node.TEXT_NODE ? child.nodeValue : child.textContent;
    }
    const key = fullText.trim();
    if (!key || !/[A-Za-z]/.test(key)) return false;

    let translated = Object.prototype.hasOwnProperty.call(dictionary, key) ? dictionary[key] : lowerDictionary.get(key.toLowerCase());
    if (!translated) translated = translateString(key);
    if (!translated || translated === key) return false;

    let probe = 0;
    for (const a of anchors) {
      if (!a.anchorText) return false;
      const idx = translated.indexOf(a.anchorText, probe);
      if (idx < 0) return false;
      a.start = idx;
      a.end = idx + a.anchorText.length;
      probe = a.end;
    }

    let anchorIdx = 0;
    let consumed = 0;
    for (const s of slots) {
      if (s.type === 'anchor') {
        consumed = anchors[anchorIdx].end;
        anchorIdx++;
        continue;
      }
      if (s.type === 'space') {
        s.node.nodeValue = '';
        translatedNodes.add(s.node);
        continue;
      }
      const segEnd = anchorIdx < anchors.length ? anchors[anchorIdx].start : translated.length;
      s.node.nodeValue = translated.slice(consumed, segEnd);
      translatedNodes.add(s.node);
      consumed = segEnd;
    }
    return true;
  }

  function translateNode(node) {
    if (!node) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      ['placeholder', 'title', 'aria-label'].forEach(attr => {
        if (node.hasAttribute && node.hasAttribute(attr)) {
          const original = node.getAttribute(attr);
          if (original) {
            const translated = translateString(original);
            if (original !== translated) node.setAttribute(attr, translated);
          }
        }
      });
    }
    if (shouldSkipNode(node)) return;

    if (node.nodeType === Node.TEXT_NODE) {
      if (translatedNodes.has(node)) return;
      const original = node.nodeValue;
      if (!original || !original.trim()) return;
      const translated = translateString(original);
      if (original !== translated) {
        node.nodeValue = translated;
        translatedNodes.add(node);
      } else if (!/[a-zA-Z]/.test(original)) {
        translatedNodes.add(node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.hasAttribute && node.hasAttribute('value') && node.tagName !== 'INPUT' && node.tagName !== 'TEXTAREA') {
        const origVal = node.getAttribute('value');
        if (origVal) {
          const trVal = translateString(origVal);
          if (origVal !== trVal) node.setAttribute('value', trVal);
        }
      }
      const containerText = (node.textContent || '').trim();
      const emptyMatch = containerText.match(/^No\s+(automations?|automation|自动化|conversations?|conversation|对话|groups?|group|分组)\s+yet[.。]?$/i);
      if (emptyMatch) {
        const emptyMap = {
          automations: '暂无自动化', automation: '暂无自动化', '自动化': '暂无自动化',
          conversations: '暂无对话', conversation: '暂无对话', '对话': '暂无对话',
          groups: '暂无分组', group: '暂无分组', '分组': '暂无分组',
        };
        const targetText = emptyMap[emptyMatch[1].toLowerCase()] || '暂无自动化';
        let setDone = false;
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];
          if (child.nodeType === Node.TEXT_NODE) {
            child.nodeValue = setDone ? '' : targetText;
            translatedNodes.add(child);
            setDone = true;
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            child.textContent = setDone ? '' : targetText;
            setDone = true;
          }
        }
        return;
      }

      tryCombinedSentenceTranslation(node);

      if (node.shadowRoot) {
        observeRoot(node.shadowRoot);
        translateNode(node.shadowRoot);
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        translateNode(node.childNodes[i]);
      }
    } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      for (let i = 0; i < node.childNodes.length; i++) {
        translateNode(node.childNodes[i]);
      }
    }
  }

  const observerConfig = {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label', 'value']
  };

  const observedRoots = new WeakSet();
  let isTranslating = false;
  let batchScheduled = false;
  const pendingAddedNodes = new Set();
  const pendingTextNodes = new Set();
  const pendingAttrNodes = new Map();

  const scheduleFrame = (fn) => {
    if (typeof queueMicrotask === 'function') queueMicrotask(fn);
    else if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fn);
    else setTimeout(fn, 0);
  };

  function scheduleBatchTranslation() {
    if (batchScheduled) return;
    batchScheduled = true;
    scheduleFrame(processBatchTranslation);
  }

  function processBatchTranslation() {
    batchScheduled = false;
    if (isTranslating) return;
    isTranslating = true;
    try {
      if (pendingAttrNodes.size > 0) {
        for (const [target, attrs] of pendingAttrNodes) {
          for (const attrName of attrs) {
            if (attrName === 'value' && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) continue;
            if (attrName === 'placeholder' || attrName === 'title' || attrName === 'aria-label' || !shouldSkipNode(target)) {
              const orig = target.getAttribute(attrName);
              if (orig) {
                const tr = translateString(orig);
                if (orig !== tr) target.setAttribute(attrName, tr);
              }
            }
          }
        }
        pendingAttrNodes.clear();
      }
      if (pendingTextNodes.size > 0) {
        for (const node of pendingTextNodes) {
          if (!shouldSkipNode(node)) {
            const orig = node.nodeValue;
            if (orig && orig.trim()) {
              const tr = translateString(orig);
              if (orig !== tr) {
                node.nodeValue = tr;
                translatedNodes.add(node);
              } else if (!/[a-zA-Z]/.test(orig)) {
                translatedNodes.add(node);
              }
            }
          }
        }
        pendingTextNodes.clear();
      }
      if (pendingAddedNodes.size > 0) {
        const roots = [];
        for (const node of pendingAddedNodes) {
          let hasAncestor = false;
          let p = node.parentElement;
          while (p) {
            if (pendingAddedNodes.has(p)) { hasAncestor = true; break; }
            p = p.parentElement;
          }
          if (!hasAncestor) roots.push(node);
        }
        pendingAddedNodes.clear();
        for (let i = 0; i < roots.length; i++) {
          const node = roots[i];
          if (node.shadowRoot) observeRoot(node.shadowRoot);
          if (!shouldSkipNode(node)) translateNode(node);
        }
      }
    } catch (_) {
    } finally {
      isTranslating = false;
    }
  }

  function observeRoot(root) {
    if (!root || observedRoots.has(root)) return;
    observedRoots.add(root);
    const observer = new MutationObserver((mutations) => {
      let dirty = false;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'childList') {
          for (let j = 0; j < m.addedNodes.length; j++) {
            const n = m.addedNodes[j];
            if (n.shadowRoot) observeRoot(n.shadowRoot);
            pendingAddedNodes.add(n);
            dirty = true;
          }
        } else if (m.type === 'characterData') {
          translatedNodes.delete(m.target);
          pendingTextNodes.add(m.target);
          dirty = true;
        } else if (m.type === 'attributes') {
          let s = pendingAttrNodes.get(m.target);
          if (!s) { s = new Set(); pendingAttrNodes.set(m.target, s); }
          s.add(m.attributeName);
          dirty = true;
        }
      }
      if (dirty) scheduleBatchTranslation();
    });
    observer.observe(root, observerConfig);
  }

  const origAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function () {
    const sr = origAttachShadow.apply(this, arguments);
    observeRoot(sr);
    return sr;
  };

  function safeScan() {
    if (document.body) {
      try { translateNode(document.body); } catch (_) {}
      observeRoot(document.body);
    }
  }

  function startObserver() {
    safeScan();
    [50, 150, 400, 1000, 2500].forEach(d => setTimeout(safeScan, d));
    window.addEventListener('focus', safeScan);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') safeScan();
    });
    try {
      const origPush = history.pushState;
      history.pushState = function () {
        const ret = origPush.apply(this, arguments);
        setTimeout(safeScan, 50);
        return ret;
      };
      const origReplace = history.replaceState;
      history.replaceState = function () {
        const ret = origReplace.apply(this, arguments);
        setTimeout(safeScan, 50);
        return ret;
      };
      window.addEventListener('popstate', () => setTimeout(safeScan, 50));
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
})();
