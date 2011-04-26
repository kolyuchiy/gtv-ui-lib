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
 * @fileoverview Scroll pane.
 *
 * Component that enables scrolling of an given element with provided next/prev
 * buttons.
 *
 * Vertical scroll pane means the top property of content element will
 * change for scrolling. Horizontal scroll changes left property.
 *
 * Expected HTML structure:
 * <div class="tv-scroll-pane-vertical tv-container-vertical">
 *   <div class="tv-button tv-scroll-pane-prev">Prev</div>
 *   <div class="tv-button tv-scroll-pane-next">Next</div>
 *
 *   <div class="tv-scroll-pane-viewport">
 *     <div class="tv-scroll-pane-content">
 *       Lots of text to be scrolled inside limited width or height.
 *     </div>
 *   </div>
 *
 *   <div class="tv-scroll-pane-scrollbar">
 *     <div class="tv-scroll-pane-scrollbar-thumb"></div>
 *   </div>
 * </div>
 *
 */
goog.provide('tv.ui.ScrollPane');

goog.require('goog.asserts');
goog.require('goog.dom.classes');
goog.require('goog.style');
goog.require('tv.ui');
goog.require('tv.ui.Button')
goog.require('tv.ui.Container');

/**
 * Constructs scroll pane.
 * @constructor
 * @extends {tv.ui.Container}
 */
tv.ui.ScrollPane = function() {
  goog.base(this);
};
goog.inherits(tv.ui.ScrollPane, tv.ui.Container);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.ScrollPane.CLASS = 'tv-scroll-pane';

/**
 * CSS classes that controls the scroll pane.
 * @enum {string}
 */
tv.ui.ScrollPane.Class = {
  /**
   * Applied to root element if scroll pane has horizontal orientation.
   * NEXT and PREV buttons will control left property of content element.
   * @see #hasHorizontalScroll
   */
  HORIZONTAL: 'tv-scroll-pane-horizontal',

  /**
   * Applied to root element if scroll pane has vertical orientation.
   * NEXT and PREV buttons will control top property of content element.
   */
  VERTICAL: 'tv-scroll-pane-vertical',

  /**
   * Applied to root element if content element fits into viewport and no
   * scrolling is needed.
   */
  CONTENT_FITS_VIEWPORT: 'tv-scroll-pane-content-fits-viewport',

  /**
   * Denotes next button component. It's expected that this is tv.ui.Button.
   */
  NEXT: 'tv-scroll-pane-next',

  /**
   * Denotes prev button component. It's expected that this is tv.ui.Button.
   */
  PREV: 'tv-scroll-pane-prev',

  /**
   * Denotes scroll window. It's expected that CONTENT element is child
   * of viewport.
   */
  VIEWPORT: 'tv-scroll-pane-viewport',

  /**
   * Denotes content element which will be scrolled.
   */
  CONTENT: 'tv-scroll-pane-content',

  /**
   * Denotes scrollbar element.
   */
  SCROLLBAR: 'tv-scroll-pane-scrollbar',

  /**
   * Denotes scroll thumb. It's expected to be child of SCROLLBAR.
   */
  SCROLL_THUMB: 'tv-scroll-pane-scrollbar-thumb'
};

tv.ui.registerDecorator(
    tv.ui.ScrollPane,
    [
       tv.ui.ScrollPane.CLASS,
       tv.ui.ScrollPane.Class.HORIZONTAL,
       tv.ui.ScrollPane.Class.VERTICAL
    ]);

/**
 * Viewport of content.
 * @type {Element}
 */
tv.ui.ScrollPane.prototype.viewportElement_;

/**
 * Content element which is being scrolled.
 * @type {Element}
 */
tv.ui.ScrollPane.prototype.contentElement_;

/**
 * Scrollbar track element.
 * @type {Element}
 */
tv.ui.ScrollPane.prototype.scrollbarElement_;

/**
 * Scrollbar thumb element. Height (for horizontal scroll) or width
 * (for vertical) will be adjusted to reflect content / viewport size ratio.
 * @type {Element}
 */
tv.ui.ScrollPane.prototype.scrollThumbElement_;

/**
 * Current scroll offset of content inside viewport.
 * @type {number}
 */
tv.ui.ScrollPane.prototype.scrollOffset_ = 0;

/**
 * How many pixels is content element going to be scrolled by.
 * @type {number}
 */
tv.ui.ScrollPane.prototype.scrollDelta_ = 40;

/**
 * Size of viewport (width for horizontal scroll, height for vertical).
 * @type {number}
 */
tv.ui.ScrollPane.prototype.viewportSize_;

/**
 * Size of content (width for horizontal scroll, height for vertical).
 * @type {number}
 */
tv.ui.ScrollPane.prototype.contentSize_;

/**
 * Ratio between viewport size and content size.
 * @type {number}
 */
tv.ui.ScrollPane.prototype.scrollbarRatio_;

/**
 * Ratio between content size and scrollbar size.
 * @type {number}
 */
tv.ui.ScrollPane.prototype.contentRatio_;


/**
 * @inheritDoc
 */
tv.ui.Container.prototype.disposeInternal = function() {
  delete this.contentElement_;
  delete this.viewportElement_;
  delete this.scrollElement_;
  delete this.scrollThumbElement_;

  goog.base(this, 'disposeInternal');
};

/**
 * @inheritDoc
 */
tv.ui.ScrollPane.prototype.getClass = function() {
  return tv.ui.ScrollPane.CLASS;
};

/**
 * Sets new scroll delta.
 * @param {number} newDelta New scroll delta.
 */
