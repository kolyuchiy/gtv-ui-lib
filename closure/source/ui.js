// Copyright 2011 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview Core utilities for TV components.
 */
// TODO(maksym): Decide on decorate-only approach, replace decorate() with
// constructor and remove setters for final properties.
goog.provide('tv.ui');

goog.require('goog.array');
goog.require('goog.dom');

/**
 * Map from CSS class to component constructor used to create components from
 * DOM tree.
 * @type {Object.<string, Function>}
 * @private
 */
tv.ui.decoratorRegistry_ = {};

/**
 * Registers decorator that will be used to create component from DOM element.
 * @param {Function} decorator Component constructor.
 * @param {string|Array.<string>} classNames CSS class or list of classes that
 *     will trigger component creation.
 */
tv.ui.registerDecorator = function(decorator, classNames) {
  goog.array.forEach(
      goog.isArray(classNames) ? classNames : [classNames],
      function(className) {
        tv.ui.decoratorRegistry_[className] = decorator;
      });
};

/**
 * Finds component constructor by matching it against one of the CSS classes.
 * @param {Array.<string>} classNames List of CSS classes to look for into
 *     decorator registry. First matched class wins.
 * @return {Function} Component constructor or null if registry doesn't contain
 *     match for any of CSS classes.
 */
tv.ui.findDecorator = function(classNames) {
  for (var i = 0; i < classNames.length; i++) {
    var decorator = tv.ui.decoratorRegistry_[classNames[i]];
    if (decorator) {
      return decorator;
    }
  }
  return null;
};

/**
 * Recursively creates components from DOM tree based on CSS classes, including
 * root element. DOM elements that doesn't have appropriate decorators are
 * omitted.
 * @param {Element} element Root element for traversal.
 * @param {Function} opt_handler Handler to be called for each decorated
 *     component.
 * @param {tv.ui.Container} opt_parentContainer Root container for decorated
 *     components.
 */
tv.ui.decorate = function(element, opt_handler, opt_parentContainer) {
  var component;
  var decorator = tv.ui.findDecorator(goog.dom.classes.get(element));
  if (decorator) {
    component = new decorator();
    component.decorate(element);

    opt_parentContainer && opt_parentContainer.addChild(component);
  }

  tv.ui.decorateChildren(
      element, opt_handler, component || opt_parentContainer);

  if (component) {
    opt_handler && opt_handler(component);
  }
};

/**
 * Recursively creates components from DOM tree based on CSS classes, excluding
 * root element. DOM elements that doesn't have appropriate decorators are
 * omitted. Usually used to update content of (already decorated) container.
 * @param {Element} element Root element for traversal.
 * @param {Function} opt_handler Handler to be called for each decorated
 *     component.
 * @param {tv.ui.Container} opt_parentContainer Root container for decorated
 *     components.
 */
tv.ui.decorateChildren = function(element, opt_handler, opt_parentContainer) {
  for (var childNode = element.firstChild; childNode;
      childNode = childNode.nextSibling) {
    if (childNode.nodeType == goog.dom.NodeType.ELEMENT) {
      tv.ui.decorate(
          /** @type {Element} */(childNode),
          opt_handler,
          opt_parentContainer);
    }
  }
};

/**
 * Number of recursive calls to postponeRender() function.
 * @type {number}
 * @private
 */
tv.ui.postponeRenderCount_ = 0;

/**
 * List of components requested rendering.
 * @type {Array.<tv.ui.Component>}
 * @private
 */
tv.ui.componentsScheduledRender_;

/**
 * Postpones all rendering in components until given function exits.
 * Allows to minimize number of layouts and style recalculations in browser.
 * @param {Function} f Function to call, usually causing massive rendering.
 * @param {Object} opt_context Context to call function in.
 */
tv.ui.postponeRender = function(f, opt_context) {
  if (tv.ui.postponeRenderCount_++ == 0) {
    tv.ui.componentsScheduledRender_ = [];
  }

  f.call(opt_context);

  if (--tv.ui.postponeRenderCount_ == 0) {
    goog.array.forEach(tv.ui.componentsScheduledRender_, function(component) {
      component.render();
    });
    delete tv.ui.componentsScheduledRender_;
  }
};

/**
 * Schedules rendering of component if rendering is postponed and performes
 * rendering immediately otherwise.
 * @param {tv.ui.Component} component Component to render.
 */
tv.ui.scheduleRender = function(component) {
  if (tv.ui.postponeRenderCount_ == 0) {
    component.render();
  } else {
    tv.ui.componentsScheduledRender_.push(component);
  }
};
