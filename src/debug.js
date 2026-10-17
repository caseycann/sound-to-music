// True when the page URL has ?debug (e.g. http://localhost:5173/?debug).
export const DEBUG = new URLSearchParams(window.location.search).has('debug')
