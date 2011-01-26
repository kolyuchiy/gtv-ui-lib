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
 * @fileoverview Classes for KeyBehaviorZone, KeyZoneLayer, KeyController.
 *    A page uses a KeyController to manage the selection of elements and make
 *    sure that only one element is selected at a time. The controller can
 *    manage selection between multiple logical areas of the page, or "zones".
 *
 *    Each KeyBehaviorZone can have its own distinct behaviors for keys
 *    (including arrow keys), track entry/exit, make sure that the selected item
 *    is visible. The controller does this for the control so it does not have
 *    to listen for keyDown events, etc, on its on.
 *
 *    Multiple layers can be defined in the controller representing a logical
 *    z-axis separation of elements. All controls in a layer are managed
 *    independently, but only one layer can be active at a time and have a
 *    selected item.
 *
 *    In general, compound controls define a zone by their bounds, define any
 *    keys to override or selection behaviors (e.g., handling wrap-around by
 *    by overriding the left/right or up/down keys, and returning the left item
 *    when there is no item to select when the right arrow key is pressed.)
 *
 *    The KeyController handles most behaviors automatically, including arrow
 *    keys, mouseenter, etc.
 *
 * @author shines@google.com (Steven Hines)
 */

var gtv = gtv || {
  jq : {}
};

/**
 * KeyBehaviorZone class. Defines a zone of key navigation rules.
 * @param {string} containerSelector jQuery selector that uniquely identifies
 *     the containing zone on the page.
 * @param {KeyMap} keyMapping Mapping of key code numbers to callback methods.
 * @param {Actions} actions Callbacks for supported Key Controller actions:
 *     enterZone: Called when the zone is entered.
 *     leaveZone: Called before the zone is exited.
 *     scrollIntoView: Called during selection movement, this method ensures
 *         that the selected item is moved into view.
 *     moveSelected: Called just before the selection is moved.
 *     click: Called when an item is clicked on with the mouse.
 * @param {Object} navSelectors A collection of jQuery selectors for
 *     non-geometry key navigation: item, itemParent, itemRow, itemPage.
 * @param {Object} selectionClasses: A collection of classes for highlighting
 *     selected items of various states: hasData, basic.
 * @param {?string} navigableData Optional string defining what data (reached
 *     using jQuery.data()) should distinguish an item highlighted with
 *     selectionClasses.hasData.
 * @param {?boolean} saveRowPosition If true, a multi-row zone will save the
 *     selected item for each row, and return selection to that item when
 *     selection returns to that row.
 * @param {?boolean} useGeometry If true, the key controller determines the next
 *     selected item by examining the page and finding the closest item in the
 *     direction the user has navigated.
 * @param {?boolean} selectHidden If true, the key controller will move the
 *     selection to a non-visible element on the page. (The zone would likely
 *     supply a scrollIntoView callback that made the item visible when
 *     selected.)
 * @constructor
 */
gtv.jq.KeyBehaviorZone = function(containerSelector,
                                  keyMapping,
                                  actions,
                                  navSelectors,
                                  selectionClasses,
                                  navigableData,
                                  saveRowPosition,
                                  useGeometry,
                                  selectHidden) {
  this.containerSelector = containerSelector;
  this.container = $(containerSelector);

  this.keyMapping = keyMapping || {};
  this.actions = actions || {};
  this.saveRowPosition = saveRowPosition;
  this.navSelectors = navSelectors || {};
  this.selectionClasses = selectionClasses || {};
  this.navigableData = navigableData;
  this.useGeometry = useGeometry;
  this.selectHidden = selectHidden;
};


/**
 * Representation of the return code from key nav callback functions.
 * @param {string} status One of:
 *     none Continue to process the event.
 *     skip Stop processing the event.
 *     selected Replace the selected item with the one returned.
 * @param {jQuery.Element} selected The item to use as the newly selected item.
 */
gtv.jq.Selection = function(status, selected) {
  this.status = status;
  this.selected = selected;
}


/**
 * KeyController class. Manages navigation for a page.
 * @constructor
 */
gtv.jq.KeyController = function() {
  this.selectedItem_ = null;
  this.zoneLayers_ = [];
  this.currentZone_ = null;
  this.globalKeyMapping_ = {};
  this.moving_ = false;
  this.started_ = false;
  this.activeLayer_ = null;

  this.zoneLayers_['default'] = new gtv.jq.KeyZoneLayer_(0);
};

/**
 * Creates a layer of the specified name and priority. If priority isn't needed,
 * callers can instead rely on the implicit layer creation when adding a zone.
 * @param {string} layerName The name of the layer.
 * @param {?number} priority Priority of the layer (presently unused).
 * @return {KeyZoneLayer_} The newly created layer.
 */
gtv.jq.KeyController.prototype.createLayer = function(layerName, priority) {
  var keyController = this;

  if (keyController.zoneLayers_[layerName]) {
    return keyController.zoneLayers_[layerName];
  }

  var zoneLayer = new gtv.jq.KeyZoneLayer_(priority);
  keyController.zoneLayers_[layerName] = zoneLayer;

  return zoneLayer;
};

/**
 * Deletes the named layer. If the layer is the currently active one, the
 * default layer is selected as a replacement and selection is mvoed to the
 * first zone.
 * @param {string} layerName The name of the layer to delete.
 * @return {boolean} False if the layer doesn't exist or the caller is trying to
 *     delete the default layer. True otherwise.
 */
gtv.jq.KeyController.prototype.deleteLayer = function(layerName) {
  var keyController = this;

  if (!layerName || layerName == 'default') {
    return false;
  }

  var zoneLayer = keyController.zoneLayers_[layerName];
  if (!zoneLayer) {
    return false;
  }

  if (keyController.activeLayer_ == layerName) {
    keyController.moveSelected_();

    keyController.activeLayer_ = 'default';
    keyController.setZone(
        keyController.zoneLayers_['default'].behaviorZones[0]);
  }

  keyController.zoneLayers_[layerName] = null;

  return true;
};

/**
 * Removes all layers from the Key Controller.
 */
