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
 * @fileoverview Component container that features highlighting and scrolling.
 */
goog.provide('tv.ui.Container');

goog.require('goog.Timer');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.math.Coordinate');
goog.require('goog.style');
goog.require('goog.userAgent.product');
goog.require('tv.ui');
goog.require('tv.ui.Component');

/**
 * Constructs container.
 * @constructor
 * @extends {tv.ui.Component}
 */
tv.ui.Container = function() {
  goog.base(this);

  /**
   * @type {Array.<tv.ui.Component>}
   * @private
   */
  this.children_ = [];
};
goog.inherits(tv.ui.Container, tv.ui.Component);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.Container.CLASS = 'tv-container';

/**
 * CSS classes that control and reflect look and feel of container.
 * @enum {string}
 */
tv.ui.Container.Class = {
  /**
   * Applied to root element if container has horizontal orientation.
   * In horizontal container elements span along x-axis.
   * User can control selection by Left and Right keys.
   * @see #isHorizontal
   */
  HORIZONTAL: 'tv-container-horizontal',

  /**
   * Applied to root element if container has vertical orientation.
   * In vertical container elements span along y-axis.
   * User can control selection by Up and Down keys.
   * @see #isVertical
   */
  VERTICAL: 'tv-container-vertical',

  /**
   * Applied to root element if container has stack orientation.
   * In stack container elements span along z-axis (only one element at the time
   * is visible). User cannot control selection directly, an alternative way
   * is usually provided by application developer, such as tab bar.
   * @see #isStack
   */
  STACK: 'tv-container-stack',

  /**
   * Applied to root element of currently selected child component.
   * @see #getSelectedChild
   */
  SELECTED_CHILD: 'tv-container-selected-child',

  /**
   * Denotes highlight element that will be positioned above currently selected
   * child.
   * @see #getHighlightElement
   */
  HIGHLIGHT: 'tv-container-highlight',

  /**
   * Denotes highlight element that could be shared between different
   * containers. Position and visibility of shared highlight is controlled
   * by focused container. Shared highlight must be external element,
   * set with setHighlightElement() method.
   * @see #setHighlightElement
   */
  SHARED_HIGHLIGHT: 'tv-container-shared-highlight',

  /**
   * Applied to highlight element when it's properly positioned.
   * Useful for permanent and shared highlights. Since permanent highlight is
   * always visible, this class helps to avoid appearance of misplaced highlight
   * before decoration and after container becomes empty. Shared highlights
   * could use this class to prevent animated transition between containers.
   */
  HIGHLIGHT_POSITIONED: 'tv-container-highlight-positioned',

  /**
   * Applied to highlight element if one of container's descendants is focused.
   * Could be used to control visibility of highlight.
   */
  HIGHLIGHT_FOCUSED: 'tv-container-highlight-focused',

  /**
   * Denotes start slit element which is shown when there are child components
   * before scrolling window.
   */
  START_SLIT: 'tv-container-start-slit',

  /**
   * Applied to start slit element when there are child components before
   * scrolling window.
   * @see tv.ui.Container.Class#START_SLIT
   */
  START_SLIT_SHOWN: 'tv-container-start-slit-shown',

  /**
   * Denotes end slit element which is shown when there are child components
   * after scrolling window.
   */
  END_SLIT: 'tv-container-end-slit',

  /**
   * Applied to end slit element when there are child components after
   * scrolling window.
   * @see tv.ui.Container.Class#END_SLIT
   */
  END_SLIT_SHOWN: 'tv-container-end-slit-shown',

  /**
   * Applied to element that is parent to all scrollable child elements.
   * Selected child will always be positioned at start of scrolling window.
   */
  START_SCROLL: 'tv-container-start-scroll',

  /**
   * Applied to element that is parent to all scrollable child elements.
   * Selected child will be positioned in the middle of scrolling window when
   * it is possible.
   */
  MIDDLE_SCROLL: 'tv-container-middle-scroll',

  /**
   * Applied to parent element of all mock children.
   * Mock child is an element that has dimensions of typical child.
   * It should be used when scroll element or child elements have animations.
   */
  MOCK_SCROLL: 'tv-container-mock-scroll',

  /**
   * Applied to root element if container resets its selection on blur.
   * @see #hasTransientSelection
   */
  TRANSIENT_SELECTION: 'tv-container-transient-selection'
};

tv.ui.registerDecorator(
    tv.ui.Container,
    [
      tv.ui.Container.CLASS,
      tv.ui.Container.Class.HORIZONTAL,
      tv.ui.Container.Class.VERTICAL
    ]);

