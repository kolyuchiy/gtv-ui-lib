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
 * @fileoverview Classes for RotatorControl
 * 
 */

var gtv = gtv || {
  jq: {}
};

/**
 * RotatorControl class. Rotator control displays a single item of a list at
 * a time, rotating new items into view when user presses up/down.
 * @param {gtv.jq.CreationParams} createParams
 * @constructor
 */
gtv.jq.RotatorControl = function(createParams) {
  this.params_ = new gtv.jq.CreationParams(createParams);
};

/**
 * Parent element containing the control elements.
 * @type {jQuery.Element}
 * @private
 */
gtv.jq.RotatorControl.prototype.container_ = null;

/**
 * Holds the params the control was created with.
 * @type {CreationParams}
 * @private
 */
gtv.jq.RotatorControl.prototype.params_ = null;

/**
 * Holds the params for showing the control.
 * @type {ShowParams}
 * @private
 */
gtv.jq.RotatorControl.prototype.showParams_ = null;

/**
 * Key controller behavior zone for this control.
 * @type {KeyBehaviorZone}
 * @private
 */
gtv.jq.RotatorControl.prototype.behaviorZone_ = null;

/**
 * Removes the control from its container and from the key controller.
 */
gtv.jq.RotatorControl.prototype.deleteControl = function() {
  var rotatorControl = this;

  rotatorControl.keyController.removeBehaviorZone(rotatorControl.behaviorZone_);
  rotatorControl.container_.remove();
};

/**
 * Creates a new RotatorControl with the specified items and adds it to a
 * container on the page.
 * @param {gtv.jq.ShowParams} showParams Params for creating the control.
 * @return {boolean} true on success
 */
gtv.jq.RotatorControl.prototype.showControl = function(showParams) {
  var rotatorControl = this;

  rotatorControl.showParams_ = new gtv.jq.ShowParams(showParams);

  if (!rotatorControl.showParams_.contents.items) {
    throw new Error('RotatorControl requires items array');
  }

  rotatorControl.container_ = $('<div></div>')
      .attr('id', rotatorControl.params_.containerId)
      .addClass('rotator-div');

  rotatorControl.showParams_.topParent.append(rotatorControl.container_);

  for (var i = 0; i < rotatorControl.showParams_.contents.items.length; i++) {
    var itemRow = $('<div></div>').addClass('rotator-row');
    rotatorControl.container_.append(itemRow);

    var itemDiv = $('<div></div>')
      .addClass('rotator-item-div')
      .append(rotatorControl.showParams_.contents.items[i]);

    rotatorControl.showParams_.contents.items[i].data('index', i);
    rotatorControl.showParams_.contents.items[i].addClass(
        'rotator-item ' + rotatorControl.params_.styles.item);

    itemRow.append(itemDiv);
  }

  var navSelectors = {
    item: '.rotator-item',
    itemParent: '.rotator-item-div',
    itemRow: '.rotator-row'
  };

  // Configure gtv.jq.KeyActions object.
  var actions = {
    scrollIntoView: function(selectedItem, newItem, getFinishCallback) {
      rotatorControl.showItem_(selectedItem, newItem, getFinishCallback);
    }
  };

  rotatorControl.behaviorZone_ =
      new gtv.jq.KeyBehaviorZone({
        containerSelector: '#' + rotatorControl.params_.containerId,
        actions: actions,
        navSelectors: navSelectors,
        selectHidden: true
      });

  rotatorControl.params_.keyController.addBehaviorZone(
      rotatorControl.behaviorZone_, true, rotatorControl.params_.layerNames);
};

/**
 * Display the selected item, animating "away" the currently selected item and
 * then animating the new item into view.
 * @param {jQuery.Element} selectedItem The currently selected item.
 * @param {jQuery.Element} newItem Newly selected item to scroll into view).
 * @param {SynchronizedCallback.callback} getFinishCallback Callback generator
 *     that returns a callback to make when movement animations are complete.
 * @private
 */
gtv.jq.RotatorControl.prototype.showItem_ = function(selectedItem,
                                                     newItem,
                                                     getFinishCallback) {
  var rotatorControl = this;

  if (selectedItem) {
    if (selectedItem.get(0) == newItem.get(0)) {
      return;
    }

    var finishCallback = getFinishCallback();

    var itemHeight = selectedItem.height();
    selectedItem.css({
      '-webkit-animation-name': 'rotateaway'
    });
    selectedItem.get(0).addEventListener('webkitAnimationEnd', rotateAway);

    function rotateAway(event) {
      selectedItem.get(0).removeEventListener('webkitAnimationEnd', rotateAway);
      selectedItem.css({
        '-webkit-animation-name': '',
        display: 'none'
      });

      newItem.css({
        '-webkit-animation-name': 'rotatein',
        display: 'block'
      });

      newItem.get(0).addEventListener('webkitAnimationEnd', rotateIn);

      function rotateIn(event) {
        newItem.get(0).removeEventListener('webkitAnimationEnd', rotateIn);
        newItem.css({
          '-webkit-animation-name': ''
        });
        if (rotatorControl.params_.choiceCallback) {
          rotatorControl.params_.choiceCallback(newItem);
        }

        finishCallback();
      }
    }
  } else {
    newItem.css('display', 'block');
    if (rotatorControl.params_.choiceCallback) {
      rotatorControl.params_.choiceCallback(newItem);
    }
  }
};
