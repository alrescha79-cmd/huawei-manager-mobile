(function () {
  console.clear();
  const API_FILTER = '/api/';

  /* =========================
     FETCH POST
  ========================== */
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource.url;
    const method = (config?.method || 'GET').toUpperCase();

    if (!url.includes(API_FILTER) || method !== 'POST') {
      return originalFetch(...args);
    }

    console.group(`🔴 FETCH POST`);
    console.log('URL:', url);
    console.log('Request Body:', config?.body || null);

    const response = await originalFetch(...args);
    const clone = response.clone();

    try {
      console.log('Response Body:', await clone.text());
    } catch {
      console.log('Response Body: <unreadable>');
    }

    console.groupEnd();
    return response;
  };

  /* =========================
     XHR POST
  ========================== */
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (
      !this._url ||
      !this._url.includes(API_FILTER) ||
      this._method !== 'POST'
    ) {
      return originalSend.apply(this, arguments);
    }

    console.group(`🔴 XHR POST`);
    console.log('URL:', this._url);
    console.log('Request Body:', body);

    this.addEventListener('load', function () {
      console.log('Response Body:', this.responseText);
      console.groupEnd();
    });

    return originalSend.apply(this, arguments);
  };

  console.log('✅ Huawei POST API Logger ACTIVE');
})();