/**
 * Event types dispatched by container.
 * @enum {string}
 */
tv.ui.Container.EventType = {
  /**
   * Dispatched after selected child has changed.
   * @see #getSelectedChild
   */
  SELECT_CHILD: goog.events.getUniqueId('select_child'),

  /**
   * Dispatched after position or visibility of highlight element has been
   * changed.
   * @see #getHighlightElement
   */
  UPDATE_HIGHLIGHT: goog.events.getUniqueId('update_highlight')
};

// TODO(maksym): Comment member and static variables.
/**
 * @type {number}
 * @private
 */
tv.ui.Container.AVERAGE_VELOCITY_CALCULATION_INTERVAL = 50;

/**
 * @type {number}
 * @private
 */
tv.ui.Container.DECELERATION_ANIMATION_INTERVAL = 20;

/**
 * @type {Element}
 * @private
 */
tv.ui.Container.prototype.scrollElement_;

/**
 * @type {Element}
 * @private
 */
tv.ui.Container.prototype.highlightElement_;

/**
 * @type {Element}
 * @private
 */
tv.ui.Container.prototype.startSlitElement_;

/**
 * @type {Element}
 * @private
 */
tv.ui.Container.prototype.endSlitElement_;

/**
 * @type {Element}
 * @private
 */
tv.ui.Container.prototype.mockScrollElement_;

/**
 * @type {Element}
 * @private
 */
tv.ui.Container.prototype.mockChildElement_;

/**
 * @type {tv.ui.Component}
 * @private
 */
tv.ui.Container.prototype.selectedChild_;

/**
 * @type {boolean}
 * @private
 */
tv.ui.Container.prototype.controllingSharedHighlight_;

/**
 * @type {number}
 * @private
 */
tv.ui.Container.prototype.scrollElementCoordinate_;

/**
 * @type {number}
 * @private
 */
tv.ui.Container.prototype.minScrollElementCoordinate_;

/**
 * @type {number}
 * @private
 */
tv.ui.Container.prototype.touchIdentifier_;

/**
 * @type {Array.<{time: number, coordinate: number}>}
 * @private
 */
tv.ui.Container.prototype.touchMoves_;

/**
 * @type {goog.Timer}
 * @private
 */
tv.ui.Container.prototype.decelerationTimer_;

/**
 * @type {number}
 * @private
 */
tv.ui.Container.prototype.decelerationVelocity_;

// TODO(maksym): Flag below is dangerous because it assumes that render() will
// be called immediately from scheduleRender(), which may not always be true.
/**
 * @type {boolean}
 * @private
 */
tv.ui.Container.prototype.skipNextScroll_;

/**
 * @inheritDoc
 */
tv.ui.Container.prototype.disposeInternal = function() {
  this.removeChildren();

  delete this.scrollElement_;
  delete this.highlightElement_;
  delete this.startSlitElement_;
  delete this.endSlitElement_;
  delete this.mockScrollElement_;
  delete this.mockChildElement_;

  goog.base(this, 'disposeInternal');
};

/**
 * @inheritDoc
 */
tv.ui.Container.prototype.decorate = function(element) {
  goog.base(this, 'decorate', element);

  for (var childNode = element.firstChild; childNode;
       childNode = childNode.nextSibling) {
    if (childNode.nodeType != goog.dom.NodeType.ELEMENT) {
      continue;
    }

    var childElement = /** @type {Element} */(childNode);
    if (goog.dom.classes.has(childElement, tv.ui.Container.Class.HIGHLIGHT)) {
      this.setHighlightElement(childElement);
    } else if (goog.dom.classes.has(
        childElement, tv.ui.Container.Class.START_SLIT)) {
      this.startSlitElement_ = childElement;
    } else if (goog.dom.classes.has(
        childElement, tv.ui.Container.Class.END_SLIT)) {
      this.endSlitElement_ = childElement;
    } else if (goog.dom.classes.has(
        childElement, tv.ui.Container.Class.START_SCROLL)) {
      this.scrollElement_ = childElement;
    } else if (goog.dom.classes.has(
        childElement, tv.ui.Container.Class.MIDDLE_SCROLL)) {
      this.scrollElement_ = childElement;
    } else if (goog.dom.classes.has(
        childElement, tv.ui.Container.Class.MOCK_SCROLL)) {
      this.mockScrollElement_ = childElement;
      this.mockChildElement_ = /** @type {Element} */(
          childElement.removeChild(childElement.firstChild));
    }
  }

  if (this.scrollElement_ && goog.isDef(window.ontouchstart)) {
    this.scrollTo_(0);

    this.decelerationTimer_ = new goog.Timer(
        tv.ui.Container.DECELERATION_ANIMATION_INTERVAL);
    this.getEventHandler().listen(
        this.decelerationTimer_, goog.Timer.TICK, function() {
          this.scrollTo_(
              this.scrollElementCoordinate_ + this.decelerationVelocity_, true);

          this.decelerationVelocity_ *= 0.95;
          if (Math.abs(this.decelerationVelocity_) < 0.05) {
            this.decelerationTimer_.stop();
          }
        });
  }
};

