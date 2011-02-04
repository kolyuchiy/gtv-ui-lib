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
 * @fileoverview Classes for RowControl and RollerControl.
 *
 * RowControl displays a horizontal row of items across the page. The row can
 * hold more items than can fit on the page. In this case, when the selection
 * moves to an item not completely displayed on the page, the row will scroll
 * smoothly to move it into view. Uses the d-pad/arrow keys to move selection
 * in the row. This is used by the BuilderPage to show thumbnails of photos
 * or videos in a feed, etc.
 *
 * RollerControl displays multiple RowControls in a vertical rolling display,
 * such that the active row is displayed in the vertical middle of the page.
 * When the user moves the selection, for instance, down, the all rows are
 * shifted up so that the next row is centered. The row that was at the top
 * is moved to the bottom. These movements are animated to provide a visual
 * clue to the user for navigation. Can be used to display rows of items
 * where the items are all of a kind, but may be separated by categories
 * (each category a separate row).
 *
 * 
 */

var gtv = gtv || {
  jq: {}
};

/**
 * Constructs an ItemRow, used by RowControl
 * @constructor
 * @private
 */
gtv.jq.ItemRow_ = function() {
};

/**
 * Creates a new key navigable row of items, contained in a container of
 * the specified id, with optional styles applied.
 * @param {gtv.jq.CreationParams} params Parameters for creating the control.
 * @param {gtv.jq.ShowParams} showParams Parameters for showing the control.
 * @return {jQuery.Element} The new row's container element.
 */
gtv.jq.ItemRow_.prototype.makeRow = function(params, showParams) {
  var container = $('<div></div>')
    .attr('id', params.containerId)
    .addClass('scroll-row ' + params.styles.row)
    .data('index', 0);

  var itemsDiv =
      $('<div></div>')
      .addClass('scroll-items-div ' + params.styles.itemsDiv);
  container.append(itemsDiv);

  var addNextItem =
    gtv.jq.GtvCore.makeAddNextItemParams(showParams.contents);
  if (!addNextItem) {
    throw new Error('Row requires either items or itemsGenerator');
  }

  var itemAdded = true;
  var demoDiv;
  var index = 0;
  while (itemAdded) {
    demoDiv = $('<div></div>')
        .addClass('scroll-div ' + params.styles.itemDiv);
    itemsDiv.append(demoDiv);

    var item = $('<div></div>')
        .addClass('scroll-item ' + params.styles.item);
    item.data('index', index);
    demoDiv.append(item);

    itemAdded = addNextItem(item);
    index++;
  }
  demoDiv.remove();

  return container;
};


/**
 * Creates a new RowControl object.
 * @param {CreationParams} createParams Configuration params for the control.
 * @constructor
 */
gtv.jq.RowControl = function(createParams) {
  this.params_ = new gtv.jq.CreationParams(createParams);
};

/**
 * Holds the params the control was created with.
 * @type gtv.jq.CreationParams
 * @private
 */
gtv.jq.RowControl.prototype.params_ = null;

/**
 * Holds the params for showing the control.
 * @type gtv.jq.ShowParams
 * @private
 */
gtv.jq.RowControl.prototype.showParams_ = null;

/**
 * Parent element containing the row elements.
 * @type jQuery.Element
 * @private
 */
gtv.jq.RowControl.prototype.rowContainer_ = null;

/**
 * Instance of ItemRow created by this row control to represent its items on the
 *    page.
 * @type gtv.jq.ItemRow_
 * @private
 */
gtv.jq.RowControl.prototype.itemRow_ = null;

/**
 * Key controller behavior zone for this control.
 * @type KeyBehaviorZone
 * @private
 */
gtv.jq.RowControl.prototype.behaviorZone_ = null;

/**
 * Removes a row control from its container and disables key control.
 */
gtv.jq.RowControl.prototype.deleteControl = function() {
  var rowControl = this;

  if (rowControl.params_.keyController) {
    rowControl.params_.keyController.removeBehaviorZone(
        rowControl.behaviorZone_);
  }

  rowControl.rowContainer_.remove();
};

/**
 * Creates a new RowControl with the specified items and adds it to a
 * container on the page. The container will trigger a 'load' event when
 * the contents have finished loading.
 * @param {gtv.jq.ShowParams} showParams Parameters for creating the control.
 */
gtv.jq.RowControl.prototype.showControl = function(showParams) {
  var rowControl = this;
  rowControl.showParams_ = new gtv.jq.ShowParams(showParams);

  rowControl.itemRow_ = new gtv.jq.ItemRow_();
  rowControl.rowContainer_ =
      rowControl.itemRow_.makeRow(rowControl.params_, rowControl.showParams_);

  showParams.topParent.append(rowControl.rowContainer_);
  rowControl.rowContainer_.data('row-control', rowControl);

  gtv.jq.GtvCore.triggerOnLoad(rowControl.rowContainer_);
};

