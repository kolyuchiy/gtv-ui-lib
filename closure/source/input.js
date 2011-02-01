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
 * @fileoverview Single-line text input that is able to display hint when empty.
 */
goog.provide('tv.ui.Input');

goog.require('goog.dom');
goog.require('goog.dom.selection');
goog.require('goog.events.InputHandler');
goog.require('tv.ui');
goog.require('tv.ui.Component');

/**
 * Constructs input.
 * @constructor
 * @extends {tv.ui.Component}
 */
tv.ui.Input = function() {
  goog.base(this);
};
goog.inherits(tv.ui.Input, tv.ui.Component);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.Input.CLASS = 'tv-input';
tv.ui.registerDecorator(tv.ui.Input, tv.ui.Input.CLASS);

/**
 * CSS classes that control and reflect look and feel of input.
 * @enum {string}
 */
tv.ui.Input.Class = {
  /**
   * Applied to optional element which serves as hint.
   * Hint is displayed when input contains no text, should be hidden by default.
   * @see #HINT_SHOWN
   */
  HINT: 'tv-input-hint',

  /**
   * Applied to hint element when it should be visible.
   */
  HINT_SHOWN: 'tv-input-hint-shown'
};

/**
 * @type {Element}
 * @private
 */
tv.ui.Input.prototype.inputElement_;

/**
 * @inheritDoc
 */
tv.ui.Input.prototype.disposeInternal = function() {
  delete this.inputElement_;

  goog.base(this, 'disposeInternal');
};

/**
 * @inheritDoc
 */
tv.ui.Input.prototype.decorate = function(element) {
  goog.base(this, 'decorate', element);

  this.inputElement_ = element.tagName == 'INPUT' ?
      element :
      goog.dom.getElementsByTagNameAndClass('input', null, element)[0];
  goog.asserts.assert(this.inputElement_, 'No input element found.');

  this.hintElement_ = goog.dom.getElementByClass(
      tv.ui.Input.Class.HINT, element);
  this.updateHintVisibility_();

  this.getEventHandler().listen(
      this.inputElement_,
      goog.events.InputHandler.EventType.INPUT,
      this.onInput);
};

/**
 * @return {Element} 'input' element.
 */
tv.ui.Input.prototype.getInputElement = function() {
  return this.inputElement_;
};

/**
 * @inheritDoc
 */
tv.ui.Input.prototype.getClass = function() {
  return tv.ui.Input.CLASS;
};

/**
 * Handles key event.
 * Consumes navigation keys if cursor is not on the boundaries of input.
 * @param {goog.events.KeyEvent} event Key event.
 * @protected
 */
tv.ui.Input.prototype.onKey = function(event) {
  if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
    return;
  }

  var selectionPoints = goog.dom.selection.getEndPoints(this.inputElement_);
  var hasSelection = selectionPoints[0] != selectionPoints[1];

  switch (event.keyCode) {
    case goog.events.KeyCodes.LEFT:
        if (selectionPoints[0] != 0 || hasSelection) {
          event.stopPropagation();
        }
      break;
    case goog.events.KeyCodes.RIGHT:
      if (selectionPoints[0] != this.inputElement_.value.length ||
          hasSelection) {
        event.stopPropagation();
      }
      break;
  }
};

/**
 * @inheritDoc
 */
tv.ui.Input.prototype.onFocus = function(event) {
  goog.base(this, 'onFocus', event);

  if (this.inputElement_.ownerDocument.activeElement != this.inputElement_) {
    goog.Timer.callOnce(function() {
      this.inputElement_.focus();
    }, 0, this);
  }
};

/**
 * @inheritDoc
 */
tv.ui.Input.prototype.onBlur = function(event) {
  goog.base(this, 'onBlur', event);
  this.inputElement_.blur();
};

/**
 * Handles input event.
 * @param {goog.events.BrowserEvent} event Input event.
 * @protected
 */
tv.ui.Input.prototype.onInput = function(event) {
  this.updateHintVisibility_();
};

/**
 * Shows or hides hint.
 * @private
 */
tv.ui.Input.prototype.updateHintVisibility_ = function() {
  if (this.hintElement_) {
    goog.dom.classes.enable(
        this.hintElement_,
        tv.ui.Input.Class.HINT_SHOWN,
        !this.inputElement_.value);
  }
};
