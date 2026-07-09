const API_BASE_URL = 'http://localhost:3000/api'

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        ...(options.header || {})
      },
      success: (res) => resolve(res.data),
      fail: reject
    })
  })
}

export const mealApi = {
  list: () => request('/meals'),
  detail: (id) => request(`/meals/${id}`),
  create: (data) => request('/meals', { method: 'POST', data }),
  join: (id) => request(`/meals/${id}/join`, { method: 'POST' }),
  leave: (id) => request(`/meals/${id}/leave`, { method: 'POST' })
}

export const profileApi = {
  me: () => request('/profile/me'),
  update: (data) => request('/profile/me', { method: 'PUT', data })
}
