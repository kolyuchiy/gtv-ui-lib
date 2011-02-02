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

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.math.Coordinate');
goog.require('goog.style');
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
  MOCK_SCROLL: 'tv-container-mock-scroll'
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

// TODO(maksym): Comment member variables.
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

  var selectionChanged;
  if (event.keyCode == this.getPreviousKey_()) {
    selectionChanged = this.selectPreviousChild();
  } else if (event.keyCode == this.getNextKey_()) {
    selectionChanged = this.selectNextChild();
  }

  if (selectionChanged) {
    event.stopPropagation();
    event.preventDefault();

    this.getDocument().setFocusedComponent(
        this.selectedChild_.getSelectedDescendantOrSelf());
  }
};

/**
 * @return {number} Code for key that moves selection towards start of the
 *     container.
 * @private
 */
tv.ui.Container.prototype.getPreviousKey_ = function() {
  return this.isHorizontal() ?
      goog.events.KeyCodes.LEFT : goog.events.KeyCodes.UP;
};

/**
 * @return {number} Code for key that moves selection towards end of the
 *     container.
 * @private
 */
tv.ui.Container.prototype.getNextKey_ = function() {
  return this.isHorizontal() ?
      goog.events.KeyCodes.RIGHT : goog.events.KeyCodes.DOWN;
};

/**
 * Tries to select one of the child components starting from first one.
 * Only components that can receive focus (or have children that can receive
 * focus) are qualified.
 * @return {boolean} Whether focusable child has been found.
 * @protected
 */
tv.ui.Container.prototype.selectFirstChild = function() {
  return goog.base(this, 'selectFirstChild') &&
      goog.array.some(this.children_, function(child) {
        if (child.selectFirstChild()) {
          this.setSelectedChild(child);
          return true;
        }
        return false;
      }, this);
};

/**
 * Tries to select one of the child components before currently selected one.
 * Only components that can receive focus (or have children that can receive
 * focus) are qualified.
 * @return {boolean} Whether selection changed.
 * @protected
 */
tv.ui.Container.prototype.selectPreviousChild = function() {
  return this.changeSelectedChildIndexBy_(-1, 0);
};

/**
 * Tries to select one of the child components after currently selected one.
 * Only components that can receive focus (or have children that can receive
 * focus) are qualified.
 * @return {boolean} Whether selection changed.
 * @protected
 */
tv.ui.Container.prototype.selectNextChild = function() {
  return this.changeSelectedChildIndexBy_(1, this.children_.length - 1);
};

/**
 * Tries to select one of the child components in given direction relatively to
 * currently selected one.
 * Only components that can receive focus (or have children that can receive
 * focus) are qualified.
 * @param {number} delta +/-1 for direction.
 * @param {number} lastIndex Last child index.
 * @return {boolean} Whether selection changed.
 * @private
 */
tv.ui.Container.prototype.changeSelectedChildIndexBy_ = function(
    delta, lastIndex) {
  if (!this.selectedChild_) {
    return false;
  }

  var selectedChildIndex =
      goog.array.indexOf(this.children_, this.selectedChild_);

  while (selectedChildIndex != lastIndex) {
    selectedChildIndex += delta;
    var selectedChild = this.children_[selectedChildIndex];
    if (selectedChild.getSelectedDescendantOrSelf()) {
      this.setSelectedChild(selectedChild);
      return true;
    }
  }

  return false;
};

/**
 * @return {tv.ui.Component} Selected grand-...-grandchild, or null if no
 *     child is selected.
 */
tv.ui.Container.prototype.getSelectedDescendantOrSelf = function() {
  return goog.base(this, 'getSelectedDescendantOrSelf') &&
      this.selectedChild_ &&
      this.selectedChild_.getSelectedDescendantOrSelf();
};

/**
 * @return {tv.ui.Component} Currently selected child.
 *     Guaranteed to be focusable or have focusable child selected.
 */
tv.ui.Container.prototype.getSelectedChild = function() {
  return this.selectedChild_;
};

/**
 * @param {tv.ui.Component} selectedChild Sets currently selected child.
 */
tv.ui.Container.prototype.setSelectedChild = function(selectedChild) {
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

  // No children or all children are non-focusable?
  if (!this.selectedChild_) {
    // Scroll to start.
    this.setScrollElementPosition_(this.createCoordinate_(0));

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
    this.setScrollElementPosition_(this.createCoordinate_(
        -this.getOffsetCoordinate_(selectedChildElement)));

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
  this.setScrollElementPosition_(
      this.createCoordinate_(-firstVisibleChildCoordinate));

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
 * @param {goog.math.Coordinate} scrollElementPosition Position to set.
 * @private
 */
tv.ui.Container.prototype.setScrollElementPosition_ = function(
    scrollElementPosition) {
  goog.style.setPosition(this.scrollElement_, scrollElementPosition);
  if (this.mockScrollElement_) {
    goog.style.setPosition(this.mockScrollElement_, scrollElementPosition)
  }
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
      !child.getSelectedDescendantOrSelf() &&
      !this.selectNextChild() &&
      !this.selectPreviousChild()) {
    // Child stopped being selectable, no other selectable children found.
    this.setSelectedChild(null);
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

      // Overkill, we only need to position highlight element. We might have done
      // it by calling updateHighlight_() method. However we can trigger
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
};