/**
 * @inheritDoc
 */
tv.ui.Container.prototype.getClass = function() {
  return tv.ui.Container.CLASS;
};

/**
 * Adds child component.
 * @param {tv.ui.Component} child Child component.
 */
tv.ui.Container.prototype.addChild = function(child) {
  this.children_.push(child);
  child.setParent(this);

  if (this.mockScrollElement_) {
    var mockChildElement =
        /** @type {Element} */(this.mockChildElement_.cloneNode(true));
    goog.style.showElement(mockChildElement, child.isVisible());
    this.mockScrollElement_.appendChild(mockChildElement);
  }

  if ((!this.selectedChild_ && child.getSelectedDescendantOrSelf()) ||
      goog.dom.classes.has(
          child.getElement(), tv.ui.Container.Class.SELECTED_CHILD)) {
    this.setSelectedChild(child);
  } else {
    this.scheduleRender();
  }
};

/**
 * Removes all child components.
 */
tv.ui.Container.prototype.removeChildren = function() {
  this.setSelectedChild(null);

  if (this.mockScrollElement_) {
    goog.dom.removeChildren(this.mockScrollElement_);
  }

  goog.array.forEach(this.children_, function(child) {
    child.dispose();
  });
  this.children_ = [];

  this.scheduleRender();
};

/**
 * @return {Array.<tv.ui.Component>} List of children.
 */
tv.ui.Container.prototype.getChildren = function() {
  return this.children_;
};

/**
 * @return {boolean} Whether container has horizontal orientation.
 */
tv.ui.Container.prototype.isHorizontal = function() {
  return goog.dom.classes.has(
      this.getElement(), tv.ui.Container.Class.HORIZONTAL);
};

/**
 * @return {boolean} Whether container has vertical orientation.
 */
tv.ui.Container.prototype.isVertical = function() {
  return goog.dom.classes.has(
      this.getElement(), tv.ui.Container.Class.VERTICAL);
};

/**
 * @return {boolean} Whether container has stack orientation.
 */
tv.ui.Container.prototype.isStack = function() {
  return goog.dom.classes.has(
      this.getElement(), tv.ui.Container.Class.STACK);
};

/**
 * @return {Element} Highlight element.
 */
tv.ui.Container.prototype.getHighlightElement = function() {
  return this.highlightElement_;
};

/**
 * Sets highlight element. This method is the only way to set external
 * highlight element.
 * @param {Element} highlightElement highlight element.
 */
tv.ui.Container.prototype.setHighlightElement = function(highlightElement) {
  goog.asserts.assert(
      !this.isStack(), 'Stack container doesn\'t support highlight.');

  this.highlightElement_ = highlightElement;
};

/**
 * @return {boolean} Whether container has shared highlight.
 * @private
 */
tv.ui.Container.prototype.hasSharedHighlight_ = function() {
  goog.asserts.assert(
      this.highlightElement_, 'Container doesn\'t have highlight.');

  return goog.dom.classes.has(
      this.highlightElement_, tv.ui.Container.Class.SHARED_HIGHLIGHT);
};

/**
 * @return {boolean} Whether this container is controlling position and
 *     visibility of highlight element.
 * @private
 */
tv.ui.Container.prototype.isControllingHighlight_ = function() {
  return this.controllingSharedHighlight_ || !this.hasSharedHighlight_();
};

/**
 * @return {boolean} Whether policy is to keep selected child at start of
 *     scrolling window.
 * @private
 */
tv.ui.Container.prototype.isStartScroll_ = function() {
  goog.asserts.assert(
      this.scrollElement_, 'Container doesn\'t have scroll.');

  return goog.dom.classes.has(
      this.scrollElement_, tv.ui.Container.Class.START_SCROLL);
};

/**
 * @return {boolean} Whether container resets its selection on blur.
 */
tv.ui.Container.prototype.hasTransientSelection = function() {
  return goog.dom.classes.has(
      this.getElement(), tv.ui.Container.Class.TRANSIENT_SELECTION);
};

/**
 * Handles key event.
 * Controls child component focus.
 * @param {goog.events.KeyEvent} event Key event.
 * @protected
 */
