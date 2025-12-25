(function () {
  console.clear();
  const API_FILTER = '/api/';

  /* =========================
     FETCH GET
  ========================== */
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [resource] = args;
    const url = typeof resource === 'string' ? resource : resource.url;

    if (!url.includes(API_FILTER)) {
      return originalFetch(...args);
    }

    console.group(`🔵 FETCH GET`);
    console.log('URL:', url);

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
     XHR GET
  ========================== */
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    if (
      !this._url ||
      !this._url.includes(API_FILTER) ||
      this._method !== 'GET'
    ) {
      return originalSend.apply(this, arguments);
    }

    console.group(`🔵 XHR GET`);
    console.log('URL:', this._url);

    this.addEventListener('load', function () {
      console.log('Response Body:', this.responseText);
      console.groupEnd();
    });

    return originalSend.apply(this, arguments);
  };

  console.log('✅ Huawei GET API Logger ACTIVE');
})();
