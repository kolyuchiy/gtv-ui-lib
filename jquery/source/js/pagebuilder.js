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
 * 
 */

var gtv = gtv || {
  jq: {}
};


/**
 * BuildParams class holds parameters used to create the page.
 * @constructor
 */
gtv.jq.BuildParams = function() {
};

/**
 * The key controller the page should use.
 * @type gtv.jq.KeyController
 */
gtv.jq.BuildParams.prototype.keyController = null;

/**
 * Array of layer names the page should exist on. If not supplied, uses
 * the default layer.
 * @type Array.<string>
 */
gtv.jq.BuildParams.prototype.layerNames = null;

/**
 * Array of names, in hierarchical order, used to
 * locate the array of entries in the feed.
 * @type Array.<string>
 */
gtv.jq.BuildParams.prototype.feedItemsSeeker = null;

/**
 * Array of names, in hierarchical order starting
 * from the entry, used to locate thumbnail URL.
 * @type Array.<string>
 */
gtv.jq.BuildParams.prototype.feedThumbSeeker = null;

/**
 * Array of names, in hierarchical order starting
 * from the entry, used to locate the photo URL.
 * @type Array.<string>
 */
gtv.jq.BuildParams.prototype.feedContentSeeker = null;

/**
 * Size of the player in pixels. Width defaults to 1024. If not supplied,
 * height it calculated from the player width assuming a 16:10 ratio.
 * @type gtv.jq.Size
 */
gtv.jq.BuildParams.prototype.size = null;

/**
 * Height in pixels of the thumbnails.
 * @type number
 */
gtv.jq.BuildParams.prototype.thumbnailHeight = null;

/**
 * The type of SideNav to use, one of 'popUp' or 'fade'.
 * @type string
 */
gtv.jq.BuildParams.prototype.navbarType = null;

/**
 * Delay, in seconds, between photos. Defaults to 4.
 * @type number
 */
gtv.jq.BuildParams.prototype.slideshowSpeed = null;


/**
 * BuilderPhotoPage class. This creates a complete page for viewing a slideshow
 * of photos. Provided with an RSS feed in JSONP format and references to
 * the thumbnails and full-size images in that feed, this will build a
 * photo control to display a full-size image, a row of thumbnails to display
 * all the images in the feed, and the key zones to handle movement between
 * them.
 * @param {gtv.jq.BuildParams} buildParams Initialization values for the photo
 * page.
 * @constructor
 */
gtv.jq.BuilderPhotoPage = function(buildParams) {
  this.params_ = buildParams;
};

/**
 * Holds the instance of the RowControl used for the thumbnail row display.
 * @type gtv.jq.RowControl
 * @private
 */
gtv.jq.BuilderPhotoPage.prototype.thumbControl_ = null;

/**
 * Data used to build the page and its controls.
 * @type gtv.jq.BuildParams
 * @private
 */
gtv.jq.BuilderPhotoPage.prototype.params_ = null;

/**
 * Holds the instance of the SideNavControl that holds the thumbnail row.
 * @type gtv.jq.SideNavControl
 * @private
 */
gtv.jq.BuilderPhotoPage.prototype.scrollnavControl_ = null;

/**
 * Holds the instance of the PhotoControl that displays the selected photo.
 * @type gtv.jq.PhotoControl
 * @private
 */
gtv.jq.BuilderPhotoPage.prototype.photoControl_ = null;

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
 */
