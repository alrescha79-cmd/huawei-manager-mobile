(function () {
  console.clear();

  const API_FILTER = '/api/';

  /* =========================
     FETCH INTERCEPT
  ========================== */
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource.url;

    if (!url.includes(API_FILTER)) {
      return originalFetch(...args);
    }

    const method = (config?.method || 'GET').toUpperCase();

    console.group(`📡 FETCH ${method}`);
    console.log('URL:', url);

    if (method === 'POST' && config?.body) {
      console.log('Request Body:', config.body);
    }

    try {
      const response = await originalFetch(...args);
      const clone = response.clone();

      const text = await clone.text();
      console.log('Response Body:', text);

      console.groupEnd();
      return response;
    } catch (err) {
      console.error('Fetch Error:', err);
      console.groupEnd();
      throw err;
    }
  };

  /* =========================
     XHR INTERCEPT
  ========================== */
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (!this._url || !this._url.includes(API_FILTER)) {
      return originalSend.apply(this, arguments);
    }

    console.group(`📡 XHR ${this._method}`);
    console.log('URL:', this._url);

    if (this._method === 'POST' && body) {
      console.log('Request Body:', body);
    }

    this.addEventListener('load', function () {
      console.log('Response Body:', this.responseText);
      console.groupEnd();
    });

    this.addEventListener('error', function () {
      console.error('XHR Error');
      console.groupEnd();
    });

    return originalSend.apply(this, arguments);
  };

  console.log('✅ Huawei API Logger ACTIVE (filter: /api/)');
})();