/**
 * Enables key controller navigation for the control.
 */
gtv.jq.RowControl.prototype.enableNavigation = function() {
  var rowControl = this;

  var navSelectors = {
    item: '.scroll-item',
    itemParent: '.scroll-div',
    itemRow: '.scroll-row'
  };

  var selectionClasses = {
    basic: rowControl.params_.styles.selected
  };

  var keyMapping;
  keyMapping = {
    // enter key
    13: function(selectedItem, newSelected) {
      if (rowControl.params_.choiceCallback) {
        rowControl.params_.choiceCallback(selectedItem);
      }
      return new gtv.jq.Selection('skip');
    },
    // end key moves selection to the last item in the row.
    35: function(selectedItem, newSelected) {
      var selected = rowControl.rowContainer_.find('.scroll-item').last();
      return new gtv.jq.Selection('selected', selected);
    },
    // home key moves selection to the first item in the row.
    36: function(selectedItem, newSelected) {
      var selected = rowControl.rowContainer_.find('.scroll-item').first();
      return new gtv.jq.Selection('selected', selected);
    }
  };

  // Configure gtv.jq.KeyActions object.
  var actions = {
    scrollIntoView: function(selectedItem, newItem, getFinishCallback) {
      rowControl.scrollRow(newItem, getFinishCallback);
    },
    click: function(selectedItem) {
      if (rowControl.params_.choiceCallback) {
        rowControl.params_.choiceCallback(selectedItem);
      }
    }
  };

  rowControl.behaviorZone_ =
      new gtv.jq.KeyBehaviorZone({
        containerSelector: '#' + rowControl.params_.containerId,
        keyMapping: keyMapping,
        actions: actions,
        navSelectors: navSelectors,
        selectionClasses: selectionClasses
      });

  rowControl.params_.keyController.addBehaviorZone(
    rowControl.behaviorZone_,
    true,
    rowControl.params_.layerNames);
};

/**
 * Scrolls the row so that the specified item is in view.
 * @param {jQuery.Element} item The item to scroll into view.
 * @param {SynchronizedCallback.callback} getFinishedAction Callback generator
 *     that returns a callback to make when movement animations are complete.
 * @private
 */
gtv.jq.RowControl.prototype.scrollRow = function(item, getFinishedAction) {
  var rowControl = this;

  var scrollRow = rowControl.rowContainer_;

  var itemOffset = item.position();
  var itemWidth = item.parent().outerWidth();

  var containerWidth = scrollRow.innerWidth();

  var scrollDiv = scrollRow.children('.scroll-items-div');
  var scrollDivOffset = scrollDiv.position();

  if (itemOffset.left + itemWidth + scrollDivOffset.left > containerWidth) {
    // If the item is not fully visible on the right side of the control,
    // move it into view, with animation.
    var move =
      itemOffset.left + itemWidth + scrollDivOffset.left - containerWidth;

    scrollDiv.stop().animate({
        left: '-=' + move
      },
      getFinishedAction());
  }
  else if (itemOffset.left + scrollDivOffset.left < 0) {
    // If the item is not fully visible on the left side of the control,
    // move it into view, with animation.
    var move = itemOffset.left + scrollDivOffset.left;

    scrollDiv.stop().animate({
        left: '-=' + move
      },
      getFinishedAction());
  }
};


/**
 * RollerParams class contains roller-control specific creation params.
 * @param {gtv.jq.RollerParams} opt_params Optional initial values.
 * @constructor
 */
gtv.jq.RollerParams = function(opt_params) {
  var params = opt_params || {};

  this.createParams = new gtv.jq.CreationParams(params.createParams);
  this.rollerHeight = params.rollerHeight || 0;
};

/**
 * Creation params for the roller control.
 * @type CreationParams
 */
gtv.jq.RollerParams.prototype.createParams;

/**
 * Height, in pixels, of the new roller container. Defaults to 2.5 times the
 * height of one row.
 * @type number
 */
gtv.jq.RollerParams.prototype.rollerHeight;

/**
 * RollerControl class. RollerControl displays a vertial stack of RowControls
 * and 'rolls' them up/down as the user scrolls between the rows.
 * @param {RollerParams} rollerParams Values to initialize the control with.
 * @constructor
 */
gtv.jq.RollerControl = function(rollerParams) {
  this.params_ = new gtv.jq.RollerParams(rollerParams);
};

