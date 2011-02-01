// Copyright 2011 Google Inc. All Rights Reserved.
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
 * @fileoverview Facilitates post-decoration initialization of components.
 * Components can be matched by element id and CSS class.
 * Multiple handlers can be called for decorated component.
 */
goog.provide('tv.ui.DecorateHandler');

goog.require('goog.array');

/**
 * Creates handler.
 * @param {Object=} opt_context Context to call handlers in.
 * @constructor
 */
tv.ui.DecorateHandler = function(opt_context) {
  /**
   * @type {Object}
   * @private
   */
  this.context_ = opt_context || null;

  /**
   * Map from DOM element id to handler.
   * @type {Object.<string, Function>}
   * @private
   */
  this.idToHandlerMap_ = {};

  /**
   * Map from CSS class name to handler.
   * @type {Object.<string, Function>}
   * @private
   */
  this.classToHandlerMap_ = {};
};

/**
 * Adds handler to be called when element with specific id is decorated.
 * @param {string} id Element id.
 * @param {Function} handler Handler to call.
 */
tv.ui.DecorateHandler.prototype.addIdHandler = function(id, handler) {
  this.idToHandlerMap_[id] = handler;
};

/**
 * Adds handler to be called when element with specific CSS class is decorated.
 * @param {string} className CSS class name.
 * @param {Function} handler Handler to call.
 */
tv.ui.DecorateHandler.prototype.addClassHandler = function(className, handler) {
  this.classToHandlerMap_[className] = handler;
};

/**
 * @return {Function} Handler to pass to tv.ui.decorate() function.
 */
tv.ui.DecorateHandler.prototype.getHandler = function() {
  return goog.bind(this.onDecorate_, this);
};

/**
 * Handles element decoration.
 * Calls matching handlers.
 * @param {tv.ui.Component} component Component created as result of decoration.
 * @private
 */
tv.ui.DecorateHandler.prototype.onDecorate_ = function(component) {
  var idHandler = this.idToHandlerMap_[component.getElement().id];
  idHandler && idHandler.call(this.context_, component);

  goog.array.forEach(
      goog.dom.classes.get(component.getElement()), function(className) {
        var classHandler = this.classToHandlerMap_[className];
        classHandler && classHandler.call(this.context_, component);
      }, this);
};
