/**
 * @typedef {Object} Route
 * @property {string} path
 * @property {function} component
 */

/**
 * @typedef {Object} RouterOptions
 * @property {Route[]} routes
 */

export function createRouter(options) {
  const routes = options.routes;
  let currentRoute = null;
  let listeners = [];
  let beforeEachHook = null;
  let afterEachHook = null;

  function match(path) {
    const [pathname, search] = path.split('?');
    const query = {};
    if (search) {
      new URLSearchParams(search).forEach((value, key) => {
        query[key] = value;
      });
    }

    for (const route of routes) {
      const paramNames = [];
      const regexPath = route.path.replace(/:([^/]+)/g, (_, key) => {
        paramNames.push(key);
        return '([^/]+)';
      });

      const match = pathname.match(new RegExp(`^${regexPath}$`));
      if (match) {
        const params = match.slice(1).reduce((acc, val, i) => {
          acc[paramNames[i]] = val;
          return acc;
        }, {});

        return {
          ...route,
          params,
          query,
          fullPath: path
        };
      }
    }
    return null;
  }

  function navigate(path) {
    const to = match(path);
    const from = currentRoute;

    if (beforeEachHook) {
      beforeEachHook(to, from, (arg) => {
        if (arg === false) return;
        if (typeof arg === 'string') {
          navigate(arg);
          return;
        }
        performNavigation(path, to, from);
      });
    } else {
      performNavigation(path, to, from);
    }
  }

  function performNavigation(path, to, from) {
    window.history.pushState({}, '', path);
    currentRoute = to;
    listeners.forEach(cb => cb(to));
    if (afterEachHook) afterEachHook(to, from);
  }

  function listen() {
    window.addEventListener('popstate', () => {
      const to = match(window.location.pathname + window.location.search);
      const from = currentRoute;
      // Handle back/forward navigation
      // Note: popstate doesn't allow cancelling, so beforeEach is tricky here.
      // We'll just update state.
      currentRoute = to;
      listeners.forEach(cb => cb(to));
      if (afterEachHook) afterEachHook(to, from);
    });
    
    // Initial load
    const initialPath = window.location.pathname + window.location.search;
    const to = match(initialPath);
    currentRoute = to;
    listeners.forEach(cb => cb(to));
  }

  return {
    routes,
    navigate,
    subscribe: (cb) => listeners.push(cb),
    beforeEach: (hook) => { beforeEachHook = hook; },
    afterEach: (hook) => { afterEachHook = hook; },
    start: listen,
    getCurrentRoute: () => currentRoute
  };
}
