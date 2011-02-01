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
 * @fileoverview Photo lightbox. Simple variation of lightbox that displays
 * only photos. Designed to take whole page space.
 * Basically it's just a styled container filled with photos as components.
 *
 */

goog.provide('tv.ui.Lightbox');

goog.require('tv.ui.Container');

/**
 * Constructs photo lightbox.
 * @constructor
 * @extends {tv.ui.Container}
 */
tv.ui.Lightbox = function() {
  goog.base(this);

  /**
   * Acompanion background element put under lightbox container.
   * @type {Element}
   */
  this.backgroundElement_ = null;
};
goog.inherits(tv.ui.Lightbox, tv.ui.Container);

/**
 * @type {string} Main CSS class that triggers decoration.
 */
tv.ui.Lightbox.CLASS = 'tv-lightbox';
tv.ui.registerDecorator(tv.ui.Lightbox, tv.ui.Lightbox.CLASS);

/**
 * Event types dispatched by lightbox.
 * @enum {string}
 */
tv.ui.Lightbox.EventType = {
  /**
   * Dispatched after lightbox was closed.
   */
  CLOSE: goog.events.getUniqueId('close')
};

/**
 * @inheritDoc
 */
tv.ui.Lightbox.prototype.onKey = function(event) {
  switch (event.keyCode) {
    case goog.events.KeyCodes.ESC:
      this.dispose();
      event.stopPropagation();
      break;
    case goog.events.KeyCodes.SPACE:
      if (this.selectNextChild()) {
        this.getDocument().setFocusedComponent(
            this.getSelectedDescendantOrSelf());
        event.stopPropagation();
      }
      break;
    case goog.events.KeyCodes.BACKSPACE:
      if (this.selectPreviousChild()) {
        this.getDocument().setFocusedComponent(
            this.getSelectedDescendantOrSelf());
        event.stopPropagation();
      }
      break;
    default:
      goog.base(this, 'onKey', event);
  }
};

/**
 * Disposes lightbox. Removes from document background  and conaiter elements.
 */
tv.ui.Lightbox.prototype.disposeInternal = function() {
  this.dispatchEvent(tv.ui.Lightbox.EventType.CLOSE);

  goog.dom.removeNode(this.getElement());
  goog.dom.removeNode(this.backgroundElement_);
  delete this.backgroundElement_;

  goog.base(this, 'disposeInternal');
};

/**
 * Constructs lightbox with elements appended to document's body.
 *
 * @param {Array.<string>} photos List of photo URLs to display in lightbox.
 * @param {number} startIndex On which photo lightbox should be focused.
 * @param {Element} opt_background Lightbox background element.
 * @return {tv.ui.Lightbox} Constructed lightbox.
 */
tv.ui.Lightbox.show = function(photos, startIndex, opt_background) {
  // Lightbox background.
  var background =
      opt_background || goog.dom.createDom('div', 'tv-lightbox-background');
  document.body.appendChild(background);

  // Lightbox HTML container elements.
  var scrollEl = goog.dom.createDom('div', 'tv-container-start-scroll');
  var photoContainerEl = goog.dom.createDom('div',
      'tv-lightbox tv-container-horizontal', scrollEl);
  goog.array.forEach(photos, function(photo) {
    var photoEl = goog.dom.createDom('div', 'tv-component',
        goog.dom.createDom('img', {'src': photo}));
    scrollEl.appendChild(photoEl);
  });
  document.body.appendChild(photoContainerEl);

  // Decoration.
  var photoContainer;
  var decorateHandler = new tv.ui.DecorateHandler();
  decorateHandler.addClassHandler('tv-lightbox', function(container) {
    photoContainer = container;
  });
  tv.ui.decorate(photoContainerEl, decorateHandler.getHandler());
  photoContainer.setSelectedChild(photoContainer.getChildren()[startIndex]);

  // Center photo container in the page.
  var maxHeight = 0;
  var maxWidth = 0;
  goog.array.forEach(photoContainer.getChildren(), function(child) {
    maxHeight = Math.max(maxHeight, child.getElement().clientHeight);
    maxWidth = Math.max(maxWidth, child.getElement().clientWidth);
  });

  var left = (document.body.clientWidth / 2) - (maxWidth / 2);
  var top = (document.body.clientHeight / 2) - (maxHeight / 2);
  goog.style.setPosition(photoContainerEl, left, top);

  photoContainer.backgroundElement_ = background;

  return photoContainer;
};