tv.ui.Container.prototype.onKey = function(event) {
  if (this.isStack() ||
      event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
    return;
  }


  var selectedChild;
  var keyCode = event.keyCode;
  if (keyCode == this.getPreviousKey_()) {
    selectedChild = this.findPreviousSelectableChild(keyCode);
  } else if (keyCode == this.getNextKey_()) {
    selectedChild = this.findNextSelectableChild(keyCode);
  }

  if (selectedChild) {
    this.setSelectedChild(selectedChild);
    this.tryFocus();

    event.stopPropagation();
    event.preventDefault();
  }
};

/**
 * @return {number} Code for the key that moves the selection towards start of
 *     the container, or 0 if there is no such key.
 * @private
 */
tv.ui.Container.prototype.getPreviousKey_ = function() {
  return this.isHorizontal() ? goog.events.KeyCodes.LEFT :
         this.isVertical() ? goog.events.KeyCodes.UP :
         0;
};

/**
 * @return {number} Code for the key that moves the selection towards end of the
 *     container, or 0 if there is no such key.
 * @private
 */
tv.ui.Container.prototype.getNextKey_ = function() {
  return this.isHorizontal() ? goog.events.KeyCodes.RIGHT :
         this.isVertical() ? goog.events.KeyCodes.DOWN :
         0;
};

// TODO(maksym): Change to findFirstSelectableChild().
/**
 * Looks for first selectable descendant and updates selection chain up to this
 * container. Does nothing if container doesn't have selectable descendants.
 * @return {boolean} Whether selectable descendant has been found.
 * @protected
 */
tv.ui.Container.prototype.selectFirstDescendant = function() {
  return goog.base(this, 'selectFirstDescendant') &&
      goog.array.some(this.children_, function(child) {
        if (child.selectFirstDescendant()) {
          this.setSelectedChild(child);
          return true;
        }
        return false;
      }, this);
};

/**
 * Walks down the container tree, and sometimes changes which child is selected.
 * If the key that was used to change selection matches the container's next/
 * previous key, we change the selection to the first/last child respectively.
 * Does nothing if container has no selectable descendants.
 * @param {number} opt_keyCode Code of key that triggered selection change.
 * @return {boolean} Whether selectable descendant has been found.
 * @protected
 */
tv.ui.Container.prototype.adjustSelectionFromKey = function(opt_keyCode) {
  if (!this.isSelectable()) {
    return false;
  }
  var indexBegin, indexEnd;
  if (opt_keyCode === this.getNextKey_()) {
    // We entered the container by pressing 'right' or 'down'.
    indexBegin = 0;
    indexEnd = this.children_.length;
  } else if (opt_keyCode === this.getPreviousKey_()) {
    // We entered the container by pressing 'left' or 'up'.
    indexBegin = this.children_.length - 1;
    indexEnd = -1;
  } else {
    // Don't change selection in this container.
    return this.selectedChild_ &&
           (this.selectedChild_.adjustSelectionFromKey &&
            this.selectedChild_.adjustSelectionFromKey(opt_keyCode) ||
            this.selectedChild_.isSelectable());
  }
  var delta = indexBegin < indexEnd ? 1 : -1;
  for (var i = indexBegin; i != indexEnd; i += delta) {
    var child = this.children_[i];
    if (child.adjustSelectionFromKey &&
        child.adjustSelectionFromKey(opt_keyCode) ||
        child.isSelectable()) {
      this.setSelectedChild(child);
      return true;
    }
  }
  return false;
};

/**
 * Looks for selectable child components before currently selected one.
 * @param {number} opt_keyCode Code of key that triggered selection change.
 * @return {tv.ui.Component} Selectable child component or null if there are
 *     none before currently selected one.
 */
tv.ui.Container.prototype.findPreviousSelectableChild = function(opt_keyCode) {
  return this.findSelectableChild_(-1, 0, opt_keyCode);
};

/**
 * Looks for selectable child components after currently selected one.
 * @param {number} opt_keyCode Code of key that triggered selection change.
 * @return {tv.ui.Component} Selectable child component or null if there are
 *     none after currently selected one.
 */
tv.ui.Container.prototype.findNextSelectableChild = function(opt_keyCode) {
  return this.findSelectableChild_(1, this.children_.length - 1, opt_keyCode);
};

/**
 * Looks for selectable child components in given direction relatively to
 * currently selected one.
 * @param {number} delta +/-1 for direction.
 * @param {number} lastIndex Last child index.
 * @param {number} opt_keyCode Code of key that triggered selection change.
 * @return {tv.ui.Component} Selectable child component or null if there are
 *     none in given direction.
 * @private
 */