gtv.jq.BuilderPhotoPage.prototype.makePage = function(topParent) {
  var builderPhotoPage = this;
  builderPhotoPage.topParent = topParent;

  builderPhotoPage.params_.size.width =
      builderPhotoPage.params_.size.width || 1024;

  // If not supplied, height is calculated as a 10:16 ratio of the width.
  builderPhotoPage.params_.size.height =
      builderPhotoPage.params_.size.height ||
          (builderPhotoPage.params_.size.width * 10 / 16);

  builderPhotoPage.params_.thumbnailHeight =
      builderPhotoPage.params_.thumbnailHeight || 100;

  builderPhotoPage.params_.navbarType =
      builderPhotoPage.params_.navbarType || 'popUp';

  builderPhotoPage.params_.slideshowSpeed =
      builderPhotoPage.params_.slideshowSpeed || 4;

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
    for (var i = 0; i < builderPhotoPage.params_.feedThumbSeeker.length; i++) {
      thumbs = thumbs[builderPhotoPage.params_.feedThumbSeeker[i]];
      if (!thumbs) {
        return null;
      }
    }

    content = entry;
    for (i = 0; i < builderPhotoPage.params_.feedContentSeeker.length; i++) {
      content = content[builderPhotoPage.params_.feedContentSeeker[i]];
      if (!content) {
        return null;
      }
    }

    if (!content || !thumbs) {
      return null;
    }

    var item = $('<img></img>')
      .css({
         height: builderPhotoPage.params_.thumbnailHeight + 'px',
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

  gtv.jq.GtvCore.processJsonpFeed(builderPhotoPage.params_.feed,
                                  makeItem,
                                  makeRow,
                                  builderPhotoPage.params_.feedItemsSeeker);
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
          keyController: builderPhotoPage.params_.keyController,
          choiceCallback: enterCallback,
          layerNames: builderPhotoPage.params_.layerNames
        };
        builderPhotoPage.thumbControl_ = new gtv.jq.RowControl(createParams);

        var showParams = {
          topParent: scrollRowContainer,
          contents: {
            items: items
          }
        };
        builderPhotoPage.thumbControl_.showControl(showParams);
        builderPhotoPage.thumbControl_.enableNavigation();

        var scrollRow = scrollRowContainer.children('#row-container');
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
  if (builderPhotoPage.params_.navbarType == 'popUp') {
    behaviors = {
      popOut: 'bottom',
      orientation: 'horizontal'
    };
  } else if (builderPhotoPage.params_.navbarType == 'fade') {
    behaviors = {
      fade: true,
      orientation: 'horizontal'
    };
  }

  var sidenavParams = {
    createParams: {
      containerId: 'scrollnav',
      styles: styles,
      keyController: builderPhotoPage.params_.keyController,
      layerNames: builderPhotoPage.params_.layerNames
    },
    behaviors: behaviors
  };
  builderPhotoPage.scrollnavControl_ =
      new gtv.jq.SideNavControl(sidenavParams);

  var showParams = {
    topParent: scrollnavHolder,
    contents: {
      itemsGenerator: navItemsGenerator
    }
  };
  builderPhotoPage.scrollnavControl_.showControl(showParams);

  if (builderPhotoPage.params_.navbarType == 'fade') {
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
        keyController: builderPhotoPage.params_.keyController,
        layerNames: builderPhotoPage.params_.layerNames
      },
      size: builderPhotoPage.params_.size,
      callbacks: callbacks,
      photoUrl: builderPhotoPage.items[index].data('url'),
      buttons: buttons,
      slideshowSpeed: builderPhotoPage.params_.slideshowSpeed
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
 * BuilderVideoPage class. This creates a complete page for viewing a slideshow
 * of videos. Provided with an RSS feed in JSONP format and references to
 * the thumbnails and YouTube videos in that feed, this will build a
 * video control to play the video, a row of thumbnails to display the video
 * thumbnails in the feed, and the key zones to handle movement between them.
 * @param {gtv.jq.BuildParams} buildParams
 * @constructor
 */
gtv.jq.BuilderVideoPage = function(buildParams) {
  this.params_ = buildParams;
};

/**
 * Holds the instance of the RowControl used for the thumbnail row display.
 * @type gtv.jq.RowControl
 * @private
 */
gtv.jq.BuilderVideoPage.thumbControl_ = null;

/**
 * Holds the instance of the SideNavControl that holds the thumbnail row.
 * @type gtv.jq.SideNavControl
 * @private
 */
gtv.jq.BuilderVideoPage.scrollnavControl_ = null;

/**
 * Holds the instance of the PhotoControl that displays the selected photo.
 * @type gtv.jq.PhotoControl
 * @private
 */
gtv.jq.BuilderVideoPage.photoControl_ = null;

/**
 * Data used to build the page and its controls.
 * @type gtv.jq.BuildParams
 * @private
 */
gtv.jq.BuilderVideoPage.prototype.params_ = null;

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
 */
gtv.jq.BuilderVideoPage.prototype.makePage = function(topParent) {
  var builderVideoPage = this;
  builderVideoPage.topParent = topParent;

  builderVideoPage.params_.size.width =
      builderVideoPage.params_.size.width || 1024;

  // If not supplied, height is calculated as a 10:16 ratio of the width.
  builderVideoPage.params_.size.height =
      builderVideoPage.params_.size.height ||
          (builderVideoPage.params_.size.width * 10 / 16);

  builderVideoPage.params_.thumbnailHeight =
      builderVideoPage.params_.thumbnailHeight || 100;

  builderVideoPage.params_.navbarType =
      builderVideoPage.params_.navbarType || 'popUp';

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
    for (var i = 0; i < builderVideoPage.params_.feedThumbSeeker.length; i++) {
      thumbs = thumbs[builderVideoPage.params_.feedThumbSeeker[i]];
      if (!thumbs) {
        return null;
      }
    }

    content = entry;
    for (i = 0; i < builderVideoPage.params_.feedContentSeeker.length; i++) {
      content = content[builderVideoPage.params_.feedContentSeeker[i]];
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
         height: builderVideoPage.params_.thumbnailHeight + 'px',
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

  gtv.jq.GtvCore.processJsonpFeed(builderVideoPage.params_.feed,
                                  makeItem,
                                  makeRow,
                                  builderVideoPage.params_.feedItemsSeeker);

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
          keyController: builderVideoPage.params_.keyController,
          choiceCallback: enterCallback,
          laterNames: builderVideoPage.params_.layerNames
        };
        builderVideoPage.thumbControl_ = new gtv.jq.RowControl(createParams);

        var showParams = {
          topParent: scrollRowContainer,
          contents: {
            items: items
          }
        };
        builderVideoPage.thumbControl_.showControl(showParams);
        builderVideoPage.thumbControl_.enableNavigation();

        var scrollRow = scrollRowContainer.children('#row-container');
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
  if (builderVideoPage.params_.navbarType == 'popUp') {
    behaviors = {
      popOut: 'bottom',
      orientation: 'horizontal'
    };
  } else if (builderVideoPage.params_.navbarType == 'fade') {
    behaviors = {
      fade: true,
      orientation: 'horizontal'
    };
  }

  var sidenavParams = {
    createParams: {
      containerId: 'scrollnav',
      styles: styles,
      keyController: builderVideoPage.params_.keyController,
      layerNames: builderVideoPage.params_.layerName
    },
    behaviors: behaviors
  };
  builderVideoPage.scrollnavControl_ = new gtv.jq.SideNavControl(sidenavParams);

  var showParams = {
    topParent: scrollnavHolder,
    contents: {
      itemsGenerator: navItemsGenerator
    }
  };
  builderVideoPage.scrollnavControl_.showControl(showParams);

  if (builderVideoPage.params_.navbarType == 'fade') {
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
        keyController: builderVideoPage.params_.keyController,
        layerNames: builderVideoPage.params_.layerNames
      },
      size: builderVideoPage.params_.size,
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
