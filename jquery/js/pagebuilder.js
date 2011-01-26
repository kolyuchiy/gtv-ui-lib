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
 * @fileoverview Classes for BuilderPhotoPage and BuilderVideoPage.
 * These classes are used to create 'turn-key' pages for the display of photo
 * and video feeds. The feeds must be able to provide a JSON format.
 *
 * The created pages will display thumbnails for the feed in a row control,
 * show the selected photo/video in the middle of the page, and, for photos,
 * advance through the photos as a slideshow. Uses PhotoControl, VideoControl
 * and RowControl. Video support for YouTube only at the moment.
 *
 * @author shines@google.com (Steven Hines)
 */

var gtv = gtv || {
  jq : {}
};


/**
 * BuildData class holds parameters used to create the page.
 * @constructor
 */
gtv.jq.BuildData = function() {
};

/**
 * Array or comma-separated list of names, in hierarchical order, used to
 * locate the array of entries in the feed.
 * @type {string}
 */
gtv.jq.BuildData.feedItemsSeeker = null;

/**
 * Array or comma-separated list of names, in hierarchical order starting
 * from the entry, used to locate thumbnail URL.
 * @type {string}
 */
gtv.jq.BuildData.feedThumbSeeker = null;

/**
 * Array or comma-separated list of names, in hierarchical order starting
 * from the entry, used to locate the photo URL.
 * @type {string}
 */
gtv.jq.BuildData.feedContentSeeker = null;

/**
 * Width of the player in pixels. Defaults to 1024.
 * @type {number}
 */
gtv.jq.BuildData.playerWidth = null;

/**
 * Height of the player in pixels. If not supplied, calculated from the
 * player width assuming a 16:10 ratio.
 * @type {number}
 */
gtv.jq.BuildData.playerHeight = null;

/**
 * Height in pixels of the thumbnails.
 * @type {number}
 */
gtv.jq.BuildData.thumbnailSize = null;

/**
 * The type of SideNav to use, one of 'popUp' or 'fade'.
 * @type {string}
 */
gtv.jq.BuildData.navbarType = null;

/**
 * Delay, in seconds, between photos. Defaults to 4.
 * @type {number}
 */
gtv.jq.BuildData.slideshowSpeed = null;


/**
 * BuilderPhotoPage class
 * @constructor
 */
gtv.jq.BuilderPhotoPage = function() {
};

/**
 * Holds the instance of the RowControl used for the thumbnail row display.
 * @type {gtv.jq.RowControl}
 * @private
 */
gtv.jq.BuilderPhotoPage.thumbControl_ = null;

/**
 * Holds the instance of the SideNavControl that holds the thumbnail row.
 * @type {gtv.jq.SideNavControl}
 * @private
 */
gtv.jq.BuilderPhotoPage.scrollnavControl_ = null;

/**
 * Holds the instance of the PhotoControl that displays the selected photo.
 * @type {gtv.jq.PhotoControl}
 * @private
 */
gtv.jq.BuilderPhotoPage.photoControl_ = null;

/**
 * Removes the page's controls from the window.
 */
gtv.jq.BuilderPhotoPage.prototype.deletePage = function() {
  var builderPhotoPage = this;

  if (builderPhotoPage.thumbControl_) {
    builderPhotoPage.thumbControl_.deleteControl();
  }

  if (builderPhotoPage.scrollnavControl_) {
    builderPhotoPage.scrollnavControl_.deleteControl();
  }

  if (builderPhotoPage.photoControl_) {
    builderPhotoPage.photoControl_.deleteControl();
  }
};

/**
 * Creates a photo playback page.
 * @param {jQuery.Element} topParent The parent element for the page.
 * @param {BuildData} buildData Collection of build parameters for the page.
 * @param {KeyController} keyController Key controller for the page to use.
 * @param {?Array.<string>} layerNames Names of key control layer the control
 *     should use. If not supplied, uses the key controller default.
 */