tv.ui.Container.prototype.findSelectableChild_ = function(
    delta, lastIndex, opt_keyCode) {
  if (!this.selectedChild_) {
    return null;
  }

  var selectedChildIndex =
      goog.array.indexOf(this.children_, this.selectedChild_);

  while (selectedChildIndex != lastIndex) {
    selectedChildIndex += delta;
    var selectedChild = this.children_[selectedChildIndex];
    if (selectedChild.getSelectedDescendantOrSelf(opt_keyCode)) {
      return selectedChild;
    }
  }

  return null;
};

/**
 * @param {number} opt_keyCode Code of key that triggered selection change.
 * @return {tv.ui.Component} Selected grand-...-grandchild, or null if no
 *     child is selected.
 */
tv.ui.Container.prototype.getSelectedDescendantOrSelf = function(opt_keyCode) {
  if (!goog.base(this, 'getSelectedDescendantOrSelf', opt_keyCode)) {
    return null;
  }
  if (!this.isFocused()) {
    // We are not focused, so we can adjust selected child if necessary.
    this.adjustSelectionFromKey(opt_keyCode);
  }
  // Now check whether we have a selected child.
  return (this.selectedChild_ &&
          this.selectedChild_.getSelectedDescendantOrSelf(opt_keyCode));
};

/**
 * @return {tv.ui.Component} Currently selected child.
 *     Guaranteed to be focusable or have focusable child selected.
 */
tv.ui.Container.prototype.getSelectedChild = function() {
  return this.selectedChild_;
};

/**
 * Sets currently selected child.
 * @param {tv.ui.Component} selectedChild Child to select.
 * @param {boolean} opt_noScroll Don't scroll focused component into viewport.
 */
tv.ui.Container.prototype.setSelectedChild = function(
    selectedChild, opt_noScroll) {
  if (this.selectedChild_ == selectedChild) {
    return;
  }

  if (this.selectedChild_) {
    goog.dom.classes.remove(
        this.selectedChild_.getElement(), tv.ui.Container.Class.SELECTED_CHILD);
  }

  this.selectedChild_ = selectedChild;

  if (this.selectedChild_) {
    goog.dom.classes.add(
        this.selectedChild_.getElement(), tv.ui.Container.Class.SELECTED_CHILD);
    this.skipNextScroll_ = opt_noScroll || false;
    this.scheduleRender();
  }

  var parent = this.getParent();
  parent && parent.onChildSelectabilityChange(this);

  this.dispatchEvent(tv.ui.Container.EventType.SELECT_CHILD);
};

/**
 * @inheritDoc
 */
tv.ui.Container.prototype.render = function() {
  goog.base(this, 'render');

  if (!this.isStack()) {
    this.scroll_();
    this.updateHighlight_();
  }
};

/**
 * Scrolls children according to scrolling window policy.
 * @private
 */
