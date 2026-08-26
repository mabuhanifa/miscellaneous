import { mount, patch } from './dom.js';

export class Component {
  constructor(props = {}) {
    this.props = props;
    this.state = {};
    this.vNode = null;
    this.el = null;
    this.isMounted = false;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.update();
  }

  onMount() {}
  onUpdate() {}
  onUnmount() {}

  render() {
    throw new Error('Component must implement render method');
  }

  // Internal: Mounts the component
  _mount(container) {
    this.vNode = this.render();
    this.el = mount(this.vNode, container);
    this.isMounted = true;
    this.onMount();
    return this.el;
  }

  // Internal: Updates the component
  update() {
    if (!this.isMounted) return;
    
    const newVNode = this.render();
    patch(this.vNode, newVNode);
    this.vNode = newVNode;
    this.el = this.vNode.el; // Update reference if root changed
    this.onUpdate();
  }

  // Internal: Unmounts the component
  _unmount() {
    this.onUnmount();
    this.isMounted = false;
    // DOM removal is handled by parent or router usually, 
    // but if we need to clean up listeners, do it here.
  }
}