gtv.jq.KeyController.prototype.removeAllLayers = function() {
  var keyController = this;

  for (var layer in keyController.zoneLayers_) {
    keyController.deleteLayer(layer);
  }
};

/**
 * Sets the specified item as the selected item. The item can be in any zone.
 * @param {jQuery.Element} newSelected The item to move selection to.
 * @param {Function} finishedCallback The function to call when any movement
 *     animations have completed.
 */
gtv.jq.KeyController.prototype.setSelected = function(newSelected,
                                                      finishedCallback) {
  var keyController = this;

  var syncCallback = new gtv.jq.SynchronizedCallback(finishedCallback);

  var getCallback = syncCallback.getCallback();
  var animFinishedAction = getCallback();
  keyController.moveSelected_(null, newSelected, animFinishedAction);

  syncCallback.done();
};

/**
 * Makes the specified layer the active one, and moves selection to the first
 * zone in that layer.
 * @param {?string} layerName The name of the layer to active. If not supplied,
 *     activates the default layer.
 */
gtv.jq.KeyController.prototype.setLayer = function(layerName) {
  var keyController = this;
  layerName = layerName || 'default';
  var zoneLayer = keyController.zoneLayers_[layerName];

  if (keyController.activeLayer_ != layerName) {
    keyController.setZone(zoneLayer.behaviorZones[0]);
  }
  // keyController.activeLayer_ = .layer;
};

/**
 * Sets a key mapping for the global key controller.
 * @param {KeyMap} keyMapping The key mapping to install.
 */
gtv.jq.KeyController.prototype.setGlobalKeyMapping = function(keyMapping) {
  this.globalKeyMapping_ = {};
  this.globalKeyMapping_ = keyMapping || {};
};

/**
 * Sets a key mapping for specified layer.
 * @param {KeyMap} keyMapping The key mapping to install in the layer.
 * @param {?string} layerName The name of the layer to install the mapping into.
 *     If not supplied, the default layer is used.
 */
gtv.jq.KeyController.prototype.setLayerKeyMapping = function(keyMapping,
                                                             layerName) {
  var keyController = this;
  layerName = layerName || 'default';
  var zoneLayer = keyController.zoneLayers_[layerName];

  zoneLayer.setKeyMapping_(keyMapping);
};

/**
 * Adds a new zone to a layer in the key controller.
 * @param {KeyBehaviorZone} zone The zone to add.
 * @param {?boolean} selectOnInit If true, the zone will receive the selection
 *     if no other zone in the controller has the selection.
 * @param {?Array.<string>} layerNames The names of the layers to add the zone
 *     to. If not supplied, the default layer is used.
 */
gtv.jq.KeyController.prototype.addBehaviorZone = function(zone,
                                                          selectOnInit,
                                                          layerNames) {
  var keyController = this;
  layerNames = layerNames || ['default'];

  for (var layer = 0; layer < layerNames.length; layer++) {
    var zoneLayer = keyController.zoneLayers_[layerNames[layer]];
    if (!zoneLayer) {
      zoneLayer = keyController.createLayer(layerNames[layer]);
    }
  }

  zone.layers = layerNames;
  zoneLayer.behaviorZones.push(zone);
  keyController.attachZone_(zone, false);

  if (keyController.started_ && selectOnInit) {
    keyController.setZoneIfNone(zone);
  }
};

/**
 * Removes a zone from the key controller. If the active zone is removed,
 * selection is moved to the next zone.
 * @param {KeyBehaviorZone} zone The zone to remove.
 */
gtv.jq.KeyController.prototype.removeBehaviorZone = function(zone) {
  var keyController = this;

  for (var layer = 0; layer < zone.layers.length; layer++) {
    var zoneLayer = keyController.zoneLayers_[zone.layers[layer]];
    for (var i = 0; i < zoneLayer.behaviorZones.length; i++) {
      if (zoneLayer.behaviorZones[i] == zone) {
        zoneLayer.behaviorZones.splice(i, 1);
      }
    }
  }
  if (zone == keyController.currentZone_) {
    keyController.moveSelected_();
  }

  keyController.detachZone_(zone);
};

/**
 * Installs an array of zones into a layer. Replaces any existing zones.
 * @param {Array.<KeyBehaviorZone>} zones Array of zones to add.
 * @param {?boolean} selectOnInit If true, selects the first zone.
 * @param {?Array.<string>} layerNames The layer to install the zones into.
 *     If not supplied, uses the default layer.
 */
gtv.jq.KeyController.prototype.setZones = function(zones,
                                                   selectOnInit,
                                                   layerNames) {
  var keyController = this;
  layerNames = layerNames || ['default'];
  var zoneLayer = keyController.zoneLayers_[layerName];

  zoneLayer.behaviorZones = zones;
  for (var i = 0; i < zones.length; i++) {
    zones[i].layers = layerNames;
    keyController.attachZone_(zones[i], false);
  }

  if (selectOnInit && zones.length > 0) {
    keyController.setZoneIfNone(zoneLayer.behaviorZones[0]);
  }
};

/**
 * Removes all zones from a layer and returns the zones. Selection is moved to
 * the next zone (thus activating a new layer), if available.
 * @param {?string} layerName The layer to remove the zones from. If not
 * supplied, uses the default layer.
 * @return {Array.<KeyBehaviorZone>} Array of zones removed.
 */
gtv.jq.KeyController.prototype.removeAllZones = function(layerName) {
  var keyController = this;
  var zoneLayer = keyController.zoneLayers_[layerName || 'default'];

  for (var i = 0; i < zoneLayer.behaviorZones.length; i++) {
    keyController.detachZone_(zoneLayer.behaviorZones[i]);
    if (zoneLayer.behaviorZones[i] == keyController.currentZone_) {
      keyController.leaveZoneHeirarchy_(keyController.selectedItem_);
    }
  }

  var zones = zoneLayer.behaviorZones;
  zoneLayer.behaviorZones = [];

  keyController.moveSelected_();
  return zones;
};