tv.ui.Container.prototype.scroll_ = function() {
  // Do nothing if container is not scrollable.
  if (!this.scrollElement_) {
    return;
  }

  // TODO(maksym): Minimum coordinate can contradict scrolling policy.
  this.minScrollElementCoordinate_ = Math.min(0,
      this.getOffsetSize_(this.element_) -
      this.getScrollSize_(this.mockScrollElement_ || this.scrollElement_));

  if (this.skipNextScroll_) {
    this.skipNextScroll_ = false;
    return;
  }

  // No children or all children are non-focusable?
  if (!this.selectedChild_) {
    // Scroll to start.
    this.scrollTo_(0);

    // Hide slits.
    this.startSlitElement_ && goog.dom.classes.remove(
        this.startSlitElement_, tv.ui.Container.Class.START_SLIT_SHOWN);
    this.endSlitElement_ && goog.dom.classes.remove(
        this.endSlitElement_, tv.ui.Container.Class.END_SLIT_SHOWN);

    return;
  }

  var selectedChildIndex =
      goog.array.indexOf(this.children_, this.selectedChild_);
  var selectedChildElement = this.getChildElement_(selectedChildIndex);

  // Policy requires to keep selected child at start of scrolling window.
  if (this.isStartScroll_()) {
    this.scrollTo_(-this.getOffsetCoordinate_(selectedChildElement));

    // TODO(maksym): Update slit visibility.

    return;
  }

  // OK, hard part. Policy requires to position selected child in the middle of
  // scrolling window.
  var scrollWindowSize = this.getOffsetSize_(this.element_);
  /**
   * How much space is in scrolling window before selected element. We assume
   * that selected element is positioned at most at the middle of scrolling
   * window.
   */
  var spaceBeforeSelectedSize = scrollWindowSize / 2;

  var allChildrenSize = this.getScrollSize_(
      this.mockScrollElement_ || this.scrollElement_);
  var selectedChildCoordinate = this.getOffsetCoordinate_(
      selectedChildElement);
  // Can we fit selected and last element in half of scrolling window?
  if (allChildrenSize - selectedChildCoordinate < spaceBeforeSelectedSize) {
    // Yes, correct available space.
    spaceBeforeSelectedSize =
        scrollWindowSize - (allChildrenSize - selectedChildCoordinate);
  }

  // Try to fit in scrolling window as much fully visible elements to the left
  // of selected element as possible.
  //
  // No, I'm not stupid. It's not possible to use division even if all elements
  // have the same size. Webkit browsers have terrible rounding bug if page zoom
  // isn't 100%. In short, if you place 2 elements of width 40 next to each
  // other and measure total width by using offsetLeft (just an example, all
  // measuring methods affected), it is very likely that it would be 79 or 81.
  // Issue have cumulative effect, so it worsens with increasing number of
  // elements.
  var firstVisibleChildElement = selectedChildElement;
  var startSlitShown = selectedChildIndex != 0;
  for (var childIndex = selectedChildIndex - 1;
      childIndex >= 0; childIndex--) {
    if (!this.children_[childIndex].isVisible()) {
      continue;
    }
    var childElement = this.getChildElement_(childIndex);
    if (selectedChildCoordinate - this.getOffsetCoordinate_(childElement) >
        spaceBeforeSelectedSize) {
      break;
    }
    firstVisibleChildElement = childElement;
    startSlitShown = childIndex != 0;
  }

  var firstVisibleChildCoordinate =
      this.getOffsetCoordinate_(firstVisibleChildElement);
  var endSlitShown =
      (allChildrenSize - firstVisibleChildCoordinate) > scrollWindowSize;

  // Scroll, finally!
  this.scrollTo_(-firstVisibleChildCoordinate);

  // Show slits if necessary.
  if (this.startSlitElement_) {
    goog.dom.classes.enable(
        this.startSlitElement_,
        tv.ui.Container.Class.START_SLIT_SHOWN,
        startSlitShown);
  }
  if (this.endSlitElement_) {
    goog.dom.classes.enable(
        this.endSlitElement_,
        tv.ui.Container.Class.END_SLIT_SHOWN,
        endSlitShown);
  }
};

/**
 * Returns child element used for measuring during scrolling.
 * @param {number} childIndex Index of child.
 * @return {Element} Either root element of child component or mock child
 *     element.
 * @private
 */
tv.ui.Container.prototype.getChildElement_ = function(childIndex) {
  return this.mockScrollElement_ ?
      this.mockScrollElement_.childNodes[childIndex] :
      this.children_[childIndex].getElement();
};

/**
 * Sets position of real and mock scroll elements.
 * @param {number} scrollElementCoordinate Position to set.
 * @param {boolean=} opt_touchConstraints Whether to constrain scrolling as
 *     expected during touch interaction.
 * @private
 */
tv.ui.Container.prototype.scrollTo_ = function(
    scrollElementCoordinate, opt_touchConstraints) {
  // TODO(maksym): Implement bouncing in touch mode instead.
  this.scrollElementCoordinate_ = opt_touchConstraints ?
      Math.max(
          Math.min(0, scrollElementCoordinate),
          this.minScrollElementCoordinate_) :
      scrollElementCoordinate;

  var scrollElementPosition =
      this.createCoordinate_(this.scrollElementCoordinate_);
  tv.ui.Container.setElementPosition_(
      this.scrollElement_, scrollElementPosition);
  if (this.mockScrollElement_) {
    goog.style.setPosition(this.mockScrollElement_, scrollElementPosition);
  }
};

/**
 * Moves element to given position using webkit transforms.
 * @param {Element} element Element to move.
 * @param {goog.math.Coordinate} position Position to set.
 */
tv.ui.Container.setElementPosition_ =
    goog.userAgent.product.IPHONE || goog.userAgent.product.IPAD ?
        function(element, position) {
          // 3D translation is powered by OpenGL on iOS.
          element.style.webkitTransform =
              'translate3d(' + position.x + 'px, ' +  position.y + 'px, 0)';
        } :
        function(element, position) {
          // Use webkit transform for better performance
          element.style.webkitTransform =
              'translate(' + position.x + 'px, ' + position.y + 'px)';
        };

/**
 * Moves highlight element at position of selected child.
 * Does nothing if highlight is shared and container isn't in focus chain.
 * @private
 */
