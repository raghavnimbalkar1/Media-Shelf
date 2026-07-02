const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  settings: {
    get: (key) => ipcRenderer.invoke("settings:get", key),
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
  },
  tmdb: {
    search: (query) => ipcRenderer.invoke("tmdb:search", query),
    detail: (ref) => ipcRenderer.invoke("tmdb:detail", ref),
  },
  items: {
    add: (payload) => ipcRenderer.invoke("items:add", payload),
    list: (filters) => ipcRenderer.invoke("items:list", filters),
    update: (id, patch) => ipcRenderer.invoke("items:update", id, patch),
    delete: (id) => ipcRenderer.invoke("items:delete", id),
    stats: () => ipcRenderer.invoke("items:stats"),
  },
  files: {
    pickImage: () => ipcRenderer.invoke("files:pickImage"),
  },
  data: {
    export: () => ipcRenderer.invoke("data:export"),
    import: () => ipcRenderer.invoke("data:import"),
  },
  movies: {
    add: (payload) => ipcRenderer.invoke("items:add", payload),
    list: (filters) => ipcRenderer.invoke("items:list", filters),
    update: (id, patch) => ipcRenderer.invoke("items:update", id, patch),
    delete: (id) => ipcRenderer.invoke("items:delete", id),
    stats: () => ipcRenderer.invoke("items:stats"),
  },
});
