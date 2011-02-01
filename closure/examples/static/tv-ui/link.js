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
 * @fileoverview A hyperlink.
 */
goog.provide('tv.ui.Link');

goog.require('tv.ui');
goog.require('tv.ui.Button');

/**
 * Constructs button.
 * @constructor
 * @extends {tv.ui.Button}
 */
tv.ui.Link = function() {
  goog.base(this);
};
goog.inherits(tv.ui.Link, tv.ui.Button);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.Link.CLASS = 'tv-link';
tv.ui.registerDecorator(tv.ui.Link, tv.ui.Link.CLASS);

/**
 * @inheritDoc
 */
tv.ui.Link.prototype.getClass = function() {
  return tv.ui.Link.CLASS;
};

/**
 * Handles action event.
 * Follows the hyperlink.
 * @param {goog.events.Event} event Action event.
 * @protected
 */
tv.ui.Link.prototype.onAction = function(event) {
  this.navigate(this.getElement().getAttribute('href'));
};

/**
 * Redirectes page to given location.
 * @param {string} url URL to redirect browser.
 * @private
 */
tv.ui.Link.prototype.navigate = function(url) {
  window.location = url;
};
