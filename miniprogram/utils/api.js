const { API_BASE_URL } = require("../config");

const TOKEN_KEY = "hina_session_token";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || "";
}

function setToken(token) {
  if (token) wx.setStorageSync(TOKEN_KEY, token);
  else wx.removeStorageSync(TOKEN_KEY);
}

function request(path, options = {}) {
  const token = getToken();
  const method = options.method || "GET";
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data: options.data,
      header: headers,
      timeout: options.timeout || 45000,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data || {});
          return;
        }
        const data = response.data || {};
        const message = typeof data.error === "string" ? data.error : "request_failed";
        if (response.statusCode === 401) setToken("");
        reject(new ApiError(message, response.statusCode, data));
      },
      fail(error) {
        reject(new ApiError(error.errMsg || "network_failed", 0, {}));
      },
    });
  });
}

module.exports = {
  ApiError,
  TOKEN_KEY,
  getToken,
  request,
  setToken,
};
