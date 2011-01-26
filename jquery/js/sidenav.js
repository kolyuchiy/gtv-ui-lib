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
 * @fileoverview Classes for SideNavControl
 * @author shines@google.com (Steven Hines)
 */

var gtv = gtv || {
  jq : {}
};

/**
 * SideNavParams class holds configuration values specific to SideNav.
 * @constructor
 */
gtv.jq.SideNavParams = function() {
};

/**
 * CreateParams for the SideNav control.
 * @type {CreateParams}
 */
gtv.jq.SideNavParams.prototype.createParams = null;

/**
 * Behaviors for the SideNav control.
 * @type {SideNavBehaviors}
 */
gtv.jq.SideNavParams.prototype.behaviors = null;


/**
 * SideNavBehaviors configures the behaviors for a SideNav control.
 * @constructor
 */
gtv.jq.SideNavBehaviors = function() {
};

/**
 * Tells the SideNav control to pop out from a side. One of: 'left', 'right',
 * 'top', 'bottom'.
 * @type {string}
 */
gtv.jq.SideNavBehaviors.prototype.popOut = null;

/**
 * If true, tells the SideNav control to fade in/out when selection moves to it.
 * @type {boolean}
 */
gtv.jq.SideNavBehaviors.prototype.fade = null;

/**
 * If true, the first item in the SideNav menu will be 'chosen' when the
 * control is shown.
 * @type {boolean}
 */
gtv.jq.SideNavBehaviors.prototype.selectOnInit = null;


/**
 * SideNavControl class. SideNav control is a pop-out or fade-in menu control
 * that can manage selection or contain other controls.
 * @param {gtv.jq.SideNavParams} sidenavParams
 * @constructor
 */
gtv.jq.SideNavControl = function(sidenavParams) {
  this.params_ = jQuery.extend(sidenavParams.createParams, sidenavParams);
};

/**
 * Parent element containing the control elements.
 * @type {jQuery.Element}
 * @private
 */
gtv.jq.SideNavControl.prototype.container_ = null;

/**
 * Collection of menu-item rows in the sidenav control.
 * @type {Array.<jQuery.Element>}
 * @private
 */
gtv.jq.SideNavControl.prototype.rows_ = null;

/**
 * Holds the params the control was created with.
 * @type {ControlParams}
 * @private
 */
gtv.jq.SideNavControl.prototype.params_ = null;

/**
 * Key controller behavior zone for this control.
 * @type {KeyBehaviorZone}
 * @private
 */
gtv.jq.SideNavControl.prototype.behaviorZone_ = null;

/**
 * Moves selection to the SideNav Control.
 */
gtv.jq.SideNavControl.prototype.selectControl = function() {
  var sideNavControl = this;

  sideNavControl.params_.keyController.setZone(sideNavControl.behaviorZone_);
};

/**
 * Removes the control from its container and its key control zone.
 */
gtv.jq.SideNavControl.prototype.deleteControl = function() {
  var sideNavControl = this;

  sideNavControl.params_.keyController.removeBehaviorZone(
    sideNavControl.behaviorZone_);
  sideNavControl.container_.remove();
};

/**
 * Creates a new SideNavControl with the specified items and adds it to a
 * container_ on the page.
 * @param {gtv.jq.ShowParams} controlParams Params for creating the control.
 * @return {boolean} true on success
 */
