import { Component, createRouter, createStore, h, mount } from '../framework/index.js';
import { NavBar } from './components/NavBar.js';
import { TodoList } from './components/TodoList.js';

// --- STORE ---
const initialState = {
  todos: JSON.parse(localStorage.getItem('todos') || '[]'),
  filter: 'all'
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TODO':
      const newTodosAdd = [...state.todos, { id: Date.now(), text: action.payload, completed: false }];
      localStorage.setItem('todos', JSON.stringify(newTodosAdd));
      return { ...state, todos: newTodosAdd };
    case 'TOGGLE_TODO':
      const newTodosToggle = state.todos.map(t => 
        t.id === action.payload ? { ...t, completed: !t.completed } : t
      );
      localStorage.setItem('todos', JSON.stringify(newTodosToggle));
      return { ...state, todos: newTodosToggle };
    case 'DELETE_TODO':
      const newTodosDel = state.todos.filter(t => t.id !== action.payload);
      localStorage.setItem('todos', JSON.stringify(newTodosDel));
      return { ...state, todos: newTodosDel };
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    default:
      return state;
  }
}

export const store = createStore(reducer, initialState);

// --- COMPONENTS ---
class App extends Component {
  constructor() {
    super();
    this.currentView = null;
  }

  onMount() {
    // Subscribe to router changes
    router.subscribe((route) => {
      this.currentView = route;
      this.update();
    });
    
    // Initial route
    this.currentView = router.getCurrentRoute();
  }

  render() {
    const ViewComponent = this.currentView ? this.currentView.component : () => h('div', {}, '404 Not Found');
    
    return h('div', {},
      h(NavBar, {}), // We need to handle functional/class components in h()
      h('h1', {}, 'Todo App'),
      h(ViewComponent, { params: this.currentView ? this.currentView.params : {} })
    );
  }
}

// --- ROUTER ---
const routes = [
  { path: '/', component: TodoList },
  { path: '/active', component: TodoList }, // We'll handle filter via props or store
  { path: '/completed', component: TodoList }
];

export const router = createRouter({ routes });

// --- INIT ---
// We need to enhance `h` to handle Component classes and Functions
// Let's monkey-patch or update `dom.js`. 
// For now, let's update `dom.js` to handle Components.
// Wait, `dom.js` `createDOM` doesn't know about Components.
// We need a way to instantiate components.
// Let's update `dom.js` in the next step to support Components in `h`.

router.start();
mount(h(App, {}), document.getElementById('app'));
// Note: App needs to be mounted properly. 
// Since App is a Component, we should probably use `mount` with a VNode of App?
// Or manually mount.
// Let's fix `dom.js` to handle Components first.
