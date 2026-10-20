const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'

function getToken() {
  try {
    return uni.getStorageSync('authToken') || ''
  } catch {
    return ''
  }
}

function setAuthSession(data) {
  uni.setStorageSync('authToken', data.token)
  uni.setStorageSync('currentUser', data.user)
  uni.setStorageSync('currentProfile', data.profile)
}

function clearAuthSession() {
  uni.removeStorageSync('authToken')
  uni.removeStorageSync('currentUser')
  uni.removeStorageSync('currentProfile')
}

export function request(path, options = {}) {
  const token = getToken()

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method || 'GET',
      timeout: 15000,
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {})
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }

        if (res.statusCode === 401) {
          clearAuthSession()
          // 微信登录本身失败时留在登录页，其余受保护操作引导重新登录。
          if (!path.startsWith('/auth/')) uni.navigateTo({ url: '/pages/login/index' })
        }
        reject(res.data?.error || { message: '请求失败' })
      },
      fail: reject
    })
  })
}

export const authApi = {
  login: async (data) => {
    const result = await request('/auth/login', { method: 'POST', data })
    setAuthSession(result)
    return result
  },
  wechat: async () => {
    const credential = await new Promise((resolve, reject) => uni.login({ provider: 'weixin', success: resolve, fail: reject }))
    const result = await request('/auth/wechat', { method: 'POST', data: { code: credential.code } })
    setAuthSession(result)
    return result
  },
  me: () => request('/auth/me'),
  logout: async () => { try { await request('/auth/logout', { method: 'POST' }) } finally { clearAuthSession() } },
  token: getToken
}

export const mealApi = {
  list: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return request(`/meals${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/meals/${id}`),
  mine: () => request('/meals/mine'),
  create: (data) => request('/meals', { method: 'POST', data }),
  join: (id) => request(`/meals/${id}/join`, { method: 'POST' }),
  leave: (id) => request(`/meals/${id}/leave`, { method: 'POST' }),
  review: (id, data) => request(`/meals/${id}/reviews`, { method: 'POST', data })
}

export const profileApi = {
  me: () => request('/profile'),
  update: (data) => request('/profile', { method: 'PUT', data })
}

export const postApi = {
  list: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return request(`/posts${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/posts/${id}`),
  create: (data) => request('/posts', { method: 'POST', data }),
  join: (id) => request(`/posts/${id}/join`, { method: 'POST' }),
  leave: (id) => request(`/posts/${id}/leave`, { method: 'POST' })
}

export const restaurantApi = {
  list: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return request(`/restaurants${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/restaurants/${id}`)
}

export const timetableApi = {
  import: (data) => request('/timetable/import', { method: 'POST', data }),
  mine: () => request('/timetable/mine'),
  captcha: () => request('/timetable/captcha'),
  proxyLogin: (data) => request('/timetable/proxy-login', { method: 'POST', data })
}
