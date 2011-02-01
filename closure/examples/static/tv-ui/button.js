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
 * @fileoverview Push button.
 */
goog.provide('tv.ui.Button');

goog.require('tv.ui');
goog.require('tv.ui.Component');

/**
 * Constructs button.
 * @constructor
 * @extends {tv.ui.Component}
 */
tv.ui.Button = function() {
  goog.base(this);
};
goog.inherits(tv.ui.Button, tv.ui.Component);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.Button.CLASS = 'tv-button';
tv.ui.registerDecorator(tv.ui.Button, tv.ui.Button.CLASS);

/**
 * CSS classes that control and reflect look and feel of component.
 * These classes are applied to root DOM element.
 * @enum {string}
 */
tv.ui.Button.Class = {
  /**
   * Applied if button should dispatch ACTION event on mouse down.
   * By default ACTION event is dispatched on mouse click, which is problematic
   * if click target is animated because mouse up happens at different point
   * than mouse down.
   * @see #isEager
   */
  EAGER: 'tv-button-eager'
};

/**
 * Event types dispatched by button.
 * @enum {string}
 */
tv.ui.Button.EventType = {
  /**
   * Dispatched when button is clicked or Enter is pressed when button is
   * focused.
   */
  ACTION: goog.events.getUniqueId('action')
};

/**
 * @inheritDoc
 */
tv.ui.Button.prototype.decorate = function(element) {
  goog.base(this, 'decorate', element);

  this.getEventHandler().listen(
      element, goog.events.EventType.CLICK, this.onClick);
  this.getEventHandler().listen(
      this, tv.ui.Button.EventType.ACTION, this.onAction);
};

/**
 * @inheritDoc
 */
tv.ui.Button.prototype.getClass = function() {
  return tv.ui.Button.CLASS;
};

/**
 * @inheritDoc
 */
tv.ui.Button.prototype.onMouseDown = function(event) {
  goog.base(this, 'onMouseDown', event);

  if (this.isEager() &&
      event.isButton(goog.events.BrowserEvent.MouseButton.LEFT)) {
    this.dispatchAction();
    event.stopPropagation();
  }
};

/**
 * @return {boolean} Whether ACTION event is dispatched on mouse down.
 */
tv.ui.Button.prototype.isEager = function() {
  return goog.dom.classes.has(this.getElement(), tv.ui.Button.Class.EAGER);
};

/**
 * Handles click event.
 * Dispatches ACTION event.
 * @param {goog.events.Event} event Click event.
 * @protected
 */
tv.ui.Button.prototype.onClick = function(event) {
  if (!this.isEager() &&
      event.isButton(goog.events.BrowserEvent.MouseButton.LEFT)) {
    this.dispatchAction();
    event.stopPropagation();
  }
};

/**
 * Handles key event.
 * Dispatches ACTION event if Enter is pressed.
 * @param {goog.events.KeyEvent} event Key event.
 * @protected
 */
tv.ui.Button.prototype.onKey = function(event) {
  switch (event.keyCode) {
    case goog.events.KeyCodes.ENTER:
    case goog.events.KeyCodes.SPACE:
      this.dispatchAction();
      event.stopPropagation();
      break;
  }
};

/**
 * Dispatches ACTION event.
 * @private
 */
tv.ui.Button.prototype.dispatchAction = function() {
  this.dispatchEvent(tv.ui.Button.EventType.ACTION);
};

/**
 * Handles action event.
 * To be used in subclasses.
 * @param {goog.events.Event} event Action event.
 * @protected
 */
tv.ui.Button.prototype.onAction = goog.nullFunction;