/**
 * Starts the Key Controller. Zones can be added to the controller both before
 * and after it is started.
 * @param {?KeyBehaviorZone} initialZone Optional initial zone to select. If not
 *     supplied, the first zone is selected.
 * @param {?boolean} selectOnInit If supplied, initialZone will be selected.
 * @param {?string} layerName If supplied, the specified layer will be the
 *     active layer. If both an initialZone and layerName are supplied, the
 *     layer of initialZone will be active layer, and this value will be
 *     ignored.
 * @return {boolean} True if the controller starts successfully.
 */
gtv.jq.KeyController.prototype.start = function(initialZone,
                                                selectOnInit,
                                                layerName) {
  var keyController = this;

  if (keyController.started_)
    return true;

  if (!initialZone) {
    keyController.activeLayer_ = layerName || 'default';

    initialZone =
        keyController.zoneLayers_[keyController.activeLayer_].behaviorZones[0];
  } else {
    keyController.currentZone_ = initialZone;
    keyController.activeLayer_ = initialZone.layers[0];
  }

  $(document).bind('keydown.keycontroller',
      function(e) {
        keyController.keyDown_(e);
      });

  if (selectOnInit) {
    var items = initialZone.container.find(initialZone.navSelectors.item);
    items.first().mouseenter();
  }

  keyController.started_ = true;

  return true;
};

/**
 * Stops all key controller activity. Unbinds event handlers and removes all
 * layers.
 */
gtv.jq.KeyController.prototype.stop = function() {
  var keyController = this;

  keyController.removeAllLayers();
  $(document).unbind('.keycontroller');

  keyController.started_ = false;
};

/**
 * Moves the selection to the specified zone only if there is not already a
 * zone with selection.
 * @param {KeyBehaviorZone} newZone The zone to move selection to.
 * @return {boolean} True if selection moved, false otherwise.
 */
gtv.jq.KeyController.prototype.setZoneIfNone = function(newZone) {
  var keyController = this;

  if (keyController.currentZone_) {
    for (var layer = 0; layer < newZone.layers.length; layer++) {
      if (keyController.activeLayer_ == newZone.layers[layer]) {
        return false;
      }
    }
  }

  var newSelected = keyController.shiftZone_(newZone);
  if (newSelected && newSelected.length > 0) {
    keyController.moveSelected_(newZone, newSelected);
  }

  return true;
};

/**
 * Moves the selection to the specified zone.
 * @param {KeyBehaviorZone} newZone The zone to move selection to.
 * @return {boolean} True since selection always moves.
 */
gtv.jq.KeyController.prototype.setZone = function(newZone) {
  var keyController = this;

  var newSelected = keyController.shiftZone_(newZone);
  if (newSelected && newSelected.length > 0) {
    keyController.moveSelected_(newZone, newSelected);
  }

  return true;
};

/***************************************************************************/
/*Private Properties and Methods********************************************/

/**
 * Unique selector for the zone's container.
 * @type {string}
 * @protected
 */
gtv.jq.KeyBehaviorZone.prototype.containerSelector = null;

/**
 * Key mapping for the zone.
 * @type {KeyMap}
 * @protected
 */
gtv.jq.KeyBehaviorZone.prototype.keyMapping = {};

/**
 * Actions for the zone.
 * @type {Actions}
 * @protected
 */
gtv.jq.KeyBehaviorZone.prototype.actions =  {};

/**
 * Specifies if the row position should be saved.
 * @type {boolean}
 * @protected
 */
gtv.jq.KeyBehaviorZone.prototype.saveRowPosition = false;

/**
 * Selectors used by controller to comprehend page layout.
 * @type {Object}
 * @protected
 */
gtv.jq.KeyBehaviorZone.prototype.navSelectors = {};

/**
 * CSS classes used to style selected items.
 * @type {Object}
 * @protected
 */
gtv.jq.KeyBehaviorZone.prototype.selectionClasses = {};

/**
 * String identifying data item, if any, that indicates an item has
 * navigable data.
 * @type {string}
 * @protected
 */
gtv.jq.KeyBehaviorZone.prototype.navigableData = null;

/**
 * If true, indicates that they key controller should page geometry
 * instead of static layout to determine next item to navigate to.
 * @type {boolean}
 * @protected
 */
gtv.jq.KeyBehaviorZone.prototype.useGeometry = false;

/**
 * If true, indicates that the key controller will allow hidden items to
 * become the selected item.
 * @type {string}
 * @protected
 */
gtv.jq.KeyBehaviorZone.prototype.selectHidden = false;


/**
 * KeyZoneLayer_ class defines a distinct layer of zones in the key controller.
 * @param {?number} priority The priority of the zone. Presently unused.
 * @private
 * @constructor
 */
gtv.jq.KeyZoneLayer_ = function(priority) {
  this.priority = priority || 0;
  this.behaviorZones = new Array();
  this.globalKeyMapping = {};
};

/**
 * Priority of the zone, currently unused.
 * @type {number}
 * @protected
 */
gtv.jq.KeyZoneLayer_.prototype.priority = null;

/**
 * Behavior zones that are members of this layer.
 * @type {number}
 * @protected
 */
gtv.jq.KeyZoneLayer_.prototype.behaviorZones = null;

/**
 * Key mapping to use for all input in this layer.
 * @type {Object}
 * @protected
 */
gtv.jq.KeyZoneLayer_.prototype.globalKeyMapping = null;


/**
 * Sets the key mapping for a layer. Outside callers should use the Key
 * Controller's setLayerKeyMapping()
 * @param {KeyMap} keyMapping The key mapping to install in the layer.
 * @private
 */
gtv.jq.KeyZoneLayer_.prototype.setKeyMapping_ = function(keyMapping) {
  this.globalKeyMapping = {};
  this.globalKeyMapping = keyMapping || {};
};


/**
 * The item on the page that is currently selected, if any.
 * @type {jQuery.Element}
 * @private
 */
gtv.jq.KeyController.prototype.selectedItem_ = null;

/**
 * The currently active zone. The selectedItem, if set, is always in this zone.
 * @type {gtv.jq.KeyBehaviorZone}
 * @private
 */