gtv.jq.SideNavControl.prototype.showControl = function(controlParams) {
  var sideNavControl = this;

  sideNavControl.params_ =
      jQuery.extend(sideNavControl.params_, controlParams);

  if (!gtv.jq.CreateParams.validateParams(sideNavControl.params_))
    return false;

  sideNavControl.params_.behaviors = sideNavControl.params_.behaviors || {};

  sideNavControl.container_ = $('<div></div>');
  sideNavControl.container_.addClass('sidenav-container')
    .attr('id', sideNavControl.params_.containerId);
  sideNavControl.params_.topParent.append(sideNavControl.container_);

  sideNavControl.rows_ = $('<div></div>').addClass('sidenav-rows');
  sideNavControl.container_.append(sideNavControl.rows_);

  var addNextItem = gtv.jq.GtvCore.makeAddNextItemParams(controlParams);

  var firstItem;
  var j = 0;
  while (true) {
    var itemRow;
    if (!itemRow ||
        (!sideNavControl.params_.behaviors.orientation ||
          sideNavControl.params_.behaviors.orientation == 'vertical')) {
      itemRow = $('<div></div>').addClass('sidenav-item-row ' +
          sideNavControl.params_.styles.row);
      sideNavControl.rows_.append(itemRow);
    }

    var itemDiv = $('<div></div>').addClass('sidenav-item-div ' +
        sideNavControl.params_.styles.itemDiv);
    if (sideNavControl.params_.behaviors.orientation &&
        sideNavControl.params_.behaviors.orientation == 'horizontal')
      itemDiv.css('float', 'left');
    itemRow.append(itemDiv);

    var item = $('<div></div>')
      .addClass('sidenav-item ' + sideNavControl.params_.styles.normal
          + ' ' + sideNavControl.params_.styles.item)
      .data('index', j);
    itemDiv.append(item);

    if (!firstItem)
      firstItem = item;

    if (!addNextItem(item)) {
      itemDiv.remove();
      if (!sideNavControl.params_.behaviors.orientation ||
          sideNavControl.params_.behaviors.orientation == 'vertical')
        itemRow.remove();
      break;
    }

    j++;
  }

  sideNavControl.setBehaviors(sideNavControl.params_.behaviors, true);

  var keyMapping = {
    // enter key calls the chosenAction callback provided by the control client.
    13: function(selectedItem, newSelected) {
      sideNavControl.handleChosenAction_(selectedItem);
      return new gtv.jq.Selection('skip');
    }
  };
  var navSelectors = {
    item: '.sidenav-item',
    itemParent: '.sidenav-item-div',
    itemRow: '.sidenav-item-row'
  };
  var selectionClasses = {
    basic: sideNavControl.params_.styles.selected
  };
  var actions = {
    // click calls the chosenAction callback provided by the control client.
    click: function(selectedItem, newItem) {
      sideNavControl.handleChosenAction_(selectedItem);
    },
    // When entering the zone for this control, animate the nav bar into view
    // as appropriate (scroll in from sides, or fade in)
    enterZone: function() {
      if (sideNavControl.params_.behaviors.popOut) {
        sideNavControl.container_.css({
          '-webkit-transition': 'all 1s ease-in-out'
        });
        if (sideNavControl.params_.behaviors.popOut == 'left') {
          sideNavControl.container_.css({
            left: '0px'
          });
        } else if (sideNavControl.params_.behaviors.popOut == 'right') {
          var windowWidth = $(window).width();
          var width = sideNavControl.container_.outerWidth(true);
          sideNavControl.container_.css({
            left: (windowWidth - width) + 'px'
          });
        } else if (sideNavControl.params_.behaviors.popOut == 'top') {
          sideNavControl.container_.css({
            top: '0px'
          });
        } else if (sideNavControl.params_.behaviors.popOut == 'bottom') {
          var windowHeight = $(window).height();
          var height = sideNavControl.container_.outerHeight(true);
          sideNavControl.container_.css({
            top: (windowHeight - height) + 'px'
          });
        }
      }
      else if (sideNavControl.params_.behaviors.fade) {
        sideNavControl.container_.css({
          '-webkit-transition': 'all 1s ease-in-out'
        });

        sideNavControl.container_.css({
          opacity: '1.0'
        });
      }
      return sideNavControl.chosenItem;
    },
    // When leaving the zone for this control, animate the nav bar out of view
    // as appropriate (scroll out to sides, or fade out)
    leaveZone: function() {
      if (sideNavControl.params_.behaviors.popOut) {
        sideNavControl.container_.css({
          '-webkit-transition': 'all 1s ease-in-out'
        });
        if (sideNavControl.params_.behaviors.popOut == 'left') {
          var width = sideNavControl.container_.outerWidth(true);
          sideNavControl.container_.css({
            left: (-width) + 'px'
          });
        } else if (sideNavControl.params_.behaviors.popOut == 'right') {
          var windowWidth = $(window).width();
          sideNavControl.container_.css({
            left: (windowWidth) + 'px'
          });
        } else if (sideNavControl.params_.behaviors.popOut == 'top') {
          var height = sideNavControl.container_.outerHeight(true);
          sideNavControl.container_.css({
            top: (-height) + 'px'
          });
        } else if (sideNavControl.params_.behaviors.popOut == 'bottom') {
          var windowHeight = $(window).height();
          sideNavControl.container_.css({
            top: (windowHeight) + 'px'
          });
        }
      } else if (sideNavControl.params_.behaviors.fade) {
        sideNavControl.container_.css({
          '-webkit-transition': 'all 1s ease-in-out'
        });
        sideNavControl.container_.css({
          opacity: '0'
        });
      }
    }
  };

  sideNavControl.behaviorZone_ =
      new gtv.jq.KeyBehaviorZone('#' + sideNavControl.params_.containerId,
                                 keyMapping,
                                 actions,
                                 navSelectors,
                                 selectionClasses);

  sideNavControl.params_.keyController.addBehaviorZone(
    sideNavControl.behaviorZone_, true, sideNavControl.params_.layerNames);

  if (sideNavControl.params_.behaviors.selectOnInit) {
    sideNavControl.handleChosenAction_(firstItem);
  }

  return true;
};

