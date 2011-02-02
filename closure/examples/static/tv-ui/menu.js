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
 * @fileoverview Menu with submenus.
 * Based on tab container. Tab bar should consist of buttons which represent
 * menu items, tab content - of containers which represent submenus. When button
 * in tab bar is pressed, menu will focus appropriate container in tab content.
 */
goog.provide('tv.ui.Menu');

goog.require('tv.ui.Button');
goog.require('tv.ui.TabContainer');

/**
 * Constructs menu.
 * @constructor
 * @extends {tv.ui.TabContainer}
 */
tv.ui.Menu = function() {
  goog.base(this);
};
goog.inherits(tv.ui.Menu, tv.ui.TabContainer);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.Menu.CLASS = 'tv-menu';
tv.ui.registerDecorator(tv.ui.Menu, tv.ui.Menu.CLASS);

/**
 * CSS classes that control look and feel of menu.
 * @enum {string}
 */
tv.ui.Menu.Class = {
  /**
   * A button inside tab content which when pressed will bring focus back to
   * corresponding menu item in tab bar.
   */
  BACK_BUTTON: 'tv-menu-back-button'
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

  if (goog.dom.classes.has(
      child.getElement(), tv.ui.TabContainer.Class.BAR)) {
    this.getEventHandler().listen(
        /** @type {tv.ui.Container} */(child),
        tv.ui.Button.EventType.ACTION,
        this.onBarAction);
  } else if (goog.dom.classes.has(
      child.getElement(), tv.ui.TabContainer.Class.CONTENT)) {
    this.getEventHandler().listen(
        /** @type {tv.ui.Container} */(child),
        tv.ui.Button.EventType.ACTION,
        this.onContentAction);
    this.getEventHandler().listen(
        /** @type {tv.ui.Container} */(child),
        tv.ui.Component.EventType.KEY,
        this.onContentKey);
  }
};

/**
 * @inheritDoc
 */
tv.ui.Menu.prototype.onBarSelectChild = function(event) {
  goog.base(this, 'onBarSelectChild', event);
  this.resetSubMenuSelection_();
};

/**
 * @inheritDoc
 */
tv.ui.Menu.prototype.onBarFocus = function(event) {
  this.resetSubMenuSelection_();
  goog.base(this, 'onBarFocus', event);
};

/**
 * Handles action event on tab bar.
 * Focuses sub-menu that corresponds to selected menu item.
 * @param {goog.events.Event} event Action event.
 * @protected
 */
tv.ui.Menu.prototype.onBarAction = function(event) {
  if (!goog.dom.classes.has(
      event.target.getElement(), tv.ui.Menu.Class.BACK_BUTTON)) {
    this.resetSubMenuSelection_();
    this.tryFocusSelectedDescendant(this.getContentContainer());
    event.stopPropagation();
  }
};

/**
 * Handles action event on tab content.
 * Focuses menu item that corresponds to selected sub-menu if 'Back' button was
 * pressed.
 * @param {goog.events.Event} event Action event.
 * @protected
 */
tv.ui.Menu.prototype.onContentAction = function(event) {
  if (goog.dom.classes.has(
      event.target.getElement(), tv.ui.Menu.Class.BACK_BUTTON)) {
    this.tryFocusSelectedDescendant(this.getBarContainer());
    event.stopPropagation();
  }
};

/**
 * Handles key event on tab content.
 * Focuses menu item that corresponds to selected sub-menu if Esc is pressed.
 * @param {goog.events.KeyEvent} event Key event.
 * @protected
 */
tv.ui.Menu.prototype.onContentKey = function(event) {
  if (event.keyCode == goog.events.KeyCodes.ESC) {
    this.tryFocusSelectedDescendant(this.getBarContainer());
    event.stopPropagation();
  }
};

/**
 * Selects first child in sub-menu.
 * @private
 */
tv.ui.Menu.prototype.resetSubMenuSelection_ = function() {
  if (this.getContentContainer()) {
    var subMenu = this.getContentContainer().getSelectedChild();
    if (subMenu instanceof tv.ui.Container) {
      subMenu.selectFirstChild();
    }
  }
};