gtv.jq.KeyController.prototype.currentZone_ = null;

/**
 * The current key mapping set for the global page.
 * @type {Object}
 * @private
 */
gtv.jq.KeyController.prototype.globalKeyMapping_ = {};

/**
 * Tracks animation in progress. While true, animations to scroll into view
 * are active, and input events are ignored.
 * @type {boolean}
 * @private
 */
gtv.jq.KeyController.prototype.moving_ = null;

/**
 * The current state of the KeyController. True if is started and listening
 * for events.
 * @type {boolean}
 * @private
 */
gtv.jq.KeyController.prototype.started_ = null;

/**
 * The currently active layer. Defaults to 'default'. Only this layer will
 * process input events, get the selection, etc.
 * @type {gtv.jq.KeyZoneLayer_}
 * @private
 */
gtv.jq.KeyController.prototype.activeLayer_ = null;

/**
 * The available layers in the controller. There is always the 'default' layer.
 * @type {Array.<gtv.jq.KeyZoneLayer_>}
 * @private
 */
gtv.jq.KeyController.prototype.zoneLayers_ = null;


/**
 * Attaches a zone to the Key Controller, connecting events to the items in the
 * container and numbering the items, rows and pages if necessary.
 * @param {KeyBehaviorZone} zone The zone to attach
 * @private
 */
gtv.jq.KeyController.prototype.attachZone_ = function(zone) {
  var keyController = this;

  var items = zone.container.find(zone.navSelectors.item);
  items.bind('mouseenter.keycontroller',
             function(e) {
               if (!keyController.moving_) {
                 for (var layer = 0; layer < zone.layers.length; layer++) {
                   if (zone.layers[layer] == keyController.activeLayer_) {
                     keyController.moveSelected_(null, $(this));
                   }
                 }
               }
               e.stopPropagation();
             });

  items.bind('click.keycontroller',
             function(e) {
               if (!keyController.moving_) {
                 for (var layer = 0; layer < zone.layers.length; layer++) {
                   if (zone.layers[layer] == keyController.activeLayer_) {
                     keyController.click_($(this));
                   }
                 }
               }
               e.stopPropagation();
             });

  var pages = zone.container;
  if (zone.navSelectors.itemPage) {
    if (!zone.container.is(zone.navSelectors.itemPage)) {
      pages = zone.container.find(zone.navSelectors.itemPage);
    }
  }
  for (var i = 0; i < pages.length; i++) {
    var pageRows = zone.container;
    if (zone.navSelectors.itemRow) {
      if (pages.eq(i).is(zone.navSelectors.itemRow)) {
        pageRows = pages.eq(i);
      } else {
        pageRows = pages.eq(i).find(zone.navSelectors.itemRow);
      }
    }

    for (var j = 0; j < pageRows.length; j++) {
      var pageRowItems = pageRows.eq(j).find(zone.navSelectors.item);

      for (var k = 0; k < pageRowItems.length; k++) {
        if (pageRowItems.eq(k).data('index') == undefined) {
          pageRowItems.eq(k).data('index', k);
        }
      }
    }
  }
};

/**
 * Detaches a zone from the controller, unbinding event handlers from items.
 * @param {KeyBehaviorZone} zone The zone to detach.
 * @private
 */
gtv.jq.KeyController.prototype.detachZone_ = function(zone) {
  var keyController = this;

  var items = zone.container.find(zone.navSelectors.item);
  items.unbind('.keycontroller');
};

/**
 * Finds the next zone in a layer. This method will only return a zone if it is
 * a leaf zone (has no children); it traverses down parent zones to find the
 * leaves and selects the next leaf.
 * @param {KeyBehaviorZone} zone The current zone.
 * @return {KeyBehaviorZone} The next zone, or null if the layer has only one
 *     zone.
 * @private
 */
gtv.jq.KeyController.prototype.nextZone_ = function(zone) {
  var keyController = this;
  var zoneLayer = keyController.zoneLayers_[keyController.activeLayer_];

  if (zoneLayer.behaviorZones.length <= 1) {
    return null;
  }

  if (!zone) {
    return null;
  }

  var parentZones = [];

  var item = zone.container;
  while(item.length) {
    for (var j = 0; j < zoneLayer.behaviorZones.length; j++) {
      var parentContainer =
        item.parent(zoneLayer.behaviorZones[j].containerSelector);

      if (parentContainer.length != 0) {
        parentZones.push(zoneLayer.behaviorZones[j]);
      }
    }
    item = item.parent();
  }

  var newZone;
  var zoneIndex;
  for (var i = 0; i < zoneLayer.behaviorZones.length; i++) {
    if (zoneLayer.behaviorZones[i] == zone) {
      // This is the zone we're at, we want to find the next non-parent
      zoneIndex = i;
    }
    else if (zoneIndex != undefined) {
      // zoneIndex is set, meaning we're actively looking for next non-parent
      if ($.inArray(zoneLayer.behaviorZones[i], parentZones)) {
        newZone = zoneLayer.behaviorZones[i];
        break;
      }
    }
    else if (!newZone) {
      // zoneIndex not set, find first non-parent to handle wrap-around case
      if ($.inArray(zoneLayer.behaviorZones[i], parentZones)) {
        newZone = zoneLayer.behaviorZones[i];
      }
    }
  }

  return newZone || zone;
};

/**
 * Handles the keyDown event for the document where the Key Controller is started.
 * This handler will return immediately if there is no current zone or if there
 * is scrollIntoView animation in progress.
 * @param {Event} e The keydown event from the browser
 * @private
 */
