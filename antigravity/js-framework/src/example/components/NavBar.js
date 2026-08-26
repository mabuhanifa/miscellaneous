import { Component, h, router } from '../../framework/index.js';

export class NavBar extends Component {
  render() {
    return h('div', { className: 'nav' },
      h('a', { 
        onclick: (e) => { e.preventDefault(); router.navigate('/'); } 
      }, 'All'),
      h('a', { 
        onclick: (e) => { e.preventDefault(); router.navigate('/active'); } 
      }, 'Active'),
      h('a', { 
        onclick: (e) => { e.preventDefault(); router.navigate('/completed'); } 
      }, 'Completed')
    );
  }
}
