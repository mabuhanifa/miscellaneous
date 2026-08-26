import { Component } from './component.js';

/**
 * @typedef {Object} VNode
 * @property {string|function|class} tag
 * @property {Object} [props]
 * @property {(VNode|string)[]} children
 * @property {HTMLElement} [el]
 * @property {Component} [componentInstance]
 */

export function h(tag, props = {}, ...children) {
  return { tag, props: props || {}, children: children.flat() };
}

export function mount(vnode, container) {
  const el = createDOM(vnode);
  if (el) {
    container.appendChild(el);
  }
  return el;
}

function createDOM(vnode) {
  if (vnode === null || vnode === undefined) return document.createTextNode('');
  
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return document.createTextNode(vnode);
  }

  // Handle Components
  if (typeof vnode.tag === 'function') {
    // Check if it's a class extending Component
    if (vnode.tag.prototype && vnode.tag.prototype.render) {
      const instance = new vnode.tag(vnode.props);
      vnode.componentInstance = instance;
      // Pass children as props.children
      instance.props.children = vnode.children;
      
      const renderedVNode = instance.render();
      instance.vNode = renderedVNode; // Store rendered vnode for updates
      const el = createDOM(renderedVNode);
      instance.el = el;
      instance.isMounted = true;
      instance.onMount();
      return el;
    } else {
      // Functional component
      const renderedVNode = vnode.tag({ ...vnode.props, children: vnode.children });
      return createDOM(renderedVNode);
    }
  }

  const el = document.createElement(vnode.tag);
  vnode.el = el;

  if (vnode.props) {
    for (const [key, value] of Object.entries(vnode.props)) {
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.substring(2).toLowerCase(), value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key === 'className') {
        el.className = value;
      } else {
        el.setAttribute(key, value);
      }
    }
  }

  vnode.children.forEach(child => {
    el.appendChild(createDOM(child));
  });

  return el;
}

export function patch(n1, n2) {
  if (n1.tag !== n2.tag) {
    // If component, unmount old
    if (n1.componentInstance) {
        n1.componentInstance._unmount();
    }
    const parent = n1.el.parentNode;
    const newEl = createDOM(n2);
    parent.replaceChild(newEl, n1.el);
    return newEl;
  }

  if (typeof n1 === 'string' || typeof n1 === 'number') {
    if (n1 !== n2) {
      n1.el.nodeValue = n2;
      n2.el = n1.el; // Transfer ref
      return n1.el;
    }
    return;
  }

  // Handle Components
  if (typeof n1.tag === 'function') {
     if (n1.componentInstance) {
         // Update existing component instance
         const instance = n1.componentInstance;
         n2.componentInstance = instance; // Transfer instance
         instance.props = { ...n2.props, children: n2.children }; // Update props
         instance.update(); // Trigger re-render
         n2.el = instance.el; // Transfer ref
         return;
     } else {
         // Functional component update
         // We don't have an instance, so we just re-render and patch the result.
         // But we need to know the 'old' rendered vnode.
         // This is where functional components are tricky in this simple impl without a fiber/internal instance.
         // For simplicity, let's just re-render and patch the DOM? 
         // But we need the old VNode structure to diff against.
         // In this simple version, functional components don't hold state, so re-rendering is fine,
         // BUT we need the old VNode to patch against.
         // We didn't store the old rendered VNode for functional components in `createDOM`.
         // Let's assume for now we only support Class Components for stateful things, 
         // and Functional Components are just stateless factories.
         // To support patching functional components, we'd need to attach the rendered VNode to n1.
         // Let's hack it: createDOM for func returns the DOM, but doesn't attach the rendered VNode to n1.
         // We need to change createDOM to attach it.
     }
  }

  const el = (n2.el = n1.el);

  const oldProps = n1.props || {};
  const newProps = n2.props || {};

  for (const key in newProps) {
    const oldValue = oldProps[key];
    const newValue = newProps[key];
    if (oldValue !== newValue) {
      if (key.startsWith('on')) {
        const eventName = key.substring(2).toLowerCase();
        el.removeEventListener(eventName, oldValue);
        el.addEventListener(eventName, newValue);
      } else if (key === 'style') {
        Object.assign(el.style, newValue);
      } else if (key === 'className') {
        el.className = newValue;
      } else {
        el.setAttribute(key, newValue);
      }
    }
  }

  for (const key in oldProps) {
    if (!(key in newProps)) {
      if (key.startsWith('on')) {
        el.removeEventListener(key.substring(2).toLowerCase(), oldProps[key]);
      } else {
        el.removeAttribute(key);
      }
    }
  }

  const oldChildren = n1.children;
  const newChildren = n2.children;
  const commonLength = Math.min(oldChildren.length, newChildren.length);

  for (let i = 0; i < commonLength; i++) {
    patch(oldChildren[i], newChildren[i]);
  }

  if (newChildren.length > oldChildren.length) {
    newChildren.slice(oldChildren.length).forEach(child => {
      el.appendChild(createDOM(child));
    });
  }

  if (newChildren.length < oldChildren.length) {
    oldChildren.slice(newChildren.length).forEach((child) => {
       // We need to remove the element.
       // If child is a component, unmount it.
       if (child.componentInstance) child.componentInstance._unmount();
       // If child is a VNode, it has .el
       if (child.el && child.el.parentNode) {
           child.el.parentNode.removeChild(child.el);
       }
    });
  }
}
