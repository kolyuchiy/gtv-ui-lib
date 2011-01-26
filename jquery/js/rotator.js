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
 * @author shines@google.com (Steven Hines)
 */

var gtv = gtv || {
  jq : {}
};

/**
 * RotatorControl class. Rotator control displays a single item of a list at
 * a time, rotating new items into view when user presses up/down.
 * @param {gtv.jq.CreateParams} createParams
 * @constructor
 */
gtv.jq.RotatorControl = function(createParams) {
  this.params_ = createParams;
};

/**
 * Parent element containing the control elements.
 * @type {jQuery.Element}
 * @private
 */
gtv.jq.RotatorControl.prototype.container_ = null;

/**
 * Holds the params the control was created with.
 * @type {ControlParams}
 * @private
 */
gtv.jq.RotatorControl.prototype.params_ = null;

/**
 * Key controller behavior zone for this control.
 * @type {KeyBehaviorZone}
 * @private
 */
gtv.jq.RotatorControl.prototype.behaviorZone_ = null;

/**
 * Removes the control from its container and from the key controller.
 */
gtv.jq.RotatorControl.prototype.deleteControl = function()
{
  var rotatorControl = this;

  rotatorControl.keyController.removeBehaviorZone(rotatorControl.behaviorZone_);
  rotatorControl.container_.remove();
};

/**
 * Creates a new RotatorControl with the specified items and adds it to a
 * container on the page.
 * @param {gtv.jq.ShowParams} controlParams Params for creating the control.
 * @return {boolean} true on success
 */
gtv.jq.RotatorControl.prototype.showControl = function(controlParams) {
  var rotatorControl = this;

  rotatorControl.params_ =
      jQuery.extend(rotatorControl.params_, controlParams);

  if (!gtv.jq.CreateParams.validateParams(rotatorControl.params_))
    return false;

  rotatorControl.container_ = $('<div></div>')
      .attr('id', rotatorControl.params_.containerId)
      .addClass('rotator-div');

  rotatorControl.params_.topParent.append(rotatorControl.container_);

  for (var i = 0; i < rotatorControl.params_.items.length; i++) {
    var itemRow = $('<div></div>').addClass('rotator-row');
    rotatorControl.container_.append(itemRow);

    var itemDiv = $('<div></div>')
      .addClass('rotator-item-div')
      .append(rotatorControl.params_.items[i]);

    rotatorControl.params_.items[i].data('index', i);
    rotatorControl.params_.items[i].addClass(
        'rotator-item ' + rotatorControl.params_.styles.item);

    itemRow.append(itemDiv);
  }

  var navSelectors = {
    item: '.rotator-item',
    itemParent: '.rotator-item-div',
    itemRow: '.rotator-row'
  };

  var actions = {
    scrollIntoView: function(selectedItem, newItem, getFinishCallback) {
      rotatorControl.showItem_(selectedItem, newItem, getFinishCallback);
    }
  };

  rotatorControl.behaviorZone_ =
      new gtv.jq.KeyBehaviorZone('#' + rotatorControl.params_.containerId,
                                 null,  // no key actions
                                 actions,
                                 navSelectors,
                                 null,  // no selection classes
                                 null,  // no nav data
                                 false,  // don't save index
                                 false,  // don't use geometry
                                 true);  // allow hidden items to be selected

  rotatorControl.params_.keyController.addBehaviorZone(
      rotatorControl.behaviorZone_, true, rotatorControl.params_.layerNames);

  return true;
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
