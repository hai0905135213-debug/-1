import { request } from "./api";
export const teamApi = {
  apply: (id) => request(`/meals/${id}/apply`, { method: "POST" }),
  withdraw: (id) => request(`/meals/${id}/withdraw`, { method: "POST" }),
  applications: (id) => request(`/meals/${id}/applications`),
  decide: (id, applicationId, decision) =>
    request(`/meals/${id}/applications/${applicationId}/${decision}`, {
      method: "POST",
    }),
  messages: (id, after = 0) => request(`/meals/${id}/messages?after=${after}`),
  message: (id, content) =>
    request(`/meals/${id}/messages`, { method: "POST", data: { content } }),
  action: (id, action) => request(`/meals/${id}/${action}`, { method: "POST" }),
  notifications: () => request("/notifications"),
  readNotifications: () => request("/notifications/read", { method: "POST" }),
  adminUsers: () => request("/admin/users"),
  access: (id, status) =>
    request(`/admin/users/${id}/access`, { method: "POST", data: { status } }),
  reports: () => request("/admin/reports"),
  reportStatus: (id, status) =>
    request(`/admin/reports/${id}`, { method: "POST", data: { status } }),
};
