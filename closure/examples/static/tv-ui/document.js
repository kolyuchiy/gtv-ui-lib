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
 * @fileoverview Document controls focus and key event flow.
 */
goog.provide('tv.ui.Document');

goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.events.KeyHandler');

/**
 * Constructs document.
 * Document should not be constructed directly but rather by means of
 * tv.ui.Document.getInstance().
 * @param {Document} document DOM document.
 * @private
 * @constructor
 */
tv.ui.Document = function(document) {
  /**
   * Facilitates listening for events: automatically binds 'this' to handlers
   * and allows unlisten of all events at once.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.eventHandler_.listen(
      new goog.events.KeyHandler(document),
      goog.events.KeyHandler.EventType.KEY,
      this.onKey);
};

/**
 * Component that is currently focused.
 * @type {tv.ui.Component}
 * @private
 */
tv.ui.Document.prototype.focusedComponent_;

/**
 * Component that will eventually become focused.
 * Used as one-element queue.
 * @type {tv.ui.Component}
 * @private
 */
tv.ui.Document.prototype.componentPendingFocus_;

/**
 * Returns cached instance of document, which is created if necessary.
 * @param {Document=} opt_document DOM document.
 * @return {tv.ui.Document} Instance of document for given DOM document.
 */
tv.ui.Document.getInstance = function(opt_document) {
  var document = opt_document || window.document;
  if (!document.tvUiDocument_) {
    document.tvUiDocument_ = new tv.ui.Document(document);
  }
  return document.tvUiDocument_;
};

/**
 * Handles key event.
 * Dispatches key event to currently focused component if any.
 * @param {goog.events.KeyEvent} event Key event.
 * @protected
 */
tv.ui.Document.prototype.onKey = function(event) {
  this.focusedComponent_ && this.focusedComponent_.dispatchKey_(event);
};

/**
 * @return {tv.ui.Component} Component that is currently focused.
 */
tv.ui.Document.prototype.getFocusedComponent = function() {
  return this.focusedComponent_;
};

/**
 * Sets focused component in document.
 * Note that it is not guaranteed that component will be focused immediately
 * after exiting this method or even at all.
 * @param {tv.ui.Component} componentPendingFocus Component to focus.
 */
tv.ui.Document.prototype.setFocusedComponent = function(componentPendingFocus) {
  // Detect recursive call from blur or focus handler.
  var recursive = goog.isDef(this.componentPendingFocus_);

  // Remember component to focus.
  // If called recursively from handler, last call wins.
  this.componentPendingFocus_ = componentPendingFocus;

  // Request will proceed in loop below.
  if (recursive) {
    return;
  }

  while (true) {
    componentPendingFocus = this.componentPendingFocus_;
    if (this.focusedComponent_ == componentPendingFocus) {
      delete this.componentPendingFocus_;
      return;
    }

    // Find lowest common ancestor in component tree.
    var blurCandidates = this.getAncestorsAndSelf_(this.focusedComponent_);
    var focusCandidates = this.getAncestorsAndSelf_(componentPendingFocus);
    var highestBlurIndex = blurCandidates.length - 1;
    var highestFocusIndex = focusCandidates.length - 1;
    if (highestBlurIndex > 0 && highestFocusIndex > 0) {
      while (blurCandidates[highestBlurIndex] ==
          focusCandidates[highestFocusIndex]) {
        highestBlurIndex--;
        highestFocusIndex--;
      }
    }

    // Blur components up to the common ancestor.
    for (var blurIndex = 0; blurIndex <= highestBlurIndex; blurIndex++) {
      blurCandidates[blurIndex].dispatchBlur_();
    }

    this.focusedComponent_ = componentPendingFocus;

    // Update selection chain.
    var selectIndex = highestFocusIndex;
    if (selectIndex + 1 == focusCandidates.length) {
      selectIndex--;
    }
    for (; selectIndex >= 0; selectIndex--) {
      focusCandidates[selectIndex + 1].setSelectedChild(
          focusCandidates[selectIndex]);
    }

    // Focus components down from the common ancestor.
    for (var focusedComponentIndex = highestFocusIndex;
        focusedComponentIndex >= 0; focusedComponentIndex--) {
      focusCandidates[focusedComponentIndex].dispatchFocus_();
    }
  }
};

/**
 * @param {tv.ui.Component} self Component to start with.
 * @return {Array.<tv.ui.Component>} All ancestors of the given component
 *     including itself.
 * @private
 */
tv.ui.Document.prototype.getAncestorsAndSelf_ = function(self) {
  var ancestors = [];
  for (var ancestor = self; ancestor; ancestor = ancestor.getParent()) {
    ancestors.push(ancestor);
  }
  return ancestors;
};