gtv.jq.KeyController.prototype.keyDown_ = function(e) {
  var DIRECTIONS = {
    left: [-1, 0],
    up: [0, -1],
    right: [1, 0],
    down: [0, 1]
  };
  var keyController = this;

  if (!keyController.currentZone_ || keyController.moving_) {
    return;
  }

  var direction;
  var selectedIndex;
  if (keyController.selectedItem_) {
    selectedIndex = keyController.selectedItem_.data('index');
  }
  var rowIndex = selectedIndex;

  var visibleSelector = ':visible';
  if (keyController.currentZone_.selectHidden) {
    visibleSelector = '';
  }
  // We only want to allow navigation to items that are visible.
  var itemClass =
      keyController.currentZone_.navSelectors.item + visibleSelector;
  var itemParentClass =
      keyController.currentZone_.navSelectors.itemParent + visibleSelector;
  var itemParentRowClass =
      keyController.currentZone_.navSelectors.itemRow + visibleSelector;
  var itemParentRowPageClass =
      keyController.currentZone_.navSelectors.itemPage + visibleSelector;

  var newZone;
  var newSelected;

  if (keyController.selectedItem_) {
    if (keyController.selectedItem_.is('input[type=text]')) {
      // If the selected item is an input box, we want special arrow key
      // nav code.
      if (keyController.selectedItem_.get(0) == document.activeElement) {
        // If the input has focus and is not empty, ignore the left/right
        // arrow keys for navigation, since the user probably wants to
        // move around in the input box
        if (keyController.selectedItem_.val() &&
            (e.keyCode == 37 || e.keyCode == 39 || e.keyCode == 8)) {
          return;
        }
      } else if (e.keyCode == 37 || e.keyCode == 39) {
        // If the input does not have focus, allow navigation away from
        // it, and prevent the key from reaching the input control
        e.preventDefault();
      }
    } else if (keyController.selectedItem_.is('select')) {
      // If the selected item is a dropdown box, eat all the navigation
      // codes meant for it so we can navigate away instead of being
      // stuck cycling through values in the box.
      if (e.keyCode >= 37 && e.keyCode <= 40) {
        e.preventDefault();
      }
    }
  }

  switch(e.keyCode) {
    case 9: {  // TAB
      newZone = keyController.nextZone_(keyController.currentZone_);
      e.preventDefault();
      break;
    }
    case 37: {  // left
      if (!keyController.selectedItem_)
        break;

      direction = DIRECTIONS.left;

      if (itemParentClass) {
        var parent = keyController.selectedItem_.parent();
        newSelected = parent.prevAll(itemParentClass).eq(0).find(itemClass);
      } else {
        newSelected = keyController.selectedItem_.prevAll(itemClass).eq(0);
      }
      break;
    }
    case 38: {  // up
      if (!keyController.selectedItem_)
        break;

      direction = DIRECTIONS.up;

      if (!itemParentRowClass) {
        break;
      }

      if (keyController.currentZone_.saveRowPosition) {
        keyController.selectedItem_
          .parents(itemParentRowClass)
          .data('index', selectedIndex);
      }

      var parentRow = keyController.selectedItem_.parents(itemParentRowClass);
      var newRow = parentRow.prevAll(itemParentRowClass).eq(0);

      if (keyController.currentZone_.saveRowPosition && newRow.length) {
        rowIndex = newRow.data('index');
      }

      while (rowIndex >=0 && (!newSelected || newSelected.length == 0)) {
        newSelected = newRow.find(itemParentClass)
          .eq(rowIndex)
          .find(itemClass);
        rowIndex -= 1;
      }
      break;
    }
    case 39: {  // right
      if (!keyController.selectedItem_) {
        break;
      }

      direction = DIRECTIONS.right;

      if (itemParentClass) {
        var parent = keyController.selectedItem_.parent();
        newSelected = parent.nextAll(itemParentClass).eq(0).find(itemClass);
      } else {
        newSelected = keyController.selectedItem_.nextAll(itemClass).eq(0);
      }
      break;
    }
    case 40: {  // down
      if (!keyController.selectedItem_) {
        break;
      }

      direction = DIRECTIONS.down;

      if (!itemParentRowClass) {
        break;
      }

      if (keyController.currentZone_.saveRowPosition) {
        keyController.selectedItem_
          .parents(itemParentRowClass)
          .data('index', selectedIndex);
      }

      var parentRow = keyController.selectedItem_.parents(itemParentRowClass);
      var newRow = parentRow.nextAll(itemParentRowClass).eq(0);

      if (keyController.currentZone_.saveRowPosition && newRow.length) {
        rowIndex = newRow.data('index');
      }

      while (rowIndex >=0 && (!newSelected || newSelected.length == 0)) {
        newSelected = newRow.find(itemParentClass)
          .eq(rowIndex)
          .find(itemClass);
        rowIndex -= 1;
      }
      break;
    }
  }

  if (keyController.currentZone_.useGeometry &&
      e.keyCode >= 37 && e.keyCode <= 40) {
    newSelected = keyController.nearestElement_(keyController.currentZone_,
                                                keyController.selectedItem_,
                                                direction);
  }

  var keyAction;
  // If there's a global mapping action for this key, call it.
  keyAction = keyController.globalKeyMapping_[e.keyCode];
  if (keyAction) {
    e.preventDefault();
    var result = keyAction(keyController.selectedItem_, newSelected);
    if (result.status == 'skip') {
      return;
    } else if (result.status == 'selected') {
      newSelected = result.selected;
    }
  }

  // If there's a layer mapping action for this key, call it.
  keyAction = keyController.zoneLayers_[keyController.activeLayer_]
      .globalKeyMapping[e.keyCode];
  if (keyAction) {
    e.preventDefault();
    var result = keyAction(keyController.selectedItem_, newSelected);
    if (result.status == 'skip') {
      return;
    } else if (result.status == 'selected') {
      newSelected = result.selected;
    }
  }

  // If the zone has a mapped action for this key, call it.
  keyAction = keyController.currentZone_.keyMapping[e.keyCode];
  if (keyAction) {
    var result = keyAction(keyController.selectedItem_, newSelected);
    if (result.status == 'skip') {
      return;
    } else if (result.status == 'selected') {
      newSelected = result.selected;
    }
  }

  keyController.processSelection_(newZone, newSelected, direction);
};