gtv.jq.BuilderPhotoPage.prototype.makePage = function(topParent,
                                                      buildData,
                                                      keyController,
                                                      layerNames) {
  var builderPhotoPage = this;
  builderPhotoPage.topParent = topParent;

  builderPhotoPage.keyController_ = keyController;

  builderPhotoPage.layerNames_ = layerNames;

  if (!buildData.feedItemsSeeker instanceof Array) {
    buildData.feedItemsSeeker = buildData.feedItemsSeeker.split(',');
  }

  if (!buildData.feedThumbSeeker instanceof Array) {
    buildData.feedThumbSeeker = buildData.feedThumbSeeker.split(',');
  }

  if (!buildData.feedContentSeeker instanceof Array) {
    buildData.feedContentSeeker = buildData.feedContentSeeker.split(',');
  }

  buildData.playerWidth = buildData.playerWidth || 1024;
  buildData.playerHeight = buildData.playerHeight ||
      (buildData.playerWidth * 10 / 16);

  buildData.thumbnailSize = buildData.thumbnailSize || 100;

  buildData.navbarType = buildData.navbarType || 'popUp';

  buildData.slideshowSpeed = buildData.slideshowSpeed || 4;

  builderPhotoPage.buildData = buildData;

  /**
   * Called from processJsonpFeed to create an element for the page to
   * represent the feed entry.
   * @param {Object} entry The feed entry to create.
   * @return {jQuery.Element} The created element that represents the entry.
   */
  function makeItem(entry) {
    var content;
    var thumbs;

    thumbs = entry;
    for (var i = 0; i < buildData.feedThumbSeeker.length; i++) {
      thumbs = thumbs[buildData.feedThumbSeeker[i]];
      if (!thumbs) {
        return null;
      }
    }

    content = entry;
    for (i = 0; i < buildData.feedContentSeeker.length; i++) {
      content = content[buildData.feedContentSeeker[i]];
      if (!content) {
        return null;
      }
    }

    if (!content || !thumbs) {
      return null;
    }

    var item = $('<img></img>')
      .css({
         height: builderPhotoPage.buildData.thumbnailSize + 'px',
         display: 'block'
       });
    item.addClass('loadable');
    item.attr('src', thumbs);

    if (content) {
      item.data('url', content);
    }

    return item;
  }

  /**
   * Called from processJsonpFeed after all items have been created from the
   * feed entries. Uses the items to create a nav bar with thumbnails.
   * @param {Array.<jQuery.Element>} items Items from the feed.
   */
  function makeRow(items) {
    builderPhotoPage.makeScrollNav_(items);
    builderPhotoPage.items = items;

    builderPhotoPage.showPhoto_(0);
  }

  gtv.jq.GtvCore.processJsonpFeed(buildData.feed,
                                  makeItem,
                                  makeRow,
                                  buildData.feedItemsSeeker);
};

/**
 * Creates the SideNav Control and the Row Control that it holds, populating
 * it with thumbnails from the feed.
 * @param {Array.<jQuery.Element>} items Array of thumbnail images.
 * @private
 */
