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
 * @fileoverview Base class for TV UI components.
 */
goog.provide('tv.ui.Component');

goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.style');
goog.require('tv.ui');
goog.require('tv.ui.Document');

/**
 * Constructs component.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
tv.ui.Component = function() {
  /**
   * Facilitates listening for events: automatically binds 'this' to handlers
   * and allows unlisten of all events at once.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
};
goog.inherits(tv.ui.Component, goog.events.EventTarget);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.Component.CLASS = 'tv-component';
tv.ui.registerDecorator(tv.ui.Component, tv.ui.Component.CLASS);

/**
 * CSS classes that control and reflect look and feel of component.
 * These classes are applied to root DOM element.
 * @enum {string}
 */
tv.ui.Component.Class = {
  /**
   * Applied when component receives focus.
   * @see tv.ui.Component.EventType#FOCUS
   * @see tv.ui.Document#setFocusedComponent
   */
  FOCUSED: 'tv-component-focused',

  /**
   * Applied when component is hidden.
   * @see #isVisible
   */
  HIDDEN: 'tv-component-hidden',

  /**
   * Applied when component cannot be selected.
   * @see #isEnabled
   */
  DISABLED: 'tv-component-disabled'
};

/**
 * Event types dispatched by component.
 *
 * Note to subclass implementers: don't listen for events dispatched by self,
 * override appropriate on...() methods to avoid race conditions with other
 * event handlers on component state mutations. on...() methods are guaranteed
 * to be called first.
 *
 * @enum {string}
 */
tv.ui.Component.EventType = {
  /**
   * Dispatched after component becomes focused in document.
   * Focused component will receive key events.
   * @see #onFocus
   */
  FOCUS: goog.events.getUniqueId('focus'),

  /**
   * Dispatched before component stops being focused in document.
   * @see #onBlur
   */
  BLUR: goog.events.getUniqueId('blur'),

  /**
   * Dispatched when key is pressed while component or one of its children are
   * focused.
   * @see #onKey
   */
  KEY: goog.events.getUniqueId('key')
};

/**
 * Root DOM element of component.
 * @type {Element}
 * @private
 */
tv.ui.Component.prototype.element_;

/**
 * Whether render was already scheduled.
 * @type {boolean}
 * @private
 */
tv.ui.Component.prototype.renderScheduled_;

/**
 * @inheritDoc
 */
tv.ui.Component.prototype.disposeInternal = function() {
  this.eventHandler_.dispose();
  delete this.element_;

  goog.base(this, 'disposeInternal');
};

/**
 * @return {tv.ui.Container} Parent container.
 */
tv.ui.Component.prototype.getParent = function() {
  return /** @type {tv.ui.Container} */(this.getParentEventTarget());
};

/**
 * @param {tv.ui.Container} parent Sets parent container.
 * @protected
 */
tv.ui.Component.prototype.setParent = function(parent) {
  this.setParentEventTarget(parent);
};

/**
 * @return {goog.events.EventHandler} Event handler.
 * @protected
 */
tv.ui.Component.prototype.getEventHandler = function() {
  return this.eventHandler_;
};

/**
 * @return {Element} Root DOM element of component.
 * @protected
 */
tv.ui.Component.prototype.getElement = function() {
  return this.element_;
};

/**
 * Decorates given DOM element and makes it root element for component.
 * @param {Element} element DOM element to decorate.
 */
tv.ui.Component.prototype.decorate = function(element) {
  goog.asserts.assert(
      !this.element_, 'Component is already attached to DOM element.');

  this.element_ = element;
  goog.dom.classes.add(this.element_, this.getClass());

  this.setVisible(!goog.dom.classes.has(
      this.element_, tv.ui.Component.Class.HIDDEN));

  this.eventHandler_.listen(
      element,
      goog.events.EventType.MOUSEDOWN,
      this.onMouseDown);
  this.eventHandler_.listen(
      this, tv.ui.Component.EventType.FOCUS, this.onFocus);
  this.eventHandler_.listen(
      this, tv.ui.Component.EventType.BLUR, this.onBlur);
  this.eventHandler_.listen(
      this, tv.ui.Component.EventType.KEY, this.onKey);
};

/**
 * @return {string} Main CSS class that triggers decoration.
 */
// TODO(maksym): Logic related to this method is dangerous, get rid of it.
tv.ui.Component.prototype.getClass = function() {
  return tv.ui.Component.CLASS;
};

/**
 * @return {tv.ui.Document} Document where component is located.
 */
tv.ui.Component.prototype.getDocument = function() {
  return this.element_ ?
      tv.ui.Document.getInstance(this.element_.ownerDocument) : null;
};

/**
 * @return {boolean} Whether element is focused.
 */