tv.ui.Container.prototype.updateHighlight_ = function() {
  if (!this.highlightElement_ || !this.isControllingHighlight_()) {
    return;
  }

  if (this.selectedChild_) {
    var selectedChildElement = this.getChildElement_(
        goog.array.indexOf(this.children_, this.selectedChild_));

    goog.style.setPosition(
        this.highlightElement_,
        goog.style.getRelativePosition(
            selectedChildElement,
            /** @type {Element} */(this.highlightElement_.parentNode)));
    goog.dom.classes.add(
        this.highlightElement_, tv.ui.Container.Class.HIGHLIGHT_POSITIONED);
  } else {
    goog.dom.classes.remove(
        this.highlightElement_, tv.ui.Container.Class.HIGHLIGHT_POSITIONED);
  }

  this.dispatchEvent(tv.ui.Container.EventType.UPDATE_HIGHLIGHT);
};

/**
 * Abstracts offset coordinate for horizontal and vertical container.
 * @param {Element} element Element to measure.
 * @return {number} Offset left or top, depending on container orientation.
 * @private
 */
tv.ui.Container.prototype.getOffsetCoordinate_ = function(element) {
  return this.isHorizontal() ? element.offsetLeft : element.offsetTop;
};

/**
 * Abstracts offset size for horizontal and vertical container.
 * @param {Element} element Element to measure.
 * @return {number} Offset width or height, depending on container orientation.
 * @private
 */
tv.ui.Container.prototype.getOffsetSize_ = function(element) {
  return this.isHorizontal() ? element.offsetWidth : element.offsetHeight;
};

/**
 * Abstracts scroll size for horizontal and vertical container.
 * @param {Element} element Element to measure.
 * @return {number} Scroll width or height, depending on container orientation.
 * @private
 */
tv.ui.Container.prototype.getScrollSize_ = function(element) {
  return this.isHorizontal() ? element.scrollWidth : element.scrollHeight;
};

/**
 * Creates coordinate from given value.
 * @param {number} value Coordinate value.
 * @return {goog.math.Coordinate} 2-dimensional coordinate with one of
 *     dimensions set to given value, other one - to zero, depending on
 *     container orientation.
 * @private
 */
tv.ui.Container.prototype.createCoordinate_ = function(value) {
  return new goog.math.Coordinate(
      this.isHorizontal() ? value : 0, this.isHorizontal() ? 0 : value);
};

/**
 * Updates DOM styles.
 * Called by child component to notify parent container that its visibility
 * has changed.
 * @param {tv.ui.Component} child Child component which visibility has changed.
 */
tv.ui.Container.prototype.onChildVisibilityChange = function(child) {
  // Ensure consistent visibility of mock child.
  if (this.mockScrollElement_) {
    var childIndex = goog.array.indexOf(this.children_, child);
    goog.style.showElement(
        this.mockScrollElement_.childNodes[childIndex], child.isVisible());
  }

  this.onChildSelectabilityChange(child);
  this.scheduleRender();
};

/**
 * Updates selected child if necessary.
 * Called by child component to notify parent container that one of conditions
 * affecting selected child choice has changed.
 * @param {tv.ui.Component} child Child component which property has changed.
 * @protected
 */
tv.ui.Container.prototype.onChildSelectabilityChange = function(child) {
  if (!this.selectedChild_ && child.getSelectedDescendantOrSelf()) {
    // Child became selectable, set it as selected if container has none.
    this.setSelectedChild(child);
  } else if (this.selectedChild_ == child &&
      !child.getSelectedDescendantOrSelf()) {
    // Child stopped being selectable, try to find other selectable children.
    this.setSelectedChild(
        this.findNextSelectableChild() || this.findPreviousSelectableChild());
  }
};

/**
 * Handles focus event.
 * Enters mode when container is allowed to control external highlight and
 * updates position and look of highlight element.
 * @protected
 */
tv.ui.Container.prototype.onFocus = function(event) {
  goog.base(this, 'onFocus', event);

  if (this.highlightElement_) {
    goog.dom.classes.add(
        this.highlightElement_, tv.ui.Container.Class.HIGHLIGHT_FOCUSED);

    if (this.hasSharedHighlight_()) {
      this.controllingSharedHighlight_ = true;

      // Overkill, we only need to position highlight element. We might have
      // done it by calling updateHighlight_() method. However we can trigger
      // unnecessary repaint in browser, so it's better this way.
      this.scheduleRender();
    }
  }
};

/**
 * Handles blur event.
 * Exits mode when container is allowed to control external highlight and
 * updates look of highlight element.
 * @protected
 */