gtv.jq.BuilderPhotoPage.prototype.makeScrollNav_ = function(items) {
  var builderPhotoPage = this;

  var scrollnavHolder = $('<div></div>').addClass('scrollnav-holder');
  builderPhotoPage.topParent.append(scrollnavHolder);

  var firstShowSrc;
  var navItemsGenerator =
      function(parent) {
        if (builderPhotoPage.thumbControl_) {
          return false;
        }

        var scrollRowContainer =
            $('<div></div>').addClass('scrollnav-row-holder');

        var windowWidth = $(window).width();
        scrollRowContainer.width(windowWidth);
        parent.append(scrollRowContainer);

        function enterCallback(item) {
          var index = item.data('index');
          builderPhotoPage.showPhoto_(index);
        }

        // CSS classes to style the RowControl held by the SideNav.
        var styles = {
          row: 'scrollnav-nav-row-style',
          itemsDiv: 'scrollnav-nav-items-div-style',
          itemDiv: 'scrollnav-nav-div-style',
          item: 'scrollnav-nav-item-style',
          selected: 'scrollnav-nav-item-hover'
        };

        var createParams = {
          containerId: 'row-container',
          styles: styles,
          keyController: builderPhotoPage.keyController_,
          choiceCallback: enterCallback,
          layerNames: builderPhotoPage.layerNames_
        };
        builderPhotoPage.thumbControl_ = new gtv.jq.RowControl(createParams);

        var showParams = {
          topParent: scrollRowContainer,
          items: items
        };
        var scrollRow = builderPhotoPage.thumbControl_.showControl(showParams);
        builderPhotoPage.thumbControl_.enableNavigation();

        scrollRowContainer.height(scrollRow.height());

        return true;
      };

  // CSS classes to style the SideNav control.
  var styles = {
    item: 'scrollnav-item-style',
    itemDiv: 'scrollnav-item-div-style',
    row: 'scrollnav-row-style',
    chosen: 'scrollnav-item-chosen',
    normal: 'scrollnav-item-normal',
    selected: 'scrollnav-item-hover'
  };

  var behaviors;
  if (builderPhotoPage.buildData.navbarType == 'popUp') {
    behaviors = {
      popOut: 'bottom',
      orientation: 'horizontal'
    };
  } else if (builderPhotoPage.buildData.navbarType == 'fade') {
    behaviors = {
      fade: true,
      orientation: 'horizontal'
    };
  }

  var sidenavParams = {
    createParams: {
      containerId: 'scrollnav',
      styles: styles,
      keyController: builderPhotoPage.keyController_,
      layerNames: builderPhotoPage.layerNames_
    },
    behaviors: behaviors
  };
  builderPhotoPage.scrollnavControl_ =
      new gtv.jq.SideNavControl(sidenavParams);

  var showParams = {
    topParent: scrollnavHolder,
    itemsGenerator: navItemsGenerator
  };
  builderPhotoPage.scrollnavControl_.showControl(showParams);

  if (builderPhotoPage.buildData.navbarType == 'fade') {
    var windowHeight = $(window).height();
    scrollnavHolder.css('top', ((windowHeight * 3) / 4) + 'px');
  }

  return items[0].data('url');
};

/**
 * Displays the specified photo. If not already done, creates a Photo Control
 * to display the photo.
 * @param {number} index The index in the collection of thumbnail items of the
 *     photo to display.
 * @private
 */
gtv.jq.BuilderPhotoPage.prototype.showPhoto_ = function(index) {
  var builderPhotoPage = this;

  if (!builderPhotoPage.showDiv) {
    builderPhotoPage.showDiv = $('<div></div>').addClass('scrollnav-show-div');
    builderPhotoPage.topParent.append(builderPhotoPage.showDiv);

    var styles = {
      item: 'player-item-style',
      itemDiv: 'player-item-div-style',
      row: 'player-row-style',
      selected: 'player-item-hover'
    };

    /**
      * Called from the PhotoControl to handle a next event.
      * @return {string} The URL of the next photo to display, or null if none.
      */
    function nextPhoto() {
      if (builderPhotoPage.photoId + 1 >= builderPhotoPage.items.length) {
        return null;
      }

      builderPhotoPage.photoId++;
      return builderPhotoPage.items[builderPhotoPage.photoId].data('url');
    }

    /**
      * Called from the PhotoControl to handle a previous event.
      * @return {string} The URL of the previous photo to display, or null if
      *     none.
      */
    function previousPhoto() {
      if (builderPhotoPage.photoId == 0) {
        return null;
      }

      builderPhotoPage.photoId--;
      return builderPhotoPage.items[builderPhotoPage.photoId].data('url');
    }

    // Callbacks for done, next, and previous events from the PhotoControl,
    // called when a photo is done displaying (slideshow timeout fires),
    // the user chooses the 'next' button, and the user chooses the 'previous'
    // button, respectively.
    var callbacks = {
      done: nextPhoto,
      next: nextPhoto,
      previous: previousPhoto
    };

    // Display the play, pause, next and previous buttons on the control.
    var buttons = {
      play: 'Play',
      pause: 'Pause',
      next: 'Next',
      previous: 'Previous'
    };

    builderPhotoPage.photoId = index;
    var photoParams = {
      createParams: {
        containerId: 'photo-container',
        styles: styles,
        keyController: builderPhotoPage.keyController_,
        layerNames: builderPhotoPage.layerNames_
      },
      width: builderPhotoPage.buildData.playerWidth,
      height: builderPhotoPage.buildData.playerHeight,
      callbacks: callbacks,
      photoUrl: builderPhotoPage.items[index].data('url'),
      buttons: buttons,
      slideshowSpeed: builderPhotoPage.buildData.slideshowSpeed
    };
    builderPhotoPage.photoControl_ = new gtv.jq.PhotoControl(photoParams);

    var showParams = {
      topParent: builderPhotoPage.showDiv
    };
    builderPhotoPage.photoControl_.showControl(showParams);
  } else {
    builderPhotoPage.photoId = index;
    builderPhotoPage.photoControl_.loadPhoto(
        builderPhotoPage.items[index].data('url'));
  }
};


