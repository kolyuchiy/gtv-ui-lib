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
 * @fileoverview Two-dimensional grid. It's a container that consists
 * of other containers, whose selections are synchronized.
 *
 */
goog.provide('tv.ui.Grid');

goog.require('tv.ui.Container');

/**
 * Constructs grid.
 * @constructor
 * @extends {tv.ui.Container}
 */
tv.ui.Grid = function() {
  goog.base(this);
};
goog.inherits(tv.ui.Grid, tv.ui.Container);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.Grid.CLASS = 'tv-grid';
tv.ui.registerDecorator(tv.ui.Grid, tv.ui.Grid.CLASS);

/**
 * @inheritDoc
 */
tv.ui.Grid.prototype.getClass = function() {
  return tv.ui.Grid.CLASS;
};

/**
 * @inheritDoc
 */
tv.ui.Grid.prototype.addChild = function(child) {
  goog.base(this, 'addChild', child);

  goog.asserts.assert(
      goog.dom.classes.has(child.getElement(), tv.ui.Container.CLASS),
      'Children of tv.ui.Grid must be containers.');

  this.getEventHandler().listen(
      child,
      tv.ui.Container.EventType.SELECT_CHILD,
      this.onSelectChild_);
};

/**
 * Synchronizes all containers' selected child indices.
 * @param event {goog.events.Event} Selection event.
 * @private
 */
tv.ui.Grid.prototype.onSelectChild_ = function(event) {
  var currentRow = event.target;

  var selectedIndex = goog.array.indexOf(
      currentRow.getChildren(),
      currentRow.getSelectedChild());

  goog.array.forEach(this.getChildren(), function(child) {
     if (child != currentRow) {
       var index = Math.min(selectedIndex, child.getChildren().length - 1);
       child.setSelectedChild(child.getChildren()[index]);
     }
  });
};
