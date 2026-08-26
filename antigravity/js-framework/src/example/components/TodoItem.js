import { Component, h } from '../../framework/index.js';

export class TodoItem extends Component {
  render() {
    const { todo, onToggle, onDelete } = this.props;
    
    return h('div', { className: 'todo-item' },
      h('span', { 
        className: todo.completed ? 'completed' : '',
        onclick: () => onToggle(todo.id)
      }, todo.text),
      h('button', { onclick: () => onDelete(todo.id) }, 'Delete')
    );
  }
}