tv.ui.Container.prototype.onBlur = function(event) {
  goog.base(this, 'onBlur', event);

  if (this.highlightElement_) {
    goog.dom.classes.remove(
        this.highlightElement_, tv.ui.Container.Class.HIGHLIGHT_FOCUSED);

    if (this.hasSharedHighlight_()) {
      this.controllingSharedHighlight_ = false;
      goog.dom.classes.remove(
          this.highlightElement_, tv.ui.Container.Class.HIGHLIGHT_POSITIONED);
    }

    this.dispatchEvent(tv.ui.Container.EventType.UPDATE_HIGHLIGHT);
  }

  if (this.hasTransientSelection()) {
    this.selectFirstDescendant();
  }
};

/**
 * @inheritDoc
 */
tv.ui.Container.prototype.onTouchStart = function(event) {
  goog.base(this, 'onTouchStart', event);

  var touches = event.getBrowserEvent().changedTouches;
  if (!this.scrollElement_ || this.touchIdentifier_ || touches.length != 1) {
    return;
  }

  this.decelerationTimer_.stop();
  this.touchIdentifier_ = touches[0].identifier;
  this.touchMoves_ = [];
  this.addTouchMove_(this.getTouch_(event));
};

/**
 * @inheritDoc
 */
tv.ui.Container.prototype.onTouchMove = function(event) {
  goog.base(this, 'onTouchMove', event);

  var touch = this.getTouch_(event);
  if (!this.scrollElement_ || !touch) {
    return;
  }

  // TODO(maksym): Update slits in touch mode.
  this.scrollTo_(
      this.scrollElementCoordinate_ +
      this.getPageCoordinate_(touch) -
      this.getLastTouchMove_().coordinate,
      true);
  this.addTouchMove_(touch);

  // TODO(maksym): It would be nice to stop propagation here but it's hard
  // to decide when do so. Figure it out eventually.
};

/**
 * @inheritDoc
 */
tv.ui.Container.prototype.onTouchEnd = function(event) {
  // Intentionally not calling base class implementation, as containers
  // shouldn't try focus themselves in touch mode.
  event.preventDefault();

  if (!this.scrollElement_ || !this.touchIdentifier_ || this.getTouch_(event)) {
    return;
  }

  if (this.touchMoves_.length >= 2) {
    var endTime = goog.now();
    var endCoordinate = this.getLastTouchMove_().coordinate;

    var interval = 0;
    var distance = 0;
    for (var i = this.touchMoves_.length - 1; i >= 0; i--) {
      var possibleInterval = endTime - this.touchMoves_[i].time;
      if (possibleInterval >
          tv.ui.Container.AVERAGE_VELOCITY_CALCULATION_INTERVAL) {
        break;
      }
      interval = possibleInterval;
      distance = endCoordinate - this.touchMoves_[i].coordinate;
    }

    if (interval > 0) {
      // Initial deceleration velocity should be a velocity of swipe.
      // Multiplying it by animation interval gets number of pixels to
      // scroll during single animation frame.
      this.decelerationVelocity_ = distance / interval *
          tv.ui.Container.DECELERATION_ANIMATION_INTERVAL;
      this.decelerationTimer_.start();
    }
  }

  delete this.touchIdentifier_;
  delete this.touchMoves_;
};

/**
 * @param {goog.events.Event} event Touch event.
 * @return {Touch} Touch which initiated swipe, null if event doesn't have it.
 * @private
 */
tv.ui.Container.prototype.getTouch_ = function(event) {
  return /** @type {Touch} */ (goog.array.find(event.getBrowserEvent().touches,
      function(touch) {
        return touch.identifier == this.touchIdentifier_;
      }, this));
};

/**
 * Records touch move for calculation of average speed of swipe.
 * @param {Touch} touch Touch move.
 * @private
 */
tv.ui.Container.prototype.addTouchMove_ = function(touch) {
  this.touchMoves_.push({
    time: goog.now(),
    coordinate: this.getPageCoordinate_(touch)
  });
};

/**
 * @return {{time: number, coordinate: number}} Last recorded touch move.
 * @private
 */
tv.ui.Container.prototype.getLastTouchMove_ = function() {
  return this.touchMoves_[this.touchMoves_.length - 1];
};

/**
 * Abstracts page coordinate of event for horizontal and vertical container.
 * @param {Touch} touch Touch move.
 * @return {number} Page x or y, depending on container orientation.
 * @private
 */
tv.ui.Container.prototype.getPageCoordinate_ = function(touch) {
  return this.isHorizontal() ? touch.pageX : touch.pageY;
};
