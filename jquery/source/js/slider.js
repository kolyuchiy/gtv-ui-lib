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
 * 
 */

var gtv = gtv || {
  jq: {}
};

/**
 * SlidingControl class. Creates a series of sliding "pages", left-right,
 * that hold thumbnails/content in a rectangular arrangement.
 * @param {gtv.jq.CreationParams} createParams Initial values for creation of
 *     the control.
 * @constructor
 */
gtv.jq.SlidingControl = function(createParams) {
  this.params_ = new gtv.jq.CreationParams(createParams);
};

/**
 * Parent element containing the row elements.
 * @type {jQuery.Element}
 * @private
 */
gtv.jq.SlidingControl.prototype.container_ = null;

/**
 * Holds the params the control was created with.
 * @type {gtv.jq.CreationParams}
 * @private
 */
gtv.jq.SlidingControl.prototype.params_ = null;

/**
 * Holds the params for showing the control.
 * @type {gtv.jq.ShowParams}
 * @private
 */
gtv.jq.SlidingControl.prototype.showParams_ = null;

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
 * @param {gtv.jq.ShowParams} controlParams Params for creating the control.
 *     ControlContents.captionItems must be passed to this control.
 */
gtv.jq.SlidingControl.prototype.showControl = function(showParams) {
  var slidingControl = this;

  slidingControl.showParams_ = new gtv.jq.ShowParams(showParams);
  if (!slidingControl.showParams_.contents.captionItems) {
    throw new Error('SlidingControl requires captionItems');
  }

  var container = $('<div></div>')
    .attr('id', slidingControl.params_.containerId)
    .addClass('sliding-control');

  slidingControl.showParams_.topParent.append(container);

  slidingControl.container_ = container;

  var windowWidth = container.width();
  var containerOffset = container.offset();
  var parentOffset = slidingControl.showParams_.topParent.position();
  var windowHeight = $(window).height() - containerOffset.top;

  var itemCount = slidingControl.showParams_.contents.captionItems.length;
  var rowCount = 0;
  var itemRow;
  var itemsPerRow = 1;  // start at 1, will be calculated after first item
  var rowsPerPage = 1;  // start at 1, will be calculated after first item

  var firstPage;
  var page;
  var pageCount = 0;

  /**
   * This function adds a new CaptionItem to a page. This control adds each
   * caption item to a row until the row is full, then to a new rows until
   * the page is full. The first item sets the size for the rest of the items
   * in the control (i.e., they are assumed to be of somewhat uniform size)
   * Each item in the row is a compound set of elements that allow the item
   * to have its selection highlight be visually separate from the caption
   * displayed below it. The caption container is styled so that it will be
   * clipped to the horizontal size of the item.
   * @param {number} i The ordinal number of the CaptionItem to add.
   * @return The row to which the item was added.
   */
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
    var item = slidingControl.showParams_.contents.captionItems[i].item;
    var caption = slidingControl.showParams_.contents.captionItems[i].caption;
    var navData = slidingControl.showParams_.contents.captionItems[i].data;

    var itemTextHolder = $('<div></div>')
      .addClass('slider-item-text-holder');

    if (caption) {
      itemTextHolder.append(caption);
    }

    var itemHolder = $('<div></div>')
      .addClass('slider-item ' + slidingControl.params_.styles.item)
      .data("index", i % itemsPerRow)
      .append(item);

    if (navData) {
      itemHolder.data("nav-data", navData);
    }

    var itemDiv = $('<div></div>')
      .addClass('slider-item-div ' + slidingControl.params_.styles.itemDiv)
      .append(itemHolder)
      .append(itemTextHolder);

    itemRow.append(itemDiv);

    return itemRow;
  }

  // This loops through each item to be added to the slider and calls the
  // addItem() function above. The size of the first item added on the page
  // is used to compute the number of items and rows that can fit on a page,
  // and thus also the number of pages.
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
    // ENTER key. Call the choiceCallback if supplied.
    13: function(selectedItem, newItem) {
      if (slidingControl.params_.choiceCallback) {
        slidingControl.params_.choiceCallback(selectedItem);
      }
      return { status: 'none' };
    },
    // Left arrow. Check to see if we are at the left edge of a page and
    // if so, check to see if there is a page to the left, and if so, set the
    // selected item to an item on it.
    37: function(selectedItem, newItem) {  // left arrow
      return slidingControl.leftArrowAction_(selectedItem, newItem);
    },
    // Right arrow. Check to see if we are at the right edge of a page and
    // if so, check to see if there is a page to the right, and if so, set
    // the selected item to an item on it.
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
    hasData: slidingControl.params_.styles.hasData
  };

  var lastSelected;
  // Configure gtv.jq.KeyActions object.
  var actions = {
    // Callback from KeyController. Move the selectedItem into view.
    scrollIntoView: function(selectedItem, newItem, getFinishCallback) {
      slidingControl.showPage_(selectedItem, newItem, getFinishCallback);
    },
    // Call the choiceCallback, if supplied, when the item receives a
    // mouse click.
    click: function(selectedItem, newItem) {
      if (slidingControl.params_.choiceCallback) {
        slidingControl.params_.choiceCallback(selectedItem);
      }
    }
  };

  slidingControl.behaviorZone_ =
    new gtv.jq.KeyBehaviorZone({
      containerSelector: '#' + slidingControl.params_.containerId,
      keyMapping: keyMapping,
      actions: actions,
      navSelectors: navSelectors,
      selectionClasses: selectionClasses,
      navigableData: 'nav-data'
    });

  slidingControl.params_.keyController.addBehaviorZone(
      slidingControl.behaviorZone_,
      true,
      slidingControl.params_.layerNames);
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
  if (selectedPage.length == 0) {
    return;
  }

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
