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
 * @fileoverview Classes for SlidingControl
 * @author shines@google.com (Steven Hines)
 */

var gtv = gtv || {
  jq : {}
};

/**
 * SlidingControl class. Creates a series of sliding "pages", left-right,
 * that hold thumbnails/content in a rectangular arrangement.
 * @param {CreateParams} createParams Values to create the control with.
 * @constructor
 */
gtv.jq.SlidingControl = function(createParams) {
  this.params_ = createParams;
};

/**
 * Parent element containing the row elements.
 * @type {jQuery.Element}
 * @private
 */
gtv.jq.SlidingControl.prototype.container_ = null;

/**
 * Holds the params the control was created with.
 * @type {ControlParams}
 * @private
 */
gtv.jq.SlidingControl.prototype.params_ = null;

/**
 * The behavior zone that this control inhabits in the key controller.
 * @type {KeyBehaviorZone}
 * @private
 */
gtv.jq.SlidingControl.prototype.behaviorZone_ = null;

/**
 * Removes the control from its container and from the key controller.
 */
gtv.jq.SlidingControl.prototype.deleteControl = function() {
  var slidingControl = this;

  slidingControl.params_.keyController.removeBehaviorZone(
    slidingControl.behaviorZone_);
  slidingControl.container_.remove();
};


/**
 * Creates a new SideNavControl with the specified items and adds it to a
 * container on the page.
 * @param {gtv.jq.ControlParams} controlParams Params for creating the control.
 */
gtv.jq.SlidingControl.prototype.showControl = function(controlParams) {
  var slidingControl = this;

  slidingControl.params_ =
      jQuery.extend(slidingControl.params_, controlParams);

  if (!gtv.jq.CreateParams.validateParams(slidingControl.params_))
    return false;

  var container = $('<div></div>')
    .attr('id', slidingControl.params_.containerId)
    .addClass('sliding-control');

  slidingControl.params_.topParent.append(container);

  slidingControl.container_ = container;

  var windowWidth = container.width();
  var containerOffset = container.offset();
  var parentOffset = controlParams.topParent.position();
  var windowHeight = $(window).height() - containerOffset.top;

  var itemCount = controlParams.items.length;
  var rowCount = 0;
  var itemRow;
  var itemsPerRow = 1;  // start at 1, will be calculated after first item
  var rowsPerPage = 1;  // start at 1, will be calculated after first item

  var firstPage;
  var page;
  var pageCount = 0;

  function addItem(i) {
    if (i % itemsPerRow == 0) {
      if (rowCount % rowsPerPage == 0) {
        page = $('<div></div>').addClass('slider-item-page ' +
                                         slidingControl.params_.styles.page);

        if (!firstPage) {
          firstPage = page;
          page.css('left', '0px');
          page.css('width', $(window).width() + 'px');
        } else {
          page.css('left', $(window).width() + 'px');
          page.css('width', $(window).width() + 'px');
        }

        page.data('page', pageCount);

        container.append(page);
        pageCount++;
      }

      itemRow = $('<div></div>').addClass('slider-item-row ' +
                                          slidingControl.params_.styles.row);
      page.append(itemRow);
      itemRow.data('row', rowCount % rowsPerPage);

      rowCount++;
    }
    var content = controlParams.items[i].content;
    var description = controlParams.items[i].description;
    var navData = controlParams.items[i].data;

    var itemTextHolder = $('<div></div>')
      .addClass('slider-item-text-holder');

    if (description) {
      itemTextHolder.append(description);
    }

    var item = $('<div></div>')
      .addClass('slider-item ' + slidingControl.params_.styles.item)
      .data("index", i % itemsPerRow)
      .append(content);

    if (navData) {
      item.data("nav-data", navData);
    }

    var itemDiv = $('<div></div>')
      .addClass('slider-item-div ' + slidingControl.params_.styles.itemDiv)
      .append(item)
      .append(itemTextHolder);

    itemRow.append(itemDiv);

    return itemRow;
  }

  for (var index = 0; index < itemCount; index++) {
    var newItemRow = addItem(index);

    if (index == 0) {
      var newItemDiv = newItemRow.find('.slider-item-div');
      var newItemDivWidth = newItemDiv.outerWidth();

      var newItemRowHeight = newItemRow.outerHeight();

      itemsPerRow = Math.max(1, Math.floor(windowWidth / newItemDivWidth));
      rowsPerPage = Math.max(1, Math.floor(windowHeight / newItemRowHeight));
    }
  }

  var keyMapping = {
    13: function(selectedItem, newItem) {  // enter
      if (slidingControl.params_.choiceCallback) {
        slidingControl.params_.choiceCallback(selectedItem);
      }
      return { status: 'none' };
    },
    37: function(selectedItem, newItem) {  // left arrow
      return slidingControl.leftArrowAction_(selectedItem, newItem);
    },
    39: function(selectedItem, newItem) {  // right arrow
      return slidingControl.rightArrowAction_(selectedItem, newItem);
    }
  };

  var navSelectors = {
    item: '.slider-item',
    itemParent: '.slider-item-div',
    itemRow: '.slider-item-row',
    itemPage: '.slider-item-page'
  };

  var selectionClasses = {
    basic: slidingControl.params_.styles.selected,
    hasData: 'item-hover-active'
  };

  var lastSelected;
  var actions = {
    scrollIntoView: function(selectedItem, newItem, getFinishCallback) {
      slidingControl.showPage_(selectedItem, newItem, getFinishCallback);
    },
    click: function(selectedItem, newItem) {
      if (slidingControl.params_.choiceCallback) {
        slidingControl.params_.choiceCallback(selectedItem);
      }
    }
  };

  slidingControl.behaviorZone_ =
    new gtv.jq.KeyBehaviorZone('#' + slidingControl.params_.containerId,
                               keyMapping,
                               actions,
                               navSelectors,
                               selectionClasses,
                               'nav-data');

  slidingControl.params_.keyController.addBehaviorZone(
      slidingControl.behaviorZone_,
      true,
      slidingControl.params_.layerNames);

  return true;
};

