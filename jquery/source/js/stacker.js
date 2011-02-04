// Copyright 2010 Google Inc. All Rights Reserved.
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
 * @fileoverview Classes for StackControl
 * 
 */

var gtv = gtv || {
  jq: {}
};

/**
 * StackParams class holds creation params for the StackControl.
 * @param {gtv.jq.StackParams} opt_params Optional initialization values.
 * @constructor
 */
gtv.jq.StackParams = function(opt_params) {
  var params = opt_params || {};

  this.height = params.height;
  this.createParams = new gtv.jq.CreationParams(params.createParams);
};

/**
 * Holds params passed to the control at initialization.
 * @type {CreationParams}
 */
gtv.jq.StackParams.prototype.createParams;

/**
 * The height of the control, in pixels.
 * @type {number}
 */
gtv.jq.StackParams.prototype.height;


/**
 * StackControl class. This control arranges individual items, rotated at
 * 90 degrees, with just a label showing, at the right side of a page and,
 * through key navigation, moves the items to the center of the page (off
 * of the "stack") and into the middle, and then to a new stack on the
 * left of the page (again, rotated with only the label showing). This can
 * be useful in presenting items on a widescreen display without taking
 * up vertical real estate for navigation controls, while visually
 * focusing on the item in the middle of the page.
 * @param {StackParams} stackParams Parameters for initializing the control.
 * @constructor
 */
gtv.jq.StackControl = function(stackParams) {
  this.params_ = new gtv.jq.StackParams(stackParams);
};

/**
 * Holds the params the control was created with.
 * @type {gtv.jq.StackParams}
 * @private
 */
gtv.jq.StackControl.prototype.params_ = null;

/**
 * Holds the params the control was created with.
 * @type {gtv.jq.ShowParams}
 * @private
 */
gtv.jq.StackControl.prototype.showParams_ = null;

/**
 * Height of just the title of an item.
 * @type {number}
 * @private
 */
gtv.jq.StackControl.prototype.titleHeight_ = null;

/**
 * Height in pixels of an expanded item.
 * @type {number}
 * @private
 */
gtv.jq.StackControl.prototype.itemHeight_ = null;

/**
 * CSS3 transition string to move an item from center to left of page.
 * @type {string}
 * @private
 */
gtv.jq.StackControl.prototype.translateLeft_ = null;

/**
 * CSS3 transition string to move an item to the center of the page.
 * @type {string}
 * @private
 */
gtv.jq.StackControl.prototype.translateCenter_ = null;

/**
 * CSS3 transition string to move an item to the right of the page.
 * @type {string}
 * @private
 */
gtv.jq.StackControl.prototype.translateRight_ = null;

/**
 * Item currently displayed in the center of the control.
 * @type {jQuery.Element}
 * @private
 */
gtv.jq.StackControl.prototype.centerItem_ = null;

/**
 * Behavior zone for the control.
 * @type {gtv.jq.KeyBehaviorZone}
 * @private
 */
gtv.jq.StackControl.prototype.behaviorZone_ = null;

/**
 * Removes the control from its container and from the key controller.
 */
gtv.jq.StackControl.prototype.deleteControl = function() {
  var stackControl = this;

  if (stackControl.behaviorZone_) {
    stackControl.params_.createParams.keyController.removeBehaviorZone(
      stackControl.behaviorZone_);
  }

  if (stackControl.container_) {
    stackControl.container_.remove();
  }
};

/**
 * Creates a new StackControl with the specified items and adds it to a
 * container on the page.
 * @param {gtv.jq.ShowParams} showParams Params for showing the control.
 *     Requires captionItems passed in the controlContents. The caption will
 *     become the title of the item.
 */