tv.ui.ScrollPane.prototype.setScrollDelta = function(newDelta) {
  this.scrollDelta_ = newDelta;
};

/**
 * @inheritDoc
 */
tv.ui.ScrollPane.prototype.decorate = function(element) {
  goog.base(this, 'decorate', element);

  for (var childNode = element.firstChild; childNode;
       childNode = childNode.nextSibling) {
    if (childNode.nodeType != goog.dom.NodeType.ELEMENT) {
      continue;
    }

    var childEl = /** @type {Element} */(childNode);
    if (goog.dom.classes.has(childEl, tv.ui.ScrollPane.Class.VIEWPORT)) {
      this.viewportElement_ = childEl;
      this.contentElement_ = goog.dom.getElementByClass(
          tv.ui.ScrollPane.Class.CONTENT, childEl);
    } else if (goog.dom.classes.has(childEl,
        tv.ui.ScrollPane.Class.SCROLLBAR)) {
      this.scrollbarElement_ = childEl;
      this.scrollThumbElement_ = goog.dom.getElementByClass(
          tv.ui.ScrollPane.Class.SCROLL_THUMB, childEl);
    }
  }

  goog.asserts.assert(!!this.viewportElement_, 'No viewport element.');
  goog.asserts.assert(!!this.contentElement_, 'No content element.')
  goog.asserts.assert(!!this.scrollbarElement_, 'No scrollbar element.');
  goog.asserts.assert(!!this.scrollThumbElement_, 'No scroll thumb element');

  this.scheduleRender();
};

/**
 * @inheritDoc
 */
tv.ui.ScrollPane.prototype.addChild = function(child) {
  goog.base(this, 'addChild', child);

  goog.asserts.assert(child instanceof tv.ui.Button,
      'Child components of tv.ui.ScrollPane must be tv.ui.Buttons');

  if (goog.dom.classes.has(child.getElement(),
      tv.ui.ScrollPane.Class.NEXT)) {
    this.getEventHandler().listen(
        child,
        tv.ui.Button.EventType.ACTION,
        goog.bind(this.scrollBy_, this, this.scrollDelta_));
  } else if (goog.dom.classes.has(child.getElement(),
      tv.ui.ScrollPane.Class.PREV)) {
    this.getEventHandler().listen(
        child,
        tv.ui.Button.EventType.ACTION,
        goog.bind(this.scrollBy_, this, -this.scrollDelta_));
  }
};

/**
 * @return {boolean} Whether the scroll pane is horizontal.
 */
tv.ui.ScrollPane.prototype.hasHorizontalScroll = function() {
  return goog.dom.classes.has(
      this.getElement(), tv.ui.ScrollPane.Class.HORIZONTAL);
};

/**
 * Scrolls content element by given element of pixels.
 * @param {number} scrollBy Number of pixels to scroll content element.
 * @private
 */
tv.ui.ScrollPane.prototype.scrollBy_ = function(scrollBy) {
  // Nothing to scroll.
  if (this.contentRatio_ >= 1) {
    return;
  }

  this.scrollOffset_ = Math.min(
      this.contentSize_ - this.viewportSize_,
      Math.max(this.scrollOffset_ + scrollBy, 0));

  var contentCoords = new goog.math.Coordinate(
      this.hasHorizontalScroll() ? -this.scrollOffset_ : 0,
      this.hasHorizontalScroll() ? 0 : -this.scrollOffset_)
  goog.style.setPosition(this.contentElement_, contentCoords);

  var thumbCoords = new goog.math.Coordinate(
      this.hasHorizontalScroll() ?
          this.scrollOffset_ / this.scrollbarRatio_ : 0,
      this.hasHorizontalScroll() ?
          0 : this.scrollOffset_ / this.scrollbarRatio_);
  goog.style.setPosition(this.scrollThumbElement_, thumbCoords);
};

/**
 * Computes all values needed for scroll:
 *  - viewportSize_ - scroll window size,
 *  - contentSize_ - content size,
 *  - contentRatio_ and scrollbarRatio_.
 *
 * Sets size of scroll thumb. Hides scrollbar if no scroll is needed.
 *
 * @inheritDoc
 */
tv.ui.ScrollPane.prototype.render = function() {
  goog.base(this, 'render');

  this.viewportSize_ = this.hasHorizontalScroll() ?
      goog.style.getSize(this.viewportElement_).width :
      goog.style.getSize(this.viewportElement_).height;
  this.contentSize_ = this.hasHorizontalScroll() ?
      this.contentElement_.scrollWidth :
      this.contentElement_.scrollHeight;
  var scrollbarSize = this.hasHorizontalScroll() ?
      goog.style.getSize(this.scrollbarElement_).width :
      goog.style.getSize(this.scrollbarElement_).height;

  this.contentRatio_ = this.viewportSize_ / this.contentSize_;
  this.scrollbarRatio_ = this.contentSize_ / scrollbarSize;

  // Nothing to scroll?
  var nothingToScroll = (this.contentRatio_ >= 1);
  goog.dom.classes.enable(this.getElement(),
      tv.ui.ScrollPane.Class.CONTENT_FITS_VIEWPORT,
      nothingToScroll);
  goog.array.forEach(this.getChildren(), function(child) {
    child.setVisible(!nothingToScroll);
  });

  var thumbSize = Math.min(
      scrollbarSize, Math.max(0, scrollbarSize * this.contentRatio_));
  if (this.hasHorizontalScroll()) {
    goog.style.setWidth(this.scrollThumbElement_, thumbSize);
  } else {
    goog.style.setHeight(this.scrollThumbElement_, thumbSize);
  }

  this.scrollBy_(0);
};
