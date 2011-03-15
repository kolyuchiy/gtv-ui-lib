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
 * @fileoverview Menu is a container with transient selection which is aware of
 * items with sub-menus.
 */
goog.provide('tv.ui.Menu');

goog.require('goog.functions');
goog.require('tv.ui.Container');

/**
 * Constructs menu.
 * @constructor
 * @extends {tv.ui.Container}
 */
tv.ui.Menu = function() {
  goog.base(this);
};
goog.inherits(tv.ui.Menu, tv.ui.Container);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.Menu.CLASS = 'tv-menu';
tv.ui.registerDecorator(tv.ui.Menu, tv.ui.Menu.CLASS);

/**
 * CSS classes that reflect look of menu.
 * @enum {string}
 */
tv.ui.Menu.Class = {
  /**
   * Applied to root element if currently selected menu item is expanded.
   * @see #hasOpenedSubMenu
   */
  HAS_OPENED_SUB_MENU: 'tv-menu-has-opened-sub-menu'
};

/**
 * @inheritDoc
 */
tv.ui.Menu.prototype.getClass = function() {
  return tv.ui.Menu.CLASS;
};

/**
 * @inheritDoc
 */
tv.ui.Menu.prototype.addChild = function(child) {
  goog.base(this, 'addChild', child);

  if (child instanceof tv.ui.SubMenu) {
    this.getEventHandler().listen(
        child,
        tv.ui.Container.EventType.SELECT_CHILD,
        this.onSubMenuSelectChild_);
  }
};

/**
 * Handles selection change in one of sub-menus.
 * @param {goog.events.Event} event Selection change event.
 * @private
 */
tv.ui.Menu.prototype.onSubMenuSelectChild_ = function(event) {
  var selectedChild = this.getSelectedChild();
  if (event.target == selectedChild) {
    goog.dom.classes.enable(
        this.getElement(),
        tv.ui.Menu.Class.HAS_OPENED_SUB_MENU,
        selectedChild.getSelectedChild() instanceof tv.ui.Menu);
    // TODO(maksym): Dispatch tv.ui.Menu.EventType.TOGGLE_SUB_MENU.
  }
};

/**
 * @inheritDoc
 */
tv.ui.Menu.prototype.onKey = function(event) {
  // Consider following component structure:
  //
  // - 1
  //   - 1.1
  //   - 1.2
  // - 2
  //
  // If component 1.2 is focused and user presses Down key, focus will traverse
  // to component 2. However if components 1.1 and 1.2 are placed inside
  // sub-menu, such behavior is unwanted. Instead, we pass this key through.

  if (this.hasOpenedSubMenu()) {
    return;
  }

  goog.base(this, 'onKey', event);
};

/**
 * @return {boolean} Whether currently selected menu item is expanded.
 */
tv.ui.Menu.prototype.hasOpenedSubMenu = function() {
  return goog.dom.classes.has(
      this.getElement(), tv.ui.Menu.Class.HAS_OPENED_SUB_MENU);
};

/**
 * @inheritDoc
 */
tv.ui.Menu.prototype.adjustSelectionFromKey = function(keyCode) {
  if (this.hasOpenedSubMenu()) {
    // Don't alter the selection if we're not the final selected menu.
    return false;
  }
  goog.base(this, 'adjustSelectionFromKey', keyCode);
};