/**
 * Applies a new set of behaviors to the control.
 * @param {Object} behaviors New behaviors to apply to the control.
 * @param {boolean} force Set the new behaviors even if identical.
 */
gtv.jq.SideNavControl.prototype.setBehaviors = function(behaviors, force) {
  var sideNavControl = this;

  if (!force && behaviors === sideNavControl.params_.behaviors) {
    return;
  }

  sideNavControl.params_.behaviors = behaviors || {};

  var height = sideNavControl.rows_.height();
  var width = sideNavControl.rows_.width();
  sideNavControl.container_.css({ height: height + 'px',
                                 width: width + 'px'});

  if (behaviors.popOut) {
    // If this is a popout nav bar from the side, position the container at
    // its starting point off the page, based on the side of the page it is
    // popping out of.
    if (behaviors.popOut == 'left') {
      var containerWidth = sideNavControl.container_.outerWidth(true);
      sideNavControl.container_.css({
        position: 'absolute',
        left: (-containerWidth) + 'px'
      });
    } else if (behaviors.popOut == 'right') {
      var windowWidth = $(window).width();
      sideNavControl.container_.css({
        position: 'absolute',
        left: (windowWidth) + 'px'});
    } else if (behaviors.popOut == 'top') {
      var containerHeight = sideNavControl.container_.outerHeight(true);
      sideNavControl.container_.css({
        position: 'absolute',
        top: (-containerHeight) + 'px'
      });
    } else if (behaviors.popOut == 'bottom') {
      var windowHeight = $(window).height();
      sideNavControl.container_.css({
        position: 'absolute',
        top: (windowHeight) + 'px'
      });
    }

    // Add a semi-opaque backdrop under the nav var when its popped out for
    // visual clarity.
    var backdrop = sideNavControl.container_.children('.sidenav-backdrop');
    if (backdrop.length == 0) {
      backdrop = $('<div></div>').addClass('sidenav-backdrop');
      sideNavControl.container_.prepend(backdrop);
    }

    sideNavControl.rows_.css('position', 'absolute');
  } else if (behaviors.fade) {
    // If this is a fade-in nav bar, set its opacity to 0 to start.
    sideNavControl.rows_.css('position', 'absolute');
    sideNavControl.container_.css({
      opacity: '0'
    });
  } else {
    // If the nav menu is neither popout or fade-in, it's statically positioned.
    var backdrop = sideNavControl.container_.find('.sidenav-backdrop');
    backdrop.remove();
    sideNavControl.rows_.css('position', 'static');
  }
};

/**
 * Event handler for click or <enter> keypress. Moves the chosen style if
 * supplied, and makes choice callback if supplied.
 * @param {jQuery.Element} selectedItem The item that received the event.
 * @private
 */
gtv.jq.SideNavControl.prototype.handleChosenAction_ = function(selectedItem) {
  var sideNavControl = this;

  if (sideNavControl.params_.styles.chosen) {
    if (sideNavControl.chosenItem) {
      sideNavControl.chosenItem.removeClass(
        sideNavControl.params_.styles.chosen);
      sideNavControl.chosenItem.addClass(sideNavControl.params_.styles.normal);
    }
    selectedItem.removeClass(sideNavControl.params_.styles.normal);
    selectedItem.addClass(sideNavControl.params_.styles.chosen);
  }

  sideNavControl.chosenItem = selectedItem;

  if (sideNavControl.params_.choiceCallback) {
    sideNavControl.params_.choiceCallback(selectedItem);
  }
};

