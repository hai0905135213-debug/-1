const API_BASE_URL = 'http://127.0.0.1:3001/api'

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

function request(path, options = {}) {
  const token = getToken()

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method || 'GET',
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
  logout: () => clearAuthSession(),
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