/**
 * BuilderVideoPage class.
 * @constructor
 */
gtv.jq.BuilderVideoPage = function() {
};

/**
 * Holds the instance of the RowControl used for the thumbnail row display.
 * @type {gtv.jq.RowControl}
 * @private
 */
gtv.jq.BuilderVideoPage.thumbControl_ = null;

/**
 * Holds the instance of the SideNavControl that holds the thumbnail row.
 * @type {gtv.jq.SideNavControl}
 * @private
 */
gtv.jq.BuilderVideoPage.scrollnavControl_ = null;

/**
 * Holds the instance of the PhotoControl that displays the selected photo.
 * @type {gtv.jq.PhotoControl}
 * @private
 */
gtv.jq.BuilderVideoPage.photoControl_ = null;

/**
 * Removes the page's controls from the window.
 */
gtv.jq.BuilderVideoPage.prototype.deletePage = function() {
  var builderVideoPage = this;

  if (builderVideoPage.thumbControl_) {
    builderVideoPage.thumbControl_.deleteControl();
  }

  if (builderVideoPage.scrollnavControl_) {
    builderVideoPage.scrollnavControl_.deleteControl();
  }

  if (builderVideoPage.videoControl) {
    builderVideoPage.videoControl.deleteControl();
  }
};

/**
 * Creates a photo playback page.
 * @param {jQuery.Element} topParent The parent element for the page.
 * @param {BuildData} buildData Collection of build parameters for the page.
 * @param {KeyController} keyController Key controller for the page to use.
 * @param {?Array.<string>} layerNames Name of key control layer the control
 *     should use. If not supplied, uses the key controller default.
 */
