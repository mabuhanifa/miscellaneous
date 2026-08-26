/**
 * @typedef {Object} Action
 * @property {string} type
 * @property {any} [payload]
 */

/**
 * @typedef {function(any, Action): any} Reducer
 */

/**
 * Creates a Redux-inspired store.
 * @param {Reducer} reducer - A function that returns the next state tree.
 * @param {any} [initialState] - The initial state.
 * @returns {Object} The store object.
 */
export function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = new Set();

  /**
   * Returns the current state tree.
   * @returns {any}
   */
  function getState() {
    return state;
  }

  /**
   * Dispatches an action to change the state.
   * @param {Action} action
   */
  function dispatch(action) {
    state = reducer(state, action);
    listeners.forEach(listener => listener());
  }

  /**
   * Adds a change listener.
   * @param {function} listener
   * @returns {function} Unsubscribe function.
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  // Initialize state
  dispatch({ type: '@@INIT' });

  return {
    getState,
    dispatch,
    subscribe
  };
}