/**
 * Interprets the results of keyDown processing and moves the selection as
 * appropriate. May shift to a new zone if a new zone is provided or if the
 * newly selected item is unset and a directional key was pressed.
 * @param {KeyBehaviorZone} newZone The new zone to be selected. If this is
 *     null and newSelected is null and direction is specified, this method
 *     will look for a new zone in the direction of movement. Otherwise, it
 *     will assume the current zone.
 * @param {jQuery.Element} newSelected The new item to move selection to. If
 *     null and direction is set, the value will be obtained either by moving
 *     into a proximate zone (if newZone is null) or by entering newZone.
 * @param {Array.<number>} direction A two number array specifying the
 *     direction of movement, if any. The first number represents horizontal
 *     direction, the second vertical direction.
 * @private
 */
gtv.jq.KeyController.prototype.processSelection_ = function(newZone,
                                                           newSelected,
                                                           direction) {
  var keyController = this;

  // If the selection resulted in a change of zone or the movement
  // resulted in no new selected item, try moving to a new zone.
  if (newZone ||
      ((!newSelected || newSelected.length == 0) && direction)) {

    if (!newZone) {
      newZone = keyController.getNewZone_(keyController.selectedItem_,
                                          direction);
    }
    if (newZone) {
      newSelected = keyController.shiftZone_(newZone);
    }
  } else {
    newZone = keyController.currentZone_;
  }

  // If after all that we have a new item to select, move the selection.
  if (newSelected && newSelected.length > 0) {
    keyController.moveSelected_(newZone, newSelected);
  }
};

/**
 * Leaves the current zone, calling a leaveZone action if the zone defines one,
 * otherwise, sets the zone's last selected item to the specified selectedItem.
 * @param {KeyBehaviorZone} zone The zone to leave.
 * @param {jQuery.Element} selectedItem The item in the zone currently selected.
 * @private
 */
gtv.jq.KeyController.prototype.leaveZone_ = function(zone, selectedItem) {
  if (zone.actions.leaveZone) {
    zone.actions.leaveZone(selectedItem);
  } else {
    zone.lastSelected = selectedItem;
  }
};

/**
 * Leaves a heirarchy of zones, that is, a zone with the current selection
 * and then each parent zone in turn until there are no more parent zones.
 * This ensures that the heirarchy of leaveZone actions are called when a
 * child zone is left.
 * @param {jQuery.Element} selectedItem Child zone item currently selected.
 * @private
 */
gtv.jq.KeyController.prototype.leaveZoneHeirarchy_ = function(selectedItem) {
  var keyController = this;
  var zoneLayer = keyController.zoneLayers_[keyController.activeLayer_];

  var item = selectedItem;
  while(item.length) {
    for (var i = 0; i < zoneLayer.behaviorZones.length; i++) {
      var parentContainer =
        item.parent(zoneLayer.behaviorZones[i].containerSelector);

      if (parentContainer.length != 0) {
        keyController.leaveZone_(zoneLayer.behaviorZones[i], selectedItem);
        selectedItem = null;
      }
    }
    item = item.parent();
  }
};

/**
 * Enters the specified zone, calling the enterZone action if supplied.
 * @param {KeyBehaviorZone} zone The zone to enter.
 * @return {jQuery.Element} The item to select in the new zone as returned by
 *     the zone's enterZone action, or null if none.
 * @private
 */
gtv.jq.KeyController.prototype.enterZone_ = function(zone) {
  if (zone.actions.enterZone) {
    return zone.actions.enterZone();
  }

  return null;
};

/**
 * Enters a zone heirarchy, ensuring that the parents of a zone have their
 * enterZone actions called when a child zone is entered.
 * @param {jQuery.Element} selectedItem The iten to select in the child zone.
 * @private
 */
gtv.jq.KeyController.prototype.enterZoneHeirarchy_ = function(selectedItem) {
  var keyController = this;
  var zoneLayer = keyController.zoneLayers_[keyController.activeLayer_];

  var item = selectedItem;
  while(item.length) {
    for (var i = 0; i < zoneLayer.behaviorZones.length; i++) {
      var parentContainer =
        item.parent(zoneLayer.behaviorZones[i].containerSelector);

      if (parentContainer.length != 0) {
        keyController.enterZone_(zoneLayer.behaviorZones[i]);
      }
    }
    item = item.parent();
  }
};

/**
 * Leaves the current zone, if any.
 * @private
 */
gtv.jq.KeyController.prototype.leaveCurrentZone_ = function() {
  var keyController = this;

  if (!keyController.currentZone_) {
    return;
  }

  keyController.leaveZoneHeirarchy_(keyController.selectedItem_);
};

/**
 * Shifts from the current zone to a new zone and determines the item to be
 * selected.
 * @param {KeyBehaviorZone} newZone The new zone to enter.
 * @param {jQuery.Element} newSelected The item to be selected in the zone.
 * @return {jQuery.Element} The new item to selected.
 * @private
 */
gtv.jq.KeyController.prototype.shiftZone_ = function(newZone, newSelected) {
  var keyController = this;

  // If the new zone has an enterZoneAction, call it to enter the zone
  if (newZone.actions.enterZone) {
    newSelected = newZone.actions.enterZone();
  } else {
    newSelected = newZone.lastSelected;
  }

  // If there was no zone enter action, or it didn't select a new item,
  // select one naively, on its behalf.
  if (!newSelected || newSelected.length == 0) {
    newSelected = newZone.container.find(newZone.navSelectors.item).first();
  }

  return newSelected;
};

/**
 * Finds the closest zone in the direction of movement from a specified item,
 * and returns it.
 * @param {jQuery.Element} fromItem The item selection is moving from.
 * @param {Array.<number>} direction The direction of movement.
 * @return {KeyBehaviorZone} The best choice for the zone in the direction
 *     of movement, or null if there are none.
 * @private
 */
