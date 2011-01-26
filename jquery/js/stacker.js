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
 * @author shines@google.com (Steven Hines)
 */

var gtv = gtv || {
  jq : {}
};

/**
 * StackParams class holds creation params for the StackControl.
 * @constructor
 */
gtv.jq.StackParams = function() {
};

/**
 * Holds params passed to the control at initialization.
 * @type {CreateParams}
 */
gtv.jq.StackParams.prototype.createParams = null;

/**
 * The height of the control, in pixels.
 * @type {number}
 */
gtv.jq.StackParams.prototype.height = null;


/**
 * StackControl class.
 * @param {StackParams} stackParams Parameters for initializing the control.
 * @constructor
 */
gtv.jq.StackControl = function(stackParams) {
  this.params_ = jQuery.extend(stackParams.createParams, stackParams);
};

/**
 * Holds the params the control was created with.
 * @type {ControlParams}
 * @private
 */
gtv.jq.StackControl.prototype.params_ = null;

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
 * Behavior zone for the control.
 * @type {gtv.jq.KeyBehaviorZone}
 * @private
 */
gtv.jq.StackControl.prototype.behaviorZone_ = null;

/**
 * Removes the control from its container and from the key controller.
 */
gtv.jq.StackControl.prototype.deleteControl = function()
{
  var stackControl = this;

  if (stackControl.behaviorZone_) {
    stackControl.params_.keyController.removeBehaviorZone(
      stackControl.behaviorZone_);
  }

  if (stackControl.container_) {
    stackControl.container_.remove();
  }
};

/**
 * Creates a new SideNavControl with the specified items and adds it to a
 * container on the page.
 * @param {gtv.jq.ShowParams} controlParams Params for showing the control.
 */
gtv.jq.StackControl.prototype.showControl = function(controlParams) {
  var stackControl = this;

  stackControl.params_ =
      jQuery.extend(stackControl.params_, controlParams);

  if (!gtv.jq.CreateParams.validateParams(stackControl.params_))
    return false;

  var itemCount = stackControl.params_.items.length;

  var container = $('<div></div>')
      .attr('id', stackControl.params_.containerId)
      .addClass('stack-container');
  stackControl.params_.topParent.append(container);
  stackControl.container_ = container;

  var titleStyle = stackControl.params_.styles.title || '';

  var parentOffset = container.offset();
  var parentWidth = container.innerWidth();
  var controlSize =  parentWidth;

  // The width becomes the height when stacked, so make sure the width
  // measured from the center is no more than the vertical space available
  var titleHalfWidth = (stackControl.params_.height / 2) - parentOffset.top;

  // fit for 16:10 ratio
  stackControl.itemHeight_ = ((titleHalfWidth * 2) * 10) / 16;

  var rightEdge;
  for (var i = itemCount - 1; i >= 0; i--) {
    var item = $('<div></div>').addClass('stack-item');

    var title = $('<p></p>').append(stackControl.params_.items[i].title);
    title.css({ 'min-width': (titleHalfWidth * 2) + 'px' });
    title.addClass('stack-item-title ' + titleStyle);

    title.data('index', i);
    item.append(title);

    var dataItem = stackControl.params_.items[i].dataItem;
    dataItem
      .css({
        'height': stackControl.itemHeight_ + 'px'
      })
      .addClass('stack-data-item');
    item.append(dataItem);

    container.append(item);
    var titleHeight = title.outerHeight(true);

    rightEdge = parentWidth - titleHalfWidth - (i * (titleHeight / 2));
    item.css({
      '-webkit-transform': 'rotate(90deg)',
      'overflow': 'hidden',
      'float': 'left',
      'height': titleHeight + 'px',
      'position': 'absolute',
      'left': (rightEdge - (title.innerHeight() / 2)) + 'px',
      'top': (parentOffset.top + titleHalfWidth) + 'px'
    });

    controlSize -= titleHeight / 2;
  }
  stackControl.titleHeight_ = titleHeight;
  controlSize -= (title.outerHeight(true) - title.outerHeight());

  stackControl.translateLeft_ = 'translate(0px, 0px) rotate(90deg)';
  stackControl.translateCenter_ = 'translate(' + (-controlSize / 2) + 'px, '
    + (-titleHalfWidth * .75) + 'px) rotate(0deg)';
  stackControl.translateRight_ = 'translate(' + (-controlSize) +
    'px, 0px) rotate(-90deg)';

  var navSelectors = {
    item: '.stack-item-title',
    itemParent: '.stack-item'
  };

  var actions = {
    scrollIntoView: function(selectedItem, newItem, getFinishCallback) {
      stackControl.scrollStack_(selectedItem, newItem, getFinishCallback);
    }
  };

  stackControl.behaviorZone_ =
      new gtv.jq.KeyBehaviorZone('#' + stackControl.params_.containerId,
                                 null,
                                 actions,
                                 navSelectors);

  stackControl.params_.keyController.addBehaviorZone(
    stackControl.behaviorZone_, true, stackControl.params_.layerName);
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
  var selectedNum;
  if (selectedItem) {
    selectedNum = selectedItem.data('index');
    item = selectedItem.parent();
  } else {
    selectedNum = newItemNum + 1;
  }

  var dir = -1;
  if (selectedNum < newItemNum) {
    dir = 1;
  }

  // Enable simultanous animations if we're moving one at a time.
  // (Using getFinishCallback will force the key controller to wait for
  // each animation to end before allowing the next nav event to proceed.)
  if (Math.abs(selectedNum - newItemNum) <= 1) {
    getFinishCallback = null;
  }

  var totalItemHeight = stackControl.titleHeight_ + stackControl.itemHeight_;
  for (var i = selectedNum; i != newItemNum; i += dir) {
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
};