gtv.jq.BuilderVideoPage.prototype.makePage = function(topParent,
                                                      buildData,
                                                      keyController,
                                                      layerNames) {
  var builderVideoPage = this;
  builderVideoPage.topParent = topParent;

  builderVideoPage.keyController_ = keyController;

  builderVideoPage.layerNames_ = layerNames;

  if (buildData.feedItemsSeeker instanceof String ||
      typeof buildData.feedItemsSeeker == 'string') {
    buildData.feedItemsSeeker = buildData.feedItemsSeeker.split(',');
  }

  if (buildData.feedThumbSeeker instanceof String ||
      typeof buildData.feedThumbSeeker == 'string') {
    buildData.feedThumbSeeker = buildData.feedThumbSeeker.split(',');
  }

  if (buildData.feedContentSeeker instanceof String ||
      typeof buildData.feedContentSeeker == 'string') {
    buildData.feedContentSeeker = buildData.feedContentSeeker.split(',');
  }

  buildData.playerWidth = buildData.playerWidth || 1024;
  buildData.playerHeight = buildData.playerHeight ||
      (buildData.playerWidth * 10 / 16);

  buildData.thumbnailSize = buildData.thumbnailSize || 100;

  buildData.navbarType = buildData.navbarType || 'popUp';

  builderVideoPage.buildData = buildData;

  /**
   * Called back from processJsonpFeed to create an element for the page to
   * represent the feed item entry passed in.
   * @param {FeedEntry} entry Entry from the data feed.
   @ @return {jQuery.Element} The element created for the entry.
   */
  function makeItem(entry) {
    var id = entry.id.$t;
    var content;
    var thumbs;

    thumbs = entry;
    for (var i = 0; i < buildData.feedThumbSeeker.length; i++) {
      thumbs = thumbs[buildData.feedThumbSeeker[i]];
      if (!thumbs) {
        return null;
      }
    }

    content = entry;
    for (i = 0; i < buildData.feedContentSeeker.length; i++) {
      content = content[buildData.feedContentSeeker[i]];
      if (!content) {
        return null;
      }
    }

    if (!id || !content || !thumbs) {
      return null;
    }

    var videoId = id.substring(id.lastIndexOf('/') + 1);

    var item = $('<img></img>')
      .css({
         height: builderVideoPage.buildData.thumbnailSize + 'px',
         display: 'block'
       });
    item.attr('src', thumbs);

    if (content) {
      item.data('url', content);
      item.data('id', videoId);
    }

    return item;
  }

  /**
   * Called from processJsonpFeed after all items have been created from the
   * feed entries. Uses the items to create a nav bar with thumbnails.
   * @param {Array.<jQuery.Element>} items Items from the feed.
   */
  function makeRow(items) {
    builderVideoPage.makeScrollNav_(items);
    builderVideoPage.items = items;

    builderVideoPage.showVideo_(items[0].data('url'), items[0].data('id'));
  }

  gtv.jq.GtvCore.processJsonpFeed(buildData.feed,
                                  makeItem,
                                  makeRow,
                                  buildData.feedItemsSeeker);

};

/**
 * Creates the SideNav Control and the Row Control that it holds, populating
 * it with thumbnails from the feed.
 * @param {Array.<jQuery.Element>} items Array of thumbnail images.
 * @private
 */
gtv.jq.BuilderVideoPage.prototype.makeScrollNav_ = function(items) {
  var builderVideoPage = this;

  var scrollnavHolder = $('<div></div>').addClass('scrollnav-holder');
  builderVideoPage.topParent.append(scrollnavHolder);

  var firstShowSrc;
  var navItemsGenerator =
      function(parent) {
        if (builderVideoPage.thumbControl_) {
          return false;
        }

        var scrollRowContainer =
            $('<div></div>').addClass('scrollnav-row-holder');

        var windowWidth = $(window).width();
        scrollRowContainer.width(windowWidth);
        parent.append(scrollRowContainer);

        function enterCallback(item) {
          var image = item.children().first();
          var url = image.data('url');
          var id = image.data('id');
          builderVideoPage.showVideo_(url, id);
        }

        // CSS classes used to style the RowControl held by the SideNav.
        var styles = {
          row: 'scrollnav-nav-row-style',
          itemsDiv: 'scrollnav-nav-items-div-style',
          itemDiv: 'scrollnav-nav-div-style',
          item: 'scrollnav-nav-item-style',
          selected: 'scrollnav-nav-item-hover'
        };

        var createParams = {
          containerId: 'row-container',
          styles: styles,
          keyController: builderVideoPage.keyController_,
          choiceCallback: enterCallback,
          laterNames: builderVideoPage.layerNames_
        };
        builderVideoPage.thumbControl_ = new gtv.jq.RowControl(createParams);

        var showParams = {
          topParent: scrollRowContainer,
          items: items
        };
        var scrollRow =
            builderVideoPage.thumbControl_.showControl(showParams);
        builderVideoPage.thumbControl_.enableNavigation();

        scrollRowContainer.height(scrollRow.height());

        return true;
      };

  // These are the CSS classes that will be used to style the SideNav control.
  var styles = {
    item: 'scrollnav-item-style',
    itemDiv: 'scrollnav-item-div-style',
    row: 'scrollnav-row-style',
    chosen: 'scrollnav-item-chosen',
    normal: 'scrollnav-item-normal',
    selected: 'scrollnav-item-hover'
  };

  var behaviors;
  if (builderVideoPage.buildData.navbarType == 'popUp') {
    behaviors = {
      popOut: 'bottom',
      orientation: 'horizontal'
    };
  } else if (builderVideoPage.buildData.navbarType == 'fade') {
    behaviors = {
      fade: true,
      orientation: 'horizontal'
    };
  }

  var sidenavParams = {
    createParams: {
      containerId: 'scrollnav',
      styles: styles,
      keyController: builderVideoPage.keyController_,
      layerNames: builderVideoPage.layerName_
    },
    behaviors: behaviors
  };
  builderVideoPage.scrollnavControl_ = new gtv.jq.SideNavControl(sidenavParams);

  var showParams = {
    topParent: scrollnavHolder,
    itemsGenerator: navItemsGenerator
  };
  builderVideoPage.scrollnavControl_.showControl(showParams);

  if (builderVideoPage.buildData.navbarType == 'fade') {
    var windowHeight = $(window).height();
    scrollnavHolder.css('top', ((windowHeight * 3) / 4) + 'px');
  }
};

