export const fetchAdmin = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('admin_token');
  const headers = { 
    ...options.headers, 
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
  };
  return fetch(url, { ...options, headers, credentials: "include" });
};
