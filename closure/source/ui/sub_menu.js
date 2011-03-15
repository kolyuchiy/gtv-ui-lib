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
 * @fileoverview Sub-menu is a container which has exactly one button and one
 * menu. If button is pressed, menu gets focused. If Esc key is pressed while
 * menu is focused, focus is brought back to button. Menu could also contain
 * special back button which is marked with CSS class. Pressing back button in
 * menu is analogous to pressing Esc.
 */
goog.provide('tv.ui.SubMenu');

goog.require('goog.functions');
goog.require('tv.ui.Container');

/**
 * Constructs menu.
 * @constructor
 * @extends {tv.ui.Container}
 */
tv.ui.SubMenu = function() {
  goog.base(this);
};
goog.inherits(tv.ui.SubMenu, tv.ui.Container);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.SubMenu.CLASS = 'tv-sub-menu';
tv.ui.registerDecorator(tv.ui.SubMenu, tv.ui.SubMenu.CLASS);

/**
 * CSS classes that control look and feel of sub-menu.
 * @enum {string}
 */
tv.ui.SubMenu.Class = {
  /**
   * Applied to special button within menu which, when pressed, will focus this
   * sub-menu's button.
   */
  BACK_BUTTON: 'tv-sub-menu-back-button'
};

/**
 * @type {tv.ui.Button}
 * @private
 */
tv.ui.SubMenu.prototype.button_;

/**
 * @type {tv.ui.Menu}
 * @private
 */
tv.ui.SubMenu.prototype.menu_;

/**
 * @inheritDoc
 */
tv.ui.SubMenu.prototype.decorate = function(element) {
  goog.base(this, 'decorate', element);

  this.getEventHandler().listen(
      this, tv.ui.Button.EventType.ACTION, this.onAction);
};

/**
 * @inheritDoc
 */
tv.ui.SubMenu.prototype.getClass = function() {
  return tv.ui.SubMenu.CLASS;
};

/**
 * @inheritDoc
 */
tv.ui.SubMenu.prototype.addChild = function(child) {
  goog.base(this, 'addChild', child);

  if (child instanceof tv.ui.Button) {
    goog.asserts.assert(
        !this.button_, 'Sub-menu should have exactly one button.');
    this.button_ = /** @type {tv.ui.Button} */(child);
  } else if (child instanceof tv.ui.Menu) {
    goog.asserts.assert(
        !this.menu_, 'Sub-menu should have exactly one menu.');
    this.menu_ = /** @type {tv.ui.Menu} */(child);
  }
};

/**
 * @inheritDoc
 */
tv.ui.SubMenu.prototype.onKey = function(event) {
  if (event.keyCode == goog.events.KeyCodes.ESC &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      !event.metaKey &&
      this.getSelectedChild() != this.button_ &&
      this.button_ &&
      this.button_.tryFocus()) {
    event.stopPropagation();
    return;
  }

  goog.base(this, 'onKey', event);
};

/**
 * Handles action event.
 * @param {goog.events.Event} event Action event.
 * @protected
 */
tv.ui.SubMenu.prototype.onAction = function(event) {
  if (event.target == this.button_) {
    if (this.menu_ && this.menu_.tryFocus()) {
      event.stopPropagation();
    }
  } else if (goog.dom.classes.has(
      event.target.getElement(), tv.ui.SubMenu.Class.BACK_BUTTON)) {
    if (this.button_ && this.button_.tryFocus()) {
      event.stopPropagation();
    }
  }
};

/**
 * @inheritDoc
 */
tv.ui.Menu.prototype.adjustSelectionFromKey = function(keyCode) {
  var selectedChild = this.getSelectedChild();
  if (!this.isSelectable() || !selectedChild) {
    return false;
  }
  if (selectedChild.adjustSelectionFromKey) {
    return selectedChild.adjustSelectionFromKey(keyCode);
  } else {
    return selectedChild.isSelectable();
  }
};