gtv.jq.KeyController.prototype.getNewZone_ = function(fromItem, direction) {
  var keyController = this;
  var zoneLayer = keyController.zoneLayers_[keyController.activeLayer_];

  var minZoneDistance;
  var newZone;

  for (var i = 0; i < zoneLayer.behaviorZones.length; i++) {
    var zone = zoneLayer.behaviorZones[i];
    if (zone == keyController.currentZone_) {
      continue;
    }

    var zoneDistance =
      keyController.calcElementDistance_(fromItem, zone.container, direction);

    if (zoneDistance >= 0 &&
        (minZoneDistance == undefined || zoneDistance < minZoneDistance)) {
      minZoneDistance = zoneDistance;
      newZone = zone;
    }
  }

  return newZone;
};

/**
 * Determines the visually "nearest" item in the zone, as laid out on the page,
 * in the direction of movement.
 * @param {KeyBehaviorZone} zone The zone to check.
 * @param {jQuery.Element} fromItem The item being moved from.
 * @param {Array.<number>} direction The direction of movement.
 * @return {jQuery.Element} The item, or null if none qualify.
 * @private
 */
gtv.jq.KeyController.prototype.nearestElement_ = function(zone,
                                                          fromItem,
                                                          direction) {
  var keyController = this;

  var minCheckItemDistance;
  var newCheckItem;

  var visibleSelector = ':visible';
  if (zone.selectHidden) {
    visibleSelector = '';
  }
  var items = zone.container.find(zone.navSelectors.item + visibleSelector);

  for (var i = 0; i < items.length; i++) {
    var checkItem = items.eq(i);
    if (checkItem.get(0) == fromItem.get(0)) {
      continue;
    }

    var checkItemDistance =
      keyController.calcElementDistance_(fromItem, checkItem, direction);

    if (checkItemDistance >= 0 &&
        (minCheckItemDistance == undefined ||
         checkItemDistance < minCheckItemDistance)) {
      minCheckItemDistance = checkItemDistance;
      newCheckItem = checkItem;
    }
  }

  return newCheckItem;
};

/**
 * Calculates a weighted Euclidean distance between two elements on the page
 * in a given direction.
 * @param {jQuery.Element} fromItem The start element.
 * @param {jQuery.Element} toItem The destination element.
 * @param {Array.<number>} direction The direction of movement.
 * @return {number} The weighted Euclidean distance, or -1 if the toItem is
 *     not in the specified direction.
 * @private
 */
gtv.jq.KeyController.prototype.calcElementDistance_ = function(fromItem,
                                                               toItem,
                                                               direction) {
  function calcDistance(dx, dy) {
    return Math.floor(Math.sqrt((dx * dx) + (dy * dy)));
  }

  var fromItemOffset = fromItem.offset();
  var fromItemLeft = fromItemOffset.left;
  var fromItemTop = fromItemOffset.top;
  var fromItemRight = fromItemLeft + fromItem.outerWidth();
  var fromItemBottom = fromItemTop + fromItem.outerHeight();
  var fromItemCenterX = fromItemLeft + (fromItem.outerWidth() / 2);
  var fromItemCenterY = fromItemTop + (fromItem.outerHeight() / 2);

  var toItemOffset = toItem.offset();
  var toItemLeft = toItemOffset.left;
  var toItemTop = toItemOffset.top;
  var toItemRight = toItemLeft + toItem.outerWidth();
  var toItemBottom = toItemTop + toItem.outerHeight();
  var toItemCenterX = toItemLeft + (toItem.outerWidth() / 2);
  var toItemCenterY = toItemTop + (toItem.outerHeight() / 2);

  var toItemDistance;
  var distanceX;
  var distanceY;

  if (direction[1] == 0) {
    if (direction[0] < 0) {
      if (toItemRight <= fromItemLeft) {
        distanceX = fromItemLeft - toItemRight;
      }

      if (toItemCenterX <= fromItemLeft) {
        if (distanceX != undefined) {
          distanceX = Math.min(distanceX, fromItemLeft - toItemCenterX);
        } else {
          distanceX = fromItemLeft - toItemCenterX;
        }
      }

      if (toItemRight <= fromItemLeft) {
        if (distanceX != undefined) {
          distanceX = Math.min(distanceX, fromItemLeft - toItemRight);
        } else {
          distanceX = fromItemLeft - toItemRight;
        }
      }
    }
    else {
      if (fromItemRight <= toItemLeft) {
        distanceX = toItemLeft - fromItemRight;
      }

      if (fromItemRight <= toItemCenterX) {
        if (distanceX != undefined) {
          distanceX = Math.min(distanceX, toItemCenterX - fromItemRight);
        } else {
          distanceX = toItemCenterX - fromItemRight;
        }
      }

      if (fromItemLeft < toItemLeft) {
        if (distanceX != undefined) {
          distanceX = Math.min(distanceX, toItemLeft - fromItemLeft);
        } else {
          distanceX = toItemLeft - fromItemLeft;
        }
      }
    }

    distanceY = Math.min(Math.abs(fromItemCenterY - toItemTop),
                         Math.abs(fromItemCenterY - toItemCenterY),
                         Math.abs(fromItemCenterY - toItemBottom)) * 2;
  } else if (direction[0] == 0) {
    if (direction[1] < 0) {
      if (toItemBottom <= fromItemTop) {
        distanceY = fromItemTop - toItemBottom;
      }

      if (toItemCenterY <= fromItemTop) {
        if (distanceY != undefined) {
          distanceY = Math.min(distanceY, fromItemTop - toItemCenterY);
        } else {
          distanceY = fromItemTop - toItemCenterY;
        }
      }

      if (toItemBottom <= fromItemTop) {
        if (distanceY != undefined) {
          distanceY = Math.min(distanceY, fromItemTop - toItemBottom);
        } else {
          distanceY = fromItemTop - toItemBottom;
        }
      }
    }
    else {
      if (fromItemBottom <= toItemTop) {
        distanceY = toItemTop - fromItemBottom;
      }

      if (fromItemBottom <= toItemCenterY) {
        if (distanceY != undefined) {
          distanceY = Math.min(distanceY, toItemCenterY - fromItemBottom);
        } else {
          distanceY = toItemCenterY - fromItemBottom;
        }
      }

      if (fromItemTop < toItemTop) {
        if (distanceY != undefined) {
          distanceY = Math.min(distanceY, toItemTop - fromItemTop);
        } else {
          distanceY = toItemTop - fromItemTop;
        }
      }
    }

    distanceX = Math.min(Math.abs(fromItemCenterX - toItemLeft),
                         Math.abs(fromItemCenterX - toItemCenterX),
                         Math.abs(fromItemCenterX - toItemRight)) * 2;
  }

  // If either distance is undefined, the toItem is in the wrong direction,
  // so forget trying to move to it.
  if (distanceX == undefined || distanceY == undefined) {
    toItemDistance = -1;
  } else {
    toItemDistance = calcDistance(distanceX, distanceY);
  }

  return toItemDistance;
};

