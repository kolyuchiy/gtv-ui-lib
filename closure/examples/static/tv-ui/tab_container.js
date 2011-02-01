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
 * @fileoverview Container that displays child components in tabs.
 * Container consists of two child containers - tab bar and tab content, whose
 * selections are synchronized. If tab bar isn't focusable, container will
 * transfer focus to tab content.
 */
goog.provide('tv.ui.TabContainer');

goog.require('tv.ui.Container');

/**
 * Constructs tab container.
 * @constructor
 * @extends {tv.ui.Container}
 */
tv.ui.TabContainer = function() {
  goog.base(this);
};
goog.inherits(tv.ui.TabContainer, tv.ui.Container);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.TabContainer.CLASS = 'tv-tab-container';
tv.ui.registerDecorator(tv.ui.TabContainer, tv.ui.TabContainer.CLASS);

/**
 * CSS classes that control look and feel of tab container.
 * @enum {string}
 */
tv.ui.TabContainer.Class = {
  /**
   * Denotes element that serves at tab bar.
   * This element should be decorated as tv.ui.Container.
   * @see #getBarContainer
   */
  BAR: 'tv-tab-container-bar',

  /**
   * Denotes element that serves at tab content.
   * This element should be decorated as tv.ui.Container.
   * @see #getContentContainer
   */
  CONTENT: 'tv-tab-container-content'
};

/**
 * @type {tv.ui.Container}
 * @private
 */
tv.ui.TabContainer.prototype.barContainer_;

/**
 * @type {tv.ui.Container}
 * @private
 */
tv.ui.TabContainer.prototype.contentContainer_;

/**
 * @return {tv.ui.Container} Bar container.
 */
tv.ui.TabContainer.prototype.getBarContainer = function() {
  return this.barContainer_;
};

/**
 * @return {tv.ui.Container} Content container.
 */
tv.ui.TabContainer.prototype.getContentContainer = function() {
  return this.contentContainer_;
};

/**
 * @inheritDoc
 */
tv.ui.TabContainer.prototype.getClass = function() {
  return tv.ui.TabContainer.CLASS;
};

/**
 * @inheritDoc
 */
tv.ui.TabContainer.prototype.addChild = function(child) {
  goog.base(this, 'addChild', child);

  if (goog.dom.classes.has(
      child.getElement(), tv.ui.TabContainer.Class.BAR)) {
    goog.asserts.assert(
        child instanceof tv.ui.Container, 'Tab bar should be a container.');
    this.barContainer_ = /** @type {tv.ui.Container} */(child);
    this.getEventHandler().listen(
        this.barContainer_,
        tv.ui.Container.EventType.SELECT_CHILD,
        this.onBarSelectChild);
    this.getEventHandler().listen(
        this.barContainer_,
        tv.ui.Component.EventType.FOCUS,
        this.onBarCaptureFocus,
        true);
  } else if (goog.dom.classes.has(
      child.getElement(), tv.ui.TabContainer.Class.CONTENT)) {
    goog.asserts.assert(
        child instanceof tv.ui.Container, 'Tab content should be a container.');
    this.contentContainer_ = /** @type {tv.ui.Container} */(child);
    this.getEventHandler().listen(
        this.contentContainer_,
        tv.ui.Container.EventType.SELECT_CHILD,
        this.onContentSelectChild);
  }
};

/**
 * Handles child selection in bar container.
 * @protected
 */
tv.ui.TabContainer.prototype.onBarSelectChild = function() {
  if (this.contentContainer_) {
    this.synchronizeSelectedChildren_(
        this.barContainer_, this.contentContainer_);
  }
};

/**
 * Handles child selection in content container.
 * @protected
 */
tv.ui.TabContainer.prototype.onContentSelectChild = function() {
  if (this.barContainer_) {
    this.synchronizeSelectedChildren_(
        this.contentContainer_, this.barContainer_);
  }
};

/**
 * Sets selected child in destination container based on selected child in
 * source container.
 * @param {tv.ui.Container} sourceContainer Source container.
 * @param {tv.ui.Container} destinationContainer Destination container.
 * @private
 */
tv.ui.TabContainer.prototype.synchronizeSelectedChildren_ = function(
    sourceContainer, destinationContainer) {
  var selectedChildIndex = goog.array.indexOf(
      sourceContainer.getChildren(),
      sourceContainer.getSelectedChild());

  destinationContainer.setSelectedChild(
      destinationContainer.getChildren()[selectedChildIndex]);
};

/**
 * Handles focus on bar container in capture phase.
 * @protected
 */
tv.ui.TabContainer.prototype.onBarCaptureFocus = function(event) {
  if (!this.barContainer_.isFocusable()) {
    // We need to wait until child component updates selection chain.
    this.getEventHandler().listenOnce(
        event.target, tv.ui.Component.EventType.FOCUS, function() {
          this.tryFocus(this.contentContainer_);
        });
  }
};

/**
 * Focuses given component if it is able to receive focus.
 * Does nothing otherwise.
 * @param {goog.ui.Component} component Component to focus.
 * @protected
 */
tv.ui.TabContainer.prototype.tryFocus = function(component) {
  if (component.isFocusable()) {
    this.getDocument().setFocusedComponent(
        component.getSelectedDescendantOrSelf());
  }
};
