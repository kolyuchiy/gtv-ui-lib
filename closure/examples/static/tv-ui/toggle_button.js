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
 * @fileoverview Button with on/off state.
 */
goog.provide('tv.ui.ToggleButton');

goog.require('tv.ui');
goog.require('tv.ui.Button');

/**
 * Constructs button.
 * @constructor
 * @extends {tv.ui.Button}
 */
tv.ui.ToggleButton = function() {
  goog.base(this);
};
goog.inherits(tv.ui.ToggleButton, tv.ui.Button);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.ToggleButton.CLASS = 'tv-toggle-button';

/**
 * CSS classes that control and reflect look and feel of toggle button.
 * These classes are applied to root DOM element.
 * @enum {string}
 */
tv.ui.ToggleButton.Class = {
  /**
   * Applied when toggle button is in on state.
   * Class triggers decoration.
   */
  ON: 'tv-toggle-button-on'
};

tv.ui.registerDecorator(tv.ui.ToggleButton, tv.ui.ToggleButton.CLASS);

/**
 * @return {boolean} Whether button is in 'on' state.
 */
tv.ui.ToggleButton.prototype.isOn = function() {
  return goog.dom.classes.has(this.getElement(), tv.ui.ToggleButton.Class.ON);
};

/**
 * Sets on/off state.
 * @param {boolean} on Button state.
 */
tv.ui.ToggleButton.prototype.setOn = function(on) {
  goog.dom.classes.enable(this.getElement(), tv.ui.ToggleButton.Class.ON, on);
};

/**
 * @inheritDoc
 */
tv.ui.ToggleButton.prototype.getClass = function() {
  return tv.ui.ToggleButton.CLASS;
};

/**
 * Handles action event.
 * Toggles button state.
 * @param {goog.events.Event} event Action event.
 * @protected
 */
tv.ui.ToggleButton.prototype.onAction = function(event) {
  this.setOn(!this.isOn());
};
