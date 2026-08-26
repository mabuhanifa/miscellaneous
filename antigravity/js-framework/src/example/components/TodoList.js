import { Component, h, store } from '../../framework/index.js';
import { TodoItem } from './TodoItem.js';

export class TodoList extends Component {
  constructor(props) {
    super(props);
    this.state = store.getState();
    this.unsubscribe = null;
  }

  onMount() {
    this.unsubscribe = store.subscribe(() => {
      this.setState(store.getState());
    });
  }

  onUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  addTodo() {
    const input = document.getElementById('new-todo');
    if (input.value.trim()) {
      store.dispatch({ type: 'ADD_TODO', payload: input.value.trim() });
      input.value = '';
    }
  }

  toggleTodo(id) {
    store.dispatch({ type: 'TOGGLE_TODO', payload: id });
  }

  deleteTodo(id) {
    store.dispatch({ type: 'DELETE_TODO', payload: id });
  }

  render() {
    const path = window.location.pathname; // Simple way to get current filter
    let filteredTodos = this.state.todos;
    
    if (path === '/active') {
      filteredTodos = this.state.todos.filter(t => !t.completed);
    } else if (path === '/completed') {
      filteredTodos = this.state.todos.filter(t => t.completed);
    }

    return h('div', {},
      h('div', {},
        h('input', { id: 'new-todo', placeholder: 'What needs to be done?' }),
        h('button', { onclick: () => this.addTodo() }, 'Add')
      ),
      h('div', {}, 
        ...filteredTodos.map(todo => 
          h(TodoItem, { 
            todo, 
            onToggle: (id) => this.toggleTodo(id), 
            onDelete: (id) => this.deleteTodo(id) 
          })
        )
      )
    );
  }
}