/**
 * Holds the params the control was created with.
 * @type gtv.jq.CreationParams
 * @private
 */
gtv.jq.RollerControl.prototype.params_ = null;

/**
 * Holds the params to show the control.
 * @type gtv.jq.ShowParams
 * @private
 */
gtv.jq.RollerControl.prototype.showParams_ = null;

/**
 * Parent element containing the roller elements.
 * @type jQuery.Element
 * @private
 */
gtv.jq.RollerControl.prototype.container_ = null;

/**
 * Key controller behavior zone for this control.
 * @type KeyBehaviorZone
 * @private
 */
gtv.jq.RollerControl.prototype.behaviorZone_ = null;

/**
 * Removes a roller control from its container and disables key control.
 */
gtv.jq.RollerControl.prototype.deleteControl = function() {
  var rollerControl = this;

  if (rollerControl.params_.createParams.keyController) {
    rollerControl.params_.createParams.keyController.removeBehaviorZone(
      rollerControl.behaviorZone_);
  }

  rollerControl.container_.remove();
};

/**
 * Creates a new RollerControl with the specified itms and adds it to a
 * container on the page.
 * @param {gtv.jq.ShowParams} showParams Parameters for creating the control.
 */
gtv.jq.RollerControl.prototype.showControl = function(showParams) {
  var roller = this;

  roller.showParams_ = new gtv.jq.ShowParams(showParams);
  if (!roller.showParams_.contents.contentsArray) {
    throw new Error('RollerControl requires contents array');
  }

  var container = $('<div></div>')
    .attr('id', roller.params_.createParams.containerId)
    .addClass('roller-container');
  showParams.topParent.append(container);

  roller.container_ = container;

  var height = 0;
  var rowCount = roller.showParams_.contents.contentsArray.length;
  var rowsLoaded = 0;
  for (var j = 0; j < rowCount; j++) {
    var rowCreateParams = {
      containerId: roller.params_.createParams.containerId + '-row-' + j,
      styles: roller.params_.createParams.styles
    };

    var rowControl = new gtv.jq.RowControl(rowCreateParams);

    var rowShowParams = {
      topParent: container,
      contents: roller.showParams_.contents.contentsArray[j]
    };
    rowControl.showControl(rowShowParams);

    // For each row, set a load event callback to wait for resources in the
    // row to load. After all the rows have loaded, scroll to the first item
    // in the first row.
    var row = container.children('#' + rowCreateParams.containerId);
    row.load(function() {
      rowsLoaded++;
      if (rowsLoaded == rowCount) {
        height = $(this).height();
        var rowWidth = $(this).width();
        var borderWidth = $(this).outerWidth(true) - $(this).innerWidth();
        $(this).width($(this).innerWidth() - borderWidth);

        // Set the container height of the roller control, either using the
        // supplied number or a number computed from the height of a single row.
        roller.params_.rollerHeight =
          roller.params_.rollerHeight || height * 2.5;
        container.height(roller.params_.rollerHeight);

        var firstItem = container.find('.scroll-item').eq(0);
        roller.scrollToRow(null, firstItem, function() {});
      }
    });
  }
};

/**
 * Call this to enables key controller navigation for the control. Key
 * navigation must be explicitly enabled for the roller control.
 */
gtv.jq.RollerControl.prototype.enableNavigation = function() {
  var roller = this;

  var keyMapping = {
    // enter key
    13: function(selectedItem, newSelected) {
      if (roller.params_.createParams.choiceCallback) {
        roller.params_.createParams.choiceCallback(selectedItem);
      }
      return new gtv.jq.Selection('skip');
    },
    // up arrow
    38: function(selectedItem, newItem) {
      return roller.upArrowAction(selectedItem, newItem);
    },
    // down arrow
    40: function(selectedItem, newItem) {
      return roller.downArrowAction(selectedItem, newItem);
    }
  };

  var navSelectors = {
    item: '.scroll-item',
    itemParent: '.scroll-div',
    itemRow: '.scroll-row'
  };

  var selectionClasses = {
    basic: roller.params_.createParams.styles.selected
  };

  // Configure gtv.jq.KeyActions object.
  var actions = {
    scrollIntoView: function(selectedItem, newItem, getFinishCallback) {
      roller.scrollToRow(selectedItem, newItem, getFinishCallback);
    },
    click: function(selectedItem) {
      if (roller.params_.createParams.choiceCallback) {
        roller.params_.createParams.choiceCallback(selectedItem);
      }
    }
  };

  roller.behaviorZone_ =
      new gtv.jq.KeyBehaviorZone({
        containerSelector: '#' + roller.params_.createParams.containerId,
        keyMapping: keyMapping,
        actions: actions,
        navSelectors: navSelectors,
        selectionClasses: selectionClasses,
        saveRowPosition: true
      });

  roller.params_.createParams.keyController.addBehaviorZone(
    roller.behaviorZone_,
    true,
    roller.params_.createParams.layerNames);
};