/**
 * Moves selection from the current selected element to the specified element,
 * which may be in a new zone. The selectedItem may be null.
 * @param {KeyBehaviorZone} newZone The new zone to move selection to.
 * @param {jQuery.Element} newSelected The new item to select. If not supplied,
 *     this method assumes that selection is leaving the current zone.
 * @param {SynchronizedCallback.acquireCallback} animFinishedCallback Reference
 *     counting callback function used to track when all scrollIntoView
 *     animations are completed.
 * @private
 */
gtv.jq.KeyController.prototype.moveSelected_ = function(newZone,
                                                        newSelected,
                                                        animFinishedAction) {
  var keyController = this;
  var zoneLayer = keyController.zoneLayers_[keyController.activeLayer_];

  function finishedCallback() {
    keyController.moving_ = false;
    if (animFinishedAction) {
      animFinishedAction();
    }
  }

  var syncCallback = new gtv.jq.SynchronizedCallback(finishedCallback);
  keyController.moving_ = true;

  if (keyController.selectedItem_ &&
      keyController.selectedItem_ != newSelected) {
    if (keyController.currentZone_.selectionClasses.basic) {
      keyController.selectedItem_.removeClass(
        keyController.currentZone_.selectionClasses.basic);
    }

    if (keyController.currentZone_.selectionClasses.hasData) {
      keyController.selectedItem_.removeClass(
        keyController.currentZone_.selectionClasses.hasData);
    }

    if (keyController.selectedItem_.blur) {
      keyController.selectedItem_.blur();
    }
  }

  if (newSelected) {
    var findContainer;
    if (newZone) {
      findContainer = newSelected.parents(newZone.containerSelector);
    }

    if (!findContainer || findContainer.length == 0) {
      for (var i = 0; i < zoneLayer.behaviorZones.length; i++) {
        findContainer =
          newSelected.parents(zoneLayer.behaviorZones[i].containerSelector);

        if (findContainer.length) {
          newZone = zoneLayer.behaviorZones[i];
          keyController.shiftZone_(newZone, newSelected);
          break;
        }
      }
    }

    var shouldLeaveZone = true;
    if (newZone == keyController.currentZone_) {
      shouldLeaveZone = false;
    }

    function findChildZones(parent) {
      var j;
      for (j = 0; j < zoneLayer.behaviorZones.length; j++) {
        var childContainer =
          parent.children(zoneLayer.behaviorZones[j].containerSelector);

        if (childContainer.length > 0) {
          newZone = zoneLayer.behaviorZones[j];
          newSelected = keyController.shiftZone_(newZone);
          if (newZone == keyController.currentZone_)
            shouldLeaveZone = false;

          findChildZones(newSelected);
          return true;
        }
      }

      var children = parent.children();
      for (j = 0; j < children.length; j++) {
        if (findChildZones(children)) {
          return true;
        }
      }

      return false;
    }

    keyController.enterZoneHeirarchy_(newSelected);
    findChildZones(newSelected);

    if (shouldLeaveZone) {
      keyController.leaveCurrentZone_();
    }

    keyController.scrollIntoView_(newZone,
                                  newSelected,
                                  syncCallback);

    if (newZone.navigableData && newZone.selectionClasses.hasData) {
      newSelected.addClass(newZone.selectionClasses.hasData);
    } else if (newZone.selectionClasses.basic) {
      newSelected.addClass(newZone.selectionClasses.basic);
    }
  } else {
    // If no item is selected, we must be leaving the current zone
    keyController.leaveCurrentZone_();
  }

  if (newZone && newZone.actions.moveSelected) {
    newZone.actions.moveSelected(keyController.selectedItem_, newSelected);
  }

  keyController.selectedItem_ = newSelected;
  keyController.currentZone_ = newZone;
  if (newZone) {
    // Look to see if this new zone has presence in the current layer.
    for (var layer = 0; layer < newZone.layers.length; layer++) {
      if (newZone.layers[layer] == keyController.activeLayer) {
        break;
      }
    }

    // If we didn't find the active layer in the layers the zone has
    // has presence in, then set the active layer to the new zone's first.
    if (layer == newZone.layers.length) {
      keyController.activeLayer_ = newZone.layers[0];
    }
  }

  syncCallback.done();
};

/**
 * Calls the zone's scrollIntoView action, if any.
 * @param {KeyBehaviorZone} zone The zone containing the item.
 * @param {jQuery.Element} item Item the action should make sure is visible.
 * @param {SynchronizedCallback} syncCallback The synchronized callback object
 *     that will wait for the scroll animations to complete.
 * @private
 */
gtv.jq.KeyController.prototype.scrollIntoView_ = function(zone,
                                                         item,
                                                         syncCallback) {
  var keyController = this;

  var container = $(item).parents(zone.navSelectors.itemParent);

  if (zone.actions.scrollIntoView) {
    zone.actions.scrollIntoView(keyController.selectedItem_,
                                item,
                                syncCallback.getCallback());
  }
};

/**
 * Handler for mouse clicks on any item managed by the Key Controller.
 * @param {jQuery.Element} item The item receiving the click.
 * @private
 */
gtv.jq.KeyController.prototype.click_ = function(item) {
  var keyController = this;

  if (keyController.currentZone_) {
    if (keyController.currentZone_.actions.click) {
      keyController.currentZone_.actions.click(item);
    }
  }
};

