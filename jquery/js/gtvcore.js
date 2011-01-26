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
 * @fileoverview Common classes used throughout the library. GtvCore contains
 *     public static methods for processing feeds. SynchronizedCallback
 *     can be used to aggregate multiple asynch callback events into a single
 *     call.
 * @author shines@google.com (Steven Hines)
 */

var gtv = gtv || {
  jq : {}
};


/**
 * Static class for utilities used by controls
 * @constructor
 */
gtv.jq.GtvCore = function() {
};

/**
 * Triggers a 'load' event on a container when images have finished loading
 * @param {jQuery.Element} container Container to trigger after images load.
 *     If images not supplied, the container will be triggered when images
 *     in it have finished loading.
 * @param {?Array.<jQuery.Element>} images Optional image elements.
 *     Supply this if container is to be triggered on images that aren't
 *     descendants of it.
 */
gtv.jq.GtvCore.triggerOnLoad = function(container, images) {
  images = images || container.find('img');
  var imgCount = images.length;

  if (imgCount == 0) {
    container.trigger('load');
    return;
  }

  images.each(function(index) {
    if ($(this).complete) {
      imgCount--;
      if (imgCount == 0) {
        container.trigger('load');
      }
    } else {
      images.load(function() {
        imgCount--;
        if (imgCount == 0) {
          container.trigger('load');
        }
      });
    }
  });
};

/**
 * Creates a function to retrieve the next item from an item parameter,
 * which may be a generator function or an array.
 * @param {Array.<jQuery.Element>|function(jQuery.Element} items Either an
 *     array of elements or a function that creates a new element and adds
 *     it to the passed-in container.
 * @return {function(jQuery.Element)} A function adds the next item in a
 *     collection to the supplied container.
 */
gtv.jq.GtvCore.makeAddNextItem = function(items) {
  var addNextItem;
  if (items instanceof Function) {
    addNextItem = function(parent) {
      return items(parent);
    };
  } else if (items instanceof Array) {
    var index = 0;
    addNextItem = function(parent) {
      if (index >= items.length) {
        return false;
      }

      var item = items[index];
      if (!item) {
        return false;
      }

      index++;
      parent.append(item);
      return true;
    };
  }
  return addNextItem;
};

/**
 * Creates a function to retrieve the next item from an item parameter,
 * which may be a generator function or an array.
 * @param {Array.<jQuery.Element>|function(jQuery.Element} items Either an
 *     array of elements or a function that creates a new element and adds
 *     it to the passed-in container.
 * @return {function(jQuery.Element)} A function adds the next item in a
 *     collection to the supplied container.
 */
gtv.jq.GtvCore.makeAddNextItemParams = function(controlParams) {
  var addNextItem;
  if (controlParams.itemsGenerator) {
    addNextItem = function(parent) {
      return controlParams.itemsGenerator(parent);
    };
  } else if (controlParams.items) {
    var index = 0;
    addNextItem = function(parent) {
      if (index >= controlParams.items.length) {
        return false;
      }

      var item = controlParams.items[index];
      if (!item) {
        return false;
      }

      index++;
      parent.append(item);
      return true;
    };
  }
  return addNextItem;
};

/**
 * Reads a feed in ATOM format and makes callbacks to build an array of
 * items from the feed.
 * @param {string} feed URL to the feed to read.
 * @param {function(Object)} makeItem A callback function that, when passed
 *     an entry from the feed returns a constructed item from it.
 * @param {function(Array.<Object>)} doneCallback A callback that will be passed
 *     the array of all constructed items.
 */
gtv.jq.GtvCore.processAtomFeed = function(feed, makeItem, doneCallback) {
  $.ajax({
    url: feed,
    success: function(data) {
      var itemsArray = [];

      var entries = $(data).find('entry');
      for (var i = 0; i < entries.length; i++) {
        var item = makeItem(entries[i]);
        if (item) {
          itemsArray.push(item);
        }
      }
      doneCallback(itemsArray);
    }
  });
};

/**
 * Reads a feed in JSONP format and makes callbacks to build an array of
 * items from the feed.
 * @param {string} feed URL to the feed to read.
 * @param {function(Object)} makeItem A callback function that, when passed
 *     an entry from the feed returns a constructed item from it.
 * @param {function(Array.<Object>)} doneCallback A callback that will be passed
 *     the array of all constructed items.
 * @param {Array.<string>)} entryKey An array of strings that represent, in
 *     hierarchical order the path to the array of entries in the returned feed.
 */