/**
 * Scrolls to the row containing the specified item. Calls the row's ScrollRow
 * method to make sure the item is displayed in the row.
 * @param {jQuery.Element} selectedItem The currently selected item.
 * @param {jQuery.Element} newItem Newly selected item to scroll into view).
 * @param {SynchronizedCallback.callback} getFinishedAction Callback generator
 *     that returns a callback to make when movement animations are complete.
 * @private
 */
gtv.jq.RollerControl.prototype.scrollToRow = function(selectedItem,
                                                      newItem,
                                                      getFinishCallback) {
  var roller = this;

  var rows = roller.container_.children('.scroll-row');
  var height = roller.container_.height();
  var containerOffset = roller.container_.offset();

  var row = newItem.parents('.scroll-row');
  var rowControl = row.data('row-control');
  rowControl.scrollRow(newItem, getFinishCallback);

  if (selectedItem) {
    var oldRow = selectedItem.parents('.scroll-row');
    if (row.get(0) == oldRow.get(0)) {
      return;
    }
  }

  var rowHeight = row.height();
  var rowIncrement =
      (height - (rowHeight / 2) - (rowHeight / 4)) / (rows.length);
  var rowTop = (height / 2) - (rowHeight / 2) - (rowHeight / 4);
  var rowOpacity = 1.0;
  var opacityFraction = 2;
  var zIndex = rows.length + 1;
  var zIndexInc = -1;

  for (var i = 0; i < rows.length; i++) {
    var rowOffset = row.offset();

    var newRowTop = rowTop - (rowOffset.top - containerOffset.top);

    row.css('z-index', zIndex);
    row.stop()
      .animate({top: '+=' + newRowTop, opacity: rowOpacity},
               getFinishCallback());

    row = row.next();
    if (row.length == 0) {
      row = rows.first();
    }

    rowTop = rowTop + rowIncrement;
    if (rowTop + rowHeight > height) {
      rowTop = 0;
      opacityFraction = .5;
      zIndexInc *= -1;
    } else {
      rowOpacity /= opacityFraction;
      if (rowOpacity > .5) {
        rowOpacity = .5;
      }
      if (rowOpacity < .05) {
        rowOpacity = .05;
      }

      if (zIndex > rows.length) {
        zIndex = rows.length;
      }
      zIndex += zIndexInc;
    }
  }
};

/**
 * Called by the key controller to find the appropriate item to select when
 * the up arrow is pressed. If at the top row, wraps around to the bottom row.
 * @param {jQuery.Element} selectedItem The currently selected item.
 * @param {jQuery.Element} newSelected The newly selected item.
 * @return {Selection} returns either a status of none if newSelected is valid,
 *     or a status of selected with a selected item if newSelected is empty.
 * @private
 */
gtv.jq.RollerControl.prototype.upArrowAction = function(selectedItem,
                                                        newSelected) {
  var roller = this;

  if (newSelected && newSelected.length > 0) {
    return new gtv.jq.Selection('none');
  }

  var rows = roller.container_.find('.scroll-row');
  var lastRow = rows.last();
  var selectedIndex = lastRow.data('index');
  if (selectedIndex != undefined) {
    newSelected = lastRow.find('.scroll-item').eq(selectedIndex);
  } else {
    newSelected = lastRow.find('.scroll-item').first();
  }

  return new gtv.jq.Selection('selected', newSelected);
};

/**
 * Called by the key controller to find the appropriate item to select when
 * the down arrow is pressed. If at the bottom row, wraps around to the top row.
 * @param {jQuery.Element} selectedItem The currently selected item.
 * @param {jQuery.Element} newSelected The newly selected item.
 * @return {Selection} returns either a status of none if newSelected is valid,
 *     or a status of selected with a selected item if newSelected is empty.
 * @private
 */
gtv.jq.RollerControl.prototype.downArrowAction = function(selectedItem,
                                                          newSelected) {
  var roller = this;

  if (newSelected && newSelected.length > 0) {
    return new gtv.jq.Selection('none');
  }

  var rows = roller.container_.find('.scroll-row');
  var firstRow = rows.first();
  var selectedIndex = firstRow.data('index');
  if (selectedIndex != undefined) {
    newSelected = firstRow.find('.scroll-item').eq(selectedIndex);
  } else {
    newSelected = firstRow.find('.scroll-item').first();
  }

  return new gtv.jq.Selection('selected', newSelected);
};