tv.ui.Component.prototype.isFocused = function() {
  return goog.dom.classes.has(this.element_, tv.ui.Component.Class.FOCUSED);
};

/**
 * Called by tv.ui.Document when component gains focus.
 * @suppress {underscore} Intended to be package-private method, thus shouldn't
 * be called by anyone else but tv.ui.Document.
 */
tv.ui.Component.prototype.dispatchFocus_ = function() {
  this.dispatchEvent(tv.ui.Component.EventType.FOCUS);
};

/**
 * Handles focus event.
 * @param {goog.events.Event} event Focus event.
 * @protected
 */
tv.ui.Component.prototype.onFocus = function(event) {
  // Add focused class to element.
  goog.dom.classes.add(this.element_, tv.ui.Component.Class.FOCUSED);

  event.stopPropagation();
};

/**
 * Called by tv.ui.Document when component loses focus.
 * @suppress {underscore} Intended to be package-private method, thus shouldn't
 * be called by anyone else but tv.ui.Document.
 */
tv.ui.Component.prototype.dispatchBlur_ = function() {
  this.dispatchEvent(tv.ui.Component.EventType.BLUR);
};

/**
 * Handles blur event.
 * @param {goog.events.Event} event Blur event.
 * @protected
 */
tv.ui.Component.prototype.onBlur = function(event) {
  // Remove focused class from element.
  goog.dom.classes.remove(this.element_, tv.ui.Component.Class.FOCUSED);

  event.stopPropagation();
};

/**
 * Called by tv.ui.Document on focused component when document receives key
 * event.
 * @param {goog.events.KeyEvent} event Key event. Warning: method is
 *     destructive against event object.
 * @suppress {underscore} Intended to be package-private method, thus shouldn't
 * be called by anyone else but tv.ui.Document.
 */
tv.ui.Component.prototype.dispatchKey_ = function(event) {
  event.type = tv.ui.Component.EventType.KEY;
  event.target = this;
  this.dispatchEvent(event);
};

/**
 * Handles key event.
 * To be used in subclasses.
 * @param {goog.events.KeyEvent} Key event.
 * @protected
 */
tv.ui.Component.prototype.onKey = goog.nullFunction;

/**
 * Handles mouse down event.
 * @param {goog.events.Event} event Mouse down event.
 * @protected
 */
tv.ui.Component.prototype.onMouseDown = function(event) {
  // Whether component and all its ancestors are enabled.
  for (var component = this; component; component = component.getParent()) {
    if (!component.isEnabled()) {
      return;
    }
  }

  // Request focus to component or in case of containers to one of its
  // descendants.
  var focusedComponent = this.getSelectedDescendantOrSelf();
  if (!focusedComponent) {
    return;
  }

  this.getDocument().setFocusedComponent(focusedComponent);
  event.stopPropagation();
};

/**
 * @return {tv.ui.Component} Self, or null if component cannot accept focus.
 */
tv.ui.Component.prototype.getSelectedDescendantOrSelf = function() {
  return this.isEnabled() && this.isVisible() ? this : null;
};

/**
 * Does nothing for non-container components.
 * Used solely because of return value.
 * @return {boolean} True if component can be selected.
 * @protected
 */
tv.ui.Component.prototype.selectFirstChild = function() {
  return this.isEnabled() && this.isVisible();
};

/**
 * @return {boolean} Whether component is visible.
 */
tv.ui.Component.prototype.isVisible = function() {
  return !goog.dom.classes.has(
      this.element_, tv.ui.Component.Class.HIDDEN);
};

/**
 * @param {boolean} visible Sets whether component is visible.
 */
tv.ui.Component.prototype.setVisible = function(visible) {
  goog.dom.classes.enable(
      this.element_, tv.ui.Component.Class.HIDDEN, !visible);

  // As visibility affects whether component can be selected, we need to notify
  // parent container.
  var parent = this.getParent();
  parent && parent.onChildVisibilityChange(this);
};

/**
 * @return {boolean} Whether component can be selected.
 */
tv.ui.Component.prototype.isEnabled = function() {
  return !goog.dom.classes.has(
      this.element_, tv.ui.Component.Class.DISABLED);
};

/**
 * Updates styles and layout according to state of component.
 * Supposed to be used for computation-heavy updates that are too costly to
 * call after every state mutation.
 * @protected
 */
tv.ui.Component.prototype.render = function() {
  this.renderScheduled_ = false;
};

/**
 * Schedules eventual rendering of component.
 * Render is performed only once, no matter how many times it was scheduled.
 * @protected
 */
tv.ui.Component.prototype.scheduleRender = function() {
  if (!this.renderScheduled_) {
    this.renderScheduled_ = true;
    tv.ui.scheduleRender(this);
  }
};