/**
 * Displays the specified video. If not already done, creates a Video Control
 * to display the video.
 * @param {string} url [Future support for HTML5 video]
 * @param {string} id Id of the YouTube video to play.
 * @private
 */
gtv.jq.BuilderVideoPage.prototype.showVideo_ = function(url, id) {
  var builderVideoPage = this;

  if (!builderVideoPage.showDiv) {
    builderVideoPage.showDiv = $('<div></div>').addClass('scrollnav-show-div');
    builderVideoPage.topParent.append(builderVideoPage.showDiv);

    var styles = {
      item: 'player-item-style',
      itemDiv: 'player-item-div-style',
      row: 'player-row-style',
      selected: 'player-item-hover'
    };

    /**
     * Called from VideoControl to handle 'next' event.
     * @param {number} videoId The ID of the currently playing video.
     * @return {number} The ID of the next video to play.
     */
    function nextVideo(videoId) {
      for (var i = 0; i < builderVideoPage.items.length - 1; i++) {
        if (builderVideoPage.items[i].data('id') == videoId) {
          builderVideoPage.videoControl.loadVideo(
              builderVideoPage.items[i + 1].data('id'));
        }
      }
    }

    /**
     * Called from VideoControl to handle 'previous' event.
     * @param {number} videoId The ID of the currently playing video.
     * @return {number} The ID of the previous video to play.
     */
    function previousVideo(videoId) {
      for (var i = 1; i < builderVideoPage.items.length; i++) {
        if (builderVideoPage.items[i].data('id') == videoId) {
          builderVideoPage.videoControl.loadVideo(
              builderVideoPage.items[i - 1].data('id'));
        }
      }
    }

    // Callbacks for done, next, and previous events from the VideoControl,
    // called when a video is done playing, the user chooses the 'next' button,
    // and the user chooses the 'previous' button, respectively.
    var callbacks = {
      done: nextVideo,
      next: nextVideo,
      previous: previousVideo
    };

    // Display the play, pause, next and previous buttons on the control.
    var buttons = {
      play: 'Play',
      pause: 'Pause',
      next: 'Next',
      previous: 'Previous'
    };

    var videoParams = {
      createParams: {
        containerId: 'video-container',
        styles: styles,
        keyController: builderVideoPage.keyController_,
        layerNames: builderVideoPage.layerNames_
      },
      width: builderVideoPage.buildData.playerWidth,
      height: builderVideoPage.buildData.playerHeight,
      callbacks: callbacks,
      playerId: 'ytplayer',
      videoId: id,
      buttons: buttons
    };
    builderVideoPage.videoControl = new gtv.jq.VideoControl(videoParams);

    var showParams = {
      topParent: builderVideoPage.showDiv
    };
    builderVideoPage.videoControl.showControl(showParams);
  } else {
    builderVideoPage.videoControl.loadVideo(id);
  }
};