/**
 * Makes sure that the specified item is display, scrolling pages if necessary.
 * If multiple pages separate the current item and the new item, each page is
 * scrolled in turn for a visual cue. Called from a key controller
 * scrollIntoView callback.
 * @param {jQuery.Element} selectedItem The currently selected item.
 * @param {jQuery.Element} newItem The newly selected item.
 * @param {SynchronizedCallback.acquireCallback} getFinishCallback A callback
 *     that returns a function to call back when an animation has completed.
 * @private
 */
gtv.jq.SlidingControl.prototype.showPage_ = function(selectedItem,
                                                    newItem,
                                                    getFinishCallback) {
  var slidingControl = this;

  if (!newItem) {
    return;
  }

  if (!selectedItem) {
    selectedItem = slidingControl.container_.find('.slider-item').first();
  }

  var selectedPage = selectedItem.parents('.slider-item-page');
  if (selectedPage.length == 0)
    return;

  var newPage = newItem.parents('.slider-item-page');
  if (newPage.length == 0) {
    return;
  }

  if (selectedPage.get(0) == newPage.get(0)) {
    return;
  }

  var selectedPageNum = selectedPage.data('page');
  var newPageNum = newPage.data('page');

  var dir = -1;
  if (newPageNum > selectedPageNum) {
    dir = 1;
  }

  var pages = slidingControl.container_.children('.slider-item-page');
  var windowWidth = $(window).width();
  for (var i = selectedPageNum; i != (newPageNum); i += dir) {
    pages.eq(i).animate({
        left: (-dir * windowWidth) + 'px'
      },
      getFinishCallback());
    pages.eq(i + dir).animate({
        left: '0px'
      },
      getFinishCallback());
  }
};

/**
 * Left arrow callback handler. Called by key controller when left arrow
 * pressed. If newSelected is empty, this method returns the approprate item,
 * if any, on the preceding page.
 * @param {jQuery.Element} selectedItem The currently selected item.
 * @param {jQuery.Element} newSelected The newly selected item.
 * @return {Selection} status: none, or status: selected if an item on the
 *     previous page is selected.
 * @private
 */
gtv.jq.SlidingControl.prototype.leftArrowAction_ = function(selectedItem,
                                                           newSelected) {
  if (newSelected && newSelected.length > 0) {
    return new gtv.jq.Selection('none');
  }

  return new gtv.jq.Selection('selected', this.nextItem_(selectedItem, -1));
};

/**
 * Right arrow callback handler. Called by key controller when right arrow
 * pressed. If newSelected is empty, this method returns the approprate item,
 * if any, on the following page.
 * @param {jQuery.Element} selectedItem The currently selected item.
 * @param {jQuery.Element} newSelected The newly selected item.
 * @return {Selection} status: none, or status: selected if an item on the
 *     next page is selected.
 * @private
 */
gtv.jq.SlidingControl.prototype.rightArrowAction_ = function(selectedItem,
                                                            newSelected) {
  if (newSelected && newSelected.length > 0) {
    return new gtv.jq.Selection('none');
  }

  return new gtv.jq.Selection('selected', this.nextItem_(selectedItem, 1));
};

/**
 * Determines the correct item either the next or previous page to select
 * given a supplied item. This method will choose, horizonally, the item
 * directly on the other side of the 'fold' (e.g., the rightmost item
 * if moving to a previous page), and vertically on the same row as the
 * item if possible.
 * @param {jQuery.Element} item The item moving from, for positional reference
 * @param {number} dir Positive if moving to the next page, negative for
 *     previous page
 * @return {?jQuery.Element} The item to be selected, or null if no selection
 *     is possible in the requested direction.
 * @private
 */
gtv.jq.SlidingControl.prototype.nextItem_ = function(item, dir) {
  var parentPage = item.parents('.slider-item-page');
  var rowIndex = item.parents('.slider-item-row').data('row');

  var newPage;
  if (dir == 1) {
    newPage = parentPage.next();
  } else {
    newPage = parentPage.prev();
  }

  if (newPage.length) {
    var selectedItem;
    if (dir == 1) {
      var row = newPage.find('.slider-item-row').eq(rowIndex);
      while (row.length == 0 && rowIndex > 0) {
        rowIndex--;
        row = newPage.find('.slider-item-row').eq(rowIndex);
      }
      selectedItem = row.find('.slider-item').first();
    } else {
      var row = newPage.find('.slider-item-row').eq(rowIndex);
      selectedItem = row.find('.slider-item').last();
    }
    return selectedItem;
  }

  return null;
};