gtv.jq.GtvCore.processJsonpFeed = function(feed,
                                           makeItem,
                                           doneCallback,
                                           entryKey) {
  entryKey = entryKey || ['feed', 'entry'];

  $.ajax({
    url: feed,
    dataType: 'jsonp',
    success: function(data) {
      var itemsArray = [];

      var entries = data;
      for (var j = 0; j < entryKey.length; j++)
        entries = entries[entryKey[j]];

      for (var i = 0; i < entries.length; i++) {
        var item = makeItem(entries[i]);
        if (item) {
          itemsArray.push(item);
        }
      }

      doneCallback(itemsArray);
    }
  });
};


/**
 * A class that tracks by reference count a number of requests for a single
 * callback and makes sure that it is called once when all requests are
 * completed. The constructor starts the count at 1 and expects this to be
 * cleared by the creator calling done().
 * @constructor
 * @param {function} callback The callback to make when all dependent requests
 *     are completed.
 */
gtv.jq.SynchronizedCallback = function(callback) {
  this.expectedCallbacks = 1;
  this.callback = callback;
};

/**
 * Called to acquire a reference to the callback.
 * @return {function} The callback function to make when a depedent request is
 *     completed.
 */
gtv.jq.SynchronizedCallback.prototype.acquireCallback = function() {
  var synchronizedCallback = this;

  synchronizedCallback.expectedCallbacks++;
  return function() {
    synchronizedCallback.callbackFinished();
  };
};

/**
 * Creates a wrapper callback for acquiring a callback
 * @return {function} A function that can be called to acquire the callback
 *     without access to the object instance.
 */
gtv.jq.SynchronizedCallback.prototype.getCallback = function() {
  var synchronizedCallback = this;

  return function() {
    return synchronizedCallback.acquireCallback();
  };
};

/**
 * Decrements the callback reference count and calls the primary callback
 * if all dependent callbacks are completed.
 * @private
 */
gtv.jq.SynchronizedCallback.prototype.callbackFinished = function() {
  this.expectedCallbacks--;
  if (this.expectedCallbacks == 0 && this.callback)
    this.callback();
};

/**
 * Called by the code that originally constructed the object instance to
 * represent that it is finished initiating tasks with dependent callbacks.
 */
gtv.jq.SynchronizedCallback.prototype.done = function() {
  this.callbackFinished();
};


/**
 * Holds parameters used to create the library controls.
 * @constructor
 */
gtv.jq.CreateParams = function() {
};

/**
 * Instance of the key controller this control is using.
 * @type {KeyController}
 */
gtv.jq.CreateParams.prototype.keyController = null;

/**
 * CSS classes used to style the row.
 *     page {string} CSS class to style the container for each page of rows.
 *     row {string} CSS class to style the row.
 *     itemsDiv {string} CSS class to style the DIV holding the items.
 *     itemDiv {string} CSS class to style the DIV holding a single item.
 *     item {string} CSS class to style the individual item.
 *     selected {string} CSS class to style the item that has the selection.
 * @type {Object}
 */
gtv.jq.CreateParams.prototype.styles = null;

/**
 * The ID of the control container (an element will be created with this ID).
 * @type {string}
 */
gtv.jq.CreateParams.prototype.containerId = null;

/**
 * Callback to make when the user chooses an item (if applicable to the control)
 * @type {Function(selectedItem)}
 */
gtv.jq.CreateParams.prototype.choiceCallback = null;

/**
 * Array of Layer name to add the control to, or 'default' if not supplied.
 * @type {string}
 */
gtv.jq.CreateParams.prototype.layerNames = null;

/**
 * Validates the params and sets intelligent defaults if possible.
 * @return {boolean} True if params validate, false otherwise.
 */
gtv.jq.CreateParams.validateParams = function(params) {
  if (!params.containerId ||
      !params.topParent)
    return false;

  params.styles = params.styles || {};
  params.styles.page = params.styles.page || '';
  params.styles.row = params.styles.row || '';
  params.styles.itemDiv = params.styles.itemDiv || '';
  params.styles.item = params.styles.item || '';
  params.styles.selected = params.styles.selected || 'item-hover';
  params.styles.normal = params.styles.normal || '';
  params.styles.chosen = params.styles.chosen || '';

  return true;
};


/**
 * Holds parameters used to show the library controls.
 * @constructor
 */
gtv.jq.ShowParams = function() {
};

/**
 * Parent element on the page that holds the control.
 * @type {jQuery.Element}
 */
gtv.jq.ShowParams.prototype.topParent = null;

/**
 * Array of items to add to the control
 * @type {Array.<jQuery.Element>}
 */
gtv.jq.ShowParams.prototype.items = null;

/**
 * Array of arrays of items to add to the control
 * @type {Array.<Array.<jQuery.Element>>}
 */
gtv.jq.ShowParams.prototype.itemsArray = null;

/**
 * Generator function to create items and add them to the control.
 * @type {Function(<jQuery.Element>}
 */
gtv.jq.ShowParams.prototype.itemsGenerator = null;