gtv.jq.StackControl.prototype.showControl = function(showParams) {
  var stackControl = this;

  stackControl.showParams_ = new gtv.jq.ShowParams(showParams);
  if (!stackControl.showParams_.contents.captionItems) {
    throw new Error('StackControl requires captionItems');
  }

  var itemCount = stackControl.showParams_.contents.captionItems.length;

  var container = $('<div></div>')
      .attr('id', stackControl.params_.createParams.containerId)
      .addClass('stack-container');
  stackControl.showParams_.topParent.append(container);
  stackControl.container_ = container;

  var titleStyle = stackControl.params_.createParams.styles.title || '';

  var parentOffset = container.offset();
  var parentWidth = container.innerWidth();
  var controlSize =  parentWidth;

  // The width becomes the height when stacked, so make sure the width
  // measured from the center is no more than the vertical space available
  var titleHalfWidth = (stackControl.params_.height / 2) - parentOffset.top;

  // fit for 16:10 ratio
  stackControl.itemHeight_ = ((titleHalfWidth * 2) * 10) / 16;

  var rightEdge;
  // For each item, create a holder that can be rotated sideways and stacked
  // at the side of the screen. When stacked, only the title is visible.
  for (var i = itemCount - 1; i >= 0; i--) {
    var item = $('<div></div>').addClass('stack-item');

    var title = $('<p></p>')
        .append(stackControl.showParams_.contents.captionItems[i].caption);
    title.css({ 'min-width': (titleHalfWidth * 2) + 'px' });
    title.addClass('stack-item-title ' + titleStyle);

    title.data('index', i);
    item.append(title);

    var dataItem = stackControl.showParams_.contents.captionItems[i].item;
    dataItem
      .css({
        'height': stackControl.itemHeight_ + 'px'
      })
      .addClass('stack-data-item');
    item.append(dataItem);

    container.append(item);
    var titleHeight = title.outerHeight(true);

    // The right edge becomes the width of the window minus half the width
    // of the control (adjust for the width of the control) minus all the
    // titles that are already stacked to the right.
    rightEdge = parentWidth - titleHalfWidth - (i * (titleHeight / 2));

    // Start the item stacked to the right.
    item.css({
      '-webkit-transform': 'rotate(90deg)',
      'overflow': 'hidden',
      'float': 'left',
      'height': titleHeight + 'px',
      'position': 'absolute',
      'left': (rightEdge - (title.innerHeight() / 2)) + 'px',
      'top': (parentOffset.top + titleHalfWidth) + 'px'
    });

    // Reduce the available space in the middle by the title we just stacked.
    controlSize -= titleHeight / 2;
  }
  stackControl.titleHeight_ = titleHeight;

  // Reduce the available width again by the title border height (rotated, so
  // height it width). (outerHeight(true) includes borders, outerHeight() does
  // not, subtracted yield the border height.)
  controlSize -= (title.outerHeight(true) - title.outerHeight());

  // Precompute the translations required to move a stacked object from the
  // right stack to the center, the center to the left, and the right to
  // the center.
  stackControl.translateLeft_ = 'translate(0px, 0px) rotate(90deg)';
  stackControl.translateCenter_ = 'translate(' + (-controlSize / 2) + 'px, '
    + (-titleHalfWidth * .75) + 'px) rotate(0deg)';
  stackControl.translateRight_ = 'translate(' + (-controlSize) +
    'px, 0px) rotate(-90deg)';

  var navSelectors = {
    item: '.stack-item-title',
    itemParent: '.stack-item'
  };

  // Configure gtv.jq.KeyActions object.
  var actions = {
    scrollIntoView: function(selectedItem, newItem, getFinishCallback) {
      stackControl.scrollStack_(selectedItem, newItem, getFinishCallback);
    }
  };

  stackControl.behaviorZone_ =
      new gtv.jq.KeyBehaviorZone({
        containerSelector: '#' + stackControl.params_.createParams.containerId,
        actions: actions,
        navSelectors: navSelectors
      });

  stackControl.params_.createParams.keyController.addBehaviorZone(
    stackControl.behaviorZone_,
    true,
    stackControl.params_.createParams.layerName);
};

/**
 * Scrolls the newly selected item into view. Called by the key controller
 * scrollIntoView action. If selectedItem and newItem are multiple layers
 * away, multiple stacks visually scroll together. This method only waits
 * for animations to complete if multiple items are moving; for one item,
 * multiple animations are allowed to proceed in parallel for a good visual
 * effect.
 * @param {jQuery.Element} selectedItem The currently selected item.
 * @param {jQuery.Element} newItem The newly selected item.
 * @param {SyncrhonizedCallback.acquireCallback} getFinishCallback A function
 *     to call to acquire an animation-finished callback.
 * @private
 */
gtv.jq.StackControl.prototype.scrollStack_ = function(selectedItem,
                                                      newItem,
                                                      getFinishCallback) {
  var stackControl = this;

  var item;
  var newItemNum = newItem.data('index');
  var centerNum;
  if (stackControl.centerItem_) {
    centerNum = stackControl.centerItem_.data('index');
    item = stackControl.centerItem_.parent();
  } else {
    centerNum = newItemNum + 1;
  }

  var dir = -1;
  if (centerNum < newItemNum) {
    dir = 1;
  }

  // Enable simultanous animations if we're moving one at a time.
  // (Using getFinishCallback will force the key controller to wait for
  // each animation to end before allowing the next nav event to proceed.)
  if (Math.abs(centerNum - newItemNum) <= 1) {
    getFinishCallback = null;
  }

  var totalItemHeight = stackControl.titleHeight_ + stackControl.itemHeight_;
  for (var i = centerNum; i != newItemNum; i += dir) {
    if (item) {
      if (dir > 0) {
        item.css({
          '-webkit-transform': stackControl.translateLeft_,
          '-webkit-transition': 'all 2s ease-in-out',
          'height': stackControl.titleHeight_ + 'px'
        });
        item = item.prev();
      } else {
        item.css({
          '-webkit-transform': stackControl.translateRight_,
          '-webkit-transition': 'all 2s ease-in-out',
          'height': stackControl.titleHeight_ + 'px'
        });
        item = item.next();
      }
    } else {
      item = newItem.parent();
    }

    function processTransitionEnd(callbackInstance) {
      function moveTransitionEnd(event) {
        event.target.removeEventListener('webkitTransitionEnd',
                                         moveTransitionEnd);
        if (callbackInstance) {
          callbackInstance();
        }
      }
      return moveTransitionEnd;
    }

    if (getFinishCallback) {
      item.get(0).addEventListener('webkitTransitionEnd',
                                   processTransitionEnd(getFinishCallback()));
    }
    item.css({
      '-webkit-transition': 'all 2s ease-in-out',
      '-webkit-transform': stackControl.translateCenter_,
      'height': totalItemHeight + 'px'
    });
  }

  stackControl.centerItem_ = newItem;
};


