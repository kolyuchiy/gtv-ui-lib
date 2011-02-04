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
 * @fileoverview Classes for PhotoControl, VideoControl, PlayerCallbacks
 * PlayerButtons, PlaybackControl_, VideoParams, PhotoParams.
 *
 * Two controls are implemented here for the display/playback of photos
 * and videos. The controls provide support for optional play/pause/next/prev
 * functionality, handle key navigatation between these buttons, and
 * handle media keys for them as well.
 * 
 */

var gtv = gtv || {
  jq: {}
};


/**
 * PlayerCallbacks class holds set of callbacks implemented by client.
 * @param {gtv.jq.PlayerCallbacks} opt_initial Optional initial values.
 * @constructor
 */
gtv.jq.PlayerCallbacks = function(opt_initial) {
  var initial = opt_initial || {};

  this.play = initial.play || function() {
    };
  this.pause = initial.pause || function() {
    };
  this.next = initial.next || function() {
    };
  this.previous = initial.previous || function() {
    };
  this.done = initial.done || function() {
    };
};

/**
 * Callback for play event.
 * @type {Function(mediaId)}
 */
gtv.jq.PlayerCallbacks.prototype.play;

/**
 * Callback for pause event.
 * @type {Function(mediaId)}
 */
gtv.jq.PlayerCallbacks.prototype.pause;

/**
 * Callback for next event.
 * @type {Function(mediaId)}
 */
gtv.jq.PlayerCallbacks.prototype.next;

/**
 * Callback for previous event.
 * @type {Function(mediaId)}
 */
gtv.jq.PlayerCallbacks.prototype.previous;

/**
 * Callback for done event.
 * @type {Function(mediaId)}
 */
gtv.jq.PlayerCallbacks.prototype.done;


/**
 * PlayerButtons describes the buttons used for playback control.
 * @param {gtv.jq.PlayerButtons} opt_initial Optional initial values.
 * @constructor
 */
gtv.jq.PlayerButtons = function(opt_initial) {
  var initial = opt_initial || {};

  this.play = initial.play;
  this.playImg = initial.playImg;
  this.pause = initial.pause;
  this.pauseImg = initial.pauseImg;
  this.next = initial.next;
  this.nextImg = initial.nextImg;
  this.previous = initial.previous;
  this.previousImg = initial.previousImg;
};

/**
 * The text for the play button. If this and playImg are null, no play button
 * will be shown.
 * @type {string}
 */
gtv.jq.PlayerButtons.prototype.play;

/**
 * The img url for the play button. If this and play are null, no play button
 * will be shown.
 * @type {string}
 */
gtv.jq.PlayerButtons.prototype.playImg;

/**
 * The text for the pause button. If this and pauseImg are null, no pause button
 * will be shown.
 * @type {string}
 */
gtv.jq.PlayerButtons.prototype.pause;

/**
 * The img url for the pause button. If this and pause are null, no pause button
 * will be shown.
 * @type {string}
 */
gtv.jq.PlayerButtons.prototype.pauseImg;

/**
 * The text for the next button. If this and nextImg are null, no next button
 * will be shown.
 * @type {string}
 */
gtv.jq.PlayerButtons.prototype.next;

/**
 * The img url for the next button. If this and next are null, no next button
 * will be shown.
 * @type {string}
 */
gtv.jq.PlayerButtons.prototype.nextImg;

/**
 * The text for the prev button. If this and prevImg are null, no prev button
 * will be shown.
 * @type {string}
 */
gtv.jq.PlayerButtons.prototype.previous;

/**
 * The img url for the prev button. If this and prev are null, no prev button
 * will be shown.
 * @type {string}
 */
gtv.jq.PlayerButtons.prototype.previousImg;


/**
 * Static class for methods used by both PhotoControl and VideoControl
 * @constructor
 * @private
 */
gtv.jq.PlaybackControl_ = function() {
};

/**
 * Adds the specified set of playback buttons with the supplied styles
 * to the supplied container.
 * @param {Element} container The container to which the buttons will be added.
 * @param {Styles} styles CSS classes for button styles: row, itemDiv, item.
 * @param {PlayerButtons} buttons The buttons to create: play, pause, next,
 *  previous.
 * @private
 */
gtv.jq.PlaybackControl_.addPlaybackButtons = function(container,
                                                      styles,
                                                      buttons) {
  var buttonText = {
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    previous: 'Previous'
  };

  if (buttons) {
    var itemDiv;
    var button;

    styles.row = styles.row || '';
    styles.itemDiv = styles.itemDiv || '';
    styles.item = styles.item || '';

    var controlsDiv = $('<div></div>')
      .addClass('player-row ' + styles.row);
    container.append(controlsDiv);

    $.each(buttonText,
           function(key, value) {
             if (buttons[key]) {
               itemDiv = $('<div></div>')
                 .addClass('player-item-div ' + styles.itemDiv);
               controlsDiv.append(itemDiv);

               var buttonText = buttons[key] || value;
               button = $('<div></div>')
                 .addClass('player-item ' + styles.item)
                 .text(buttonText)
                 .data('action', key);
               itemDiv.append(button);
             } else if (buttons[key + 'Img']) {
               itemDiv = $('<div></div>')
                 .addClass('player-item-div ' + styles.itemDiv);
               controlsDiv.append(itemDiv);

               var buttonSrc = buttons[key];
               button = $('<img></img>')
                 .addClass('player-item ' + styles.item)
                 .attr('src', buttonSrc)
                 .data('action', key);
               itemDiv.append(button);
             }
           });

    var windowWidth = $(window).width();
    var controlsOffset = controlsDiv.offset();
    controlsDiv.css({
      left: ((windowWidth / 2) -
          (controlsDiv.width() / 2) - controlsOffset.left) + 'px',
      top: container.outerHeight() + 'px'
    });
  }
};

/**
 * Event handler for playback button choice events.
 * @param {(VideoControl|PhotoControl)} control The control class being handled.
 * @param {Element} item The button that received the event.
 * @private
 */
gtv.jq.PlaybackControl_.handleButton = function(control, item) {
  var action = item.data('action');
  if (action == 'play') {
    control.play();
  } else if (action == 'pause'){
    control.pause();
  } else if (action == 'next'){
    control.next_();
  } else if (action == 'previous'){
    control.previous_();
  }

  return { status: 'skip' };
};

/**
 * Configures the key controller layer with event handlers for the various
 * media keys.
 * @param {(VideoControl|PhotoControl)} control The control being configured.
 * @param {KeyController} keyController The key controller instance that the
 *     control is using.
 * @param {?string} layerName The name of the key controller layer the control
 *     is using. If not supplied, the key controller default is used.
 * @private
 */
gtv.jq.PlaybackControl_.setMediaKeyMapping = function(control,
                                                      keyController,
                                                      layerName) {
  var layerKeyMapping = {
    32: function(selectedItem, newSelected) {  // space
      control.playPause();
      return new gtv.jq.Selection('skip');
    },
    179: function(selectedItem, newSelected) {  // play/pause
      control.playPause();
      return new gtv.jq.Selection('skip');
    },
    176: function(selectedItem, newSelected) {  // skip forward
      control.next_();
      return new gtv.jq.Selection('skip');
    },
    177: function(selectedItem, newSelected) {  // skip backward
      control.previous_();
      return new gtv.jq.Selection('skip');
    }
  };

  keyController.setLayerKeyMapping(layerKeyMapping, layerName);
};


/**
 * VideoParams class. Holds values for initialized a VideoControl
 * @param {gtv.jq.VideoParams} opt_params Optional initial values.
 * @constructor
 */
gtv.jq.VideoParams = function(opt_params) {
  var params = opt_params || {};

  this.createParams = new gtv.jq.CreationParams(params.createParams);

  params.size = params.size || {};
  this.size = new gtv.jq.Size(params.size.width, params.size.height);

  this.callbacks = new gtv.jq.PlayerCallbacks(params.callbacks);

  this.playerId = params.playerId || 'player1';
  this.videoId = params.videoId;

  this.buttons = new gtv.jq.PlayerButtons(params.buttons);
};

/**
 * Creation params for the Video control.
 * @type {CreationParams}
 */
gtv.jq.VideoParams.prototype.createParams;

/**
 * The size in pixels of the control.
 * @type {gtv.jq.Size}
 */
gtv.jq.VideoParams.prototype.size;

/**
 Callbacks for various player
 *     events. These include: play, pause, next, previous.
 * @type {gtv.jq.PlayerCallbacks}
 */
gtv.jq.VideoParams.prototype.callbacks;

/**
 * playerId of the YouTube player. If not supplied, defaults to 'player1'.
 * @type {?string}
 */
gtv.jq.VideoParams.prototype.playerId;

/**
 * videoId of the YouTube video to start with (plays immediately).
 * @type {?string}
 */
gtv.jq.VideoParams.prototype.videoId;

/**
 * Set of buttons to display under player, any of:
 *     play, pause, next, previous.
 * @type {?PlayerButtons}
 */
gtv.jq.VideoParams.prototype.buttons;


/**
 * VideoControl class. The Video control plays back YouTube videos from a feed,
 * automatically playing each video in turn, allowing the user to skip videos
 * or select a different video from a row control showing video thumbnails.
 * @param {gtv.jq.VideoParams} videoParams Creation values for the control.
 * @constructor
 */
gtv.jq.VideoControl = function(videoParams) {
  this.params_ = new gtv.jq.VideoParams(videoParams);
};

/**
 * Array of players that have registered with the manager class.
 * @type {Array.<player>}
 * @private
 */
gtv.jq.VideoControl.players = [];

/**
 * Static method to register a new VideoControl instance with a YouTube player.
 * @param {VideoControl} control VideoControl instance to register.
 * @param {string} playerId Id of the YouTube player this instance controls.
 * @private
 */
gtv.jq.VideoControl.addPlayer_ = function(control, playerId) {
  gtv.jq.VideoControl.players.push({
    player: control,
    id: playerId
  });
};

/**
 * Static method returns an instance of a VideoControl given a YouTube id.
 * @param {string} playerId Id of the YouTube player.
 * @return {VideoControl} Instance of the VideoControl for the given id.
 * @private
 */
gtv.jq.VideoControl.findPlayer_ = function(playerId) {
  for (var i = 0; i < gtv.jq.VideoControl.players.length; i++) {
    if (gtv.jq.VideoControl.players[i].id == playerId) {
      return gtv.jq.VideoControl.players[i].player;
    }
  }

  return null;
};

/**
 * Static method unregisters a playerId with the mananger.
 * @param {string} playerId Id of the YouTube player to unregister.
 * @private
 */
gtv.jq.VideoControl.removePlayer_ = function(playerId) {
  for (var i = 0; i < gtv.jq.VideoControl.players.length; i++) {
    if (gtv.jq.VideoControl.players[i].id == playerId) {
      gtv.jq.VideoControl.players.splice(i, 1);
      break;
    }
  }
};

/**
 * Static method generates a function to call the error handler of a specific
 * VideoControl instance.
 * @param {string} Id of the YouTube player.
 * @return {function(error)} Function that calls an instance's error handler.
 * @private
 */
gtv.jq.VideoControl.onError_ = function(playerId) {
  var videoControl = gtv.jq.VideoControl.findPlayer_(playerId);

  return function(error) {
    videoControl.onError(error);
  };
};

/**
 * Static method generates a function to call the state change handler of a
 * VideoControl instance.
 * @param {string} Id of the YouTube player.
 * @return {function(error)} Function that calls an instance's state change
 *     handler.
 * @private
 */
gtv.jq.VideoControl.onStateChange_ = function(playerId) {
  var videoControl = gtv.jq.VideoControl.findPlayer_(playerId);

  return function(state) {
    videoControl.onStateChange_(state);
  };
};

/**
 * Global function called by the YouTube player when it has finished
 * initializing. Adds event listeners to the player that will call a specific
 * VideoControl instance.
 * @param {string} playerId The Id of the player that has initialized.
 */
function onYouTubePlayerReady(playerId) {
  var videoControl = gtv.jq.VideoControl.findPlayer_(playerId);

  var ytplayer = document.getElementById(playerId);
  videoControl.player_ = ytplayer;

  ytplayer.addEventListener(
      'onError',
      'gtv.jq.VideoControl.onError_("' + playerId + '")');
  ytplayer.addEventListener(
      'onStateChange',
      'gtv.jq.VideoControl.onStateChange_("' + playerId + '")');
}

/**
 * Parent element containing the control elements.
 * @type {jQuery.Element}
 * @private
 */
gtv.jq.VideoControl.prototype.container_ = null;

/**
 * Holds the params the control was created with.
 * @type {CreationParams}
 * @private
 */
gtv.jq.VideoControl.prototype.params_ = null;

/**
 * Holds the params for showing the control.
 * @type {ShowParams}
 * @private
 */
gtv.jq.VideoControl.prototype.showParams_ = null;

/**
 * Key controller behavior zone for this control.
 * @type {KeyBehaviorZone}
 * @private
 */
gtv.jq.VideoControl.prototype.behaviorZone_ = null;

/**
 * Removes a video control from its container, unregisters its player, and
 * removes its key control zone.
 */
gtv.jq.VideoControl.prototype.deleteControl = function() {
  var videoControl = this;

  gtv.jq.VideoControl.removePlayer_(videoControl.playerId_);
  videoControl.params_.createParams.keyController.removeBehaviorZone(
    videoControl.behaviorZone_);
  videoControl.container_.remove();
};

/**
 * Creates a new VideoControl with the specified buttons and adds it to a
 * container on the page.
 * @param {gtv.jq.ShowParams} showParams Params for creating the control.
 */
gtv.jq.VideoControl.prototype.showControl = function(showParams) {
  var videoControl = this;
  videoControl.showParams_ = new gtv.jq.ShowParams(showParams);

  var container = $('<div></div>')
    .addClass('video-container')
    .attr('id', videoControl.params_.createParams.containerId);
  videoControl.showParams_.topParent.append(container);

  var player = $('<div></div>')
    .css('position', 'absolute')
    .attr('id', 'playerContainer');
  container.append(player);

  var windowWidth = $(window).width();
  var containerOffset = container.offset();
  container.css({
    left: ((windowWidth / 2) - (videoControl.params_.size.width / 2)) + 'px',
    width: videoControl.params_.size.width + 'px',
    height: videoControl.params_.size.height + 'px'
  });

  videoControl.container_ = container;
  videoControl.videoId_ = videoControl.params_.videoId;

  gtv.jq.PlaybackControl_.addPlaybackButtons(
    videoControl.container_,
    videoControl.params_.createParams.styles,
    videoControl.params_.buttons);

  var params = {
    allowScriptAccess: 'always'
  };
  var atts = {
    id: videoControl.params_.playerId,
    'class': 'video-player-container'
  };

  gtv.jq.VideoControl.addPlayer_(videoControl, videoControl.params_.playerId);

  swfobject.embedSWF(
      'http://www.youtube.com/apiplayer' +
          '?enablejsapi=1&playerapiid=' + videoControl.params_.playerId,
      'playerContainer',
      videoControl.params_.size.width,
      videoControl.params_.size.height,
      '8', null, null,
      params, atts);

  var navSelectors = {
    item: '.player-item',
    itemParent: '.player-item-div'
  };

  var selectionClasses = {
    basic: videoControl.params_.createParams.styles.selected
  };

  var keyMapping = {
    13: function(item) {
      return gtv.jq.PlaybackControl_.handleButton(videoControl, item);
    }
  };

  // Configure gtv.jq.KeyActions object.
  var actions = {
    click: function(item) {
      return gtv.jq.PlaybackControl_.handleButton(videoControl, item);
    }
  };

  videoControl.behaviorZone_ =
      new gtv.jq.KeyBehaviorZone({
        containerSelector: '#' + videoControl.params_.createParams.containerId,
        keyMapping: keyMapping,
        actions: actions,
        navSelectors: navSelectors,
        selectionClasses: selectionClasses
      });

  videoControl.params_.createParams.keyController.addBehaviorZone(
    videoControl.behaviorZone_,
    true,
    videoControl.params_.createParams.layerNames);

  gtv.jq.PlaybackControl_.setMediaKeyMapping(
    videoControl,
    videoControl.params_.createParams.keyController,
    videoControl.params_.createParams.layerNames);
};

/**
 * Loads the video with the specified video id.
 * @param {string} videoId The ID of the YouTube video to play.
 */
gtv.jq.VideoControl.prototype.loadVideo = function(videoId) {
  var videoControl = this;

  if (videoControl.player_) {
    videoControl.videoId_ = videoId;
    videoControl.player_.loadVideoById(videoId);
  }
};

/**
 * Toggles the play/pause state of a video.
 */
gtv.jq.VideoControl.prototype.playPause = function() {
  var videoControl = this;

  if (videoControl.player) {
    var state = videoControl.player.getPlayerState();
    if (state == 1) {
      videoControl.pause();
    } else if (state == 2) {
      videoControl.play();
    }
  }
};

/**
 * Starts playing the current video.
 * Makes a callback to callbacks.play, if supplied, which returns true if
 * it wishes to prevent the video from playing.
 */
gtv.jq.VideoControl.prototype.play = function() {
  var videoControl = this;

  if (videoControl.player_) {
    var override = false;
    if (videoControl.params_.callbacks.play) {
      override = videoControl.params_.callbacks.play(videoControl.videoId_);
    }

    if (!override) {
      videoControl.player_.playVideo();
    }
  }
};

/**
 * Pauses the current video.
 * Makes a callback to callbacks.pause, if supplied, which returns true if
 * it wishes to prevent the video from pausing.
 */
gtv.jq.VideoControl.prototype.pause = function() {
  var videoControl = this;

  if (videoControl.player_) {
    var override = false;
    if (videoControl.params_.callbacks.pause) {
      override = videoControl.params_.callbacks.pause(videoControl.videoId_);
    }

    if (!override) {
      videoControl.player_.pauseVideo();
    }
  }
};

/**
 * Makes a callback to callbacks.next with the id of the currently playing video
 * @private
 */
gtv.jq.VideoControl.prototype.next_ = function() {
  var videoControl = this;

  if (videoControl.player_ && videoControl.params_.callbacks.next) {
    videoControl.params_.callbacks.next(videoControl.videoId_);
  }
};

/**
 * Makes a callback to callbacks.previous with the id of the currently playing
 * video
 * @private
 */
gtv.jq.VideoControl.prototype.previous_ = function() {
  var videoControl = this;

  if (videoControl.player_ && videoControl.params_.callbacks.previous) {
    videoControl.params_.callbacks.previous(videoControl.videoId_);
  }
};

/**
 * Called by the VideoControl manager, which in turn received the event from
 * the YouTube player. Signals that the playing state of the video has changed.
 * Calls callbacks.done if the video state is ended.
 * @param {number} state The new state of the player.
 * @private
 */
gtv.jq.VideoControl.prototype.onStateChange_ = function(state) {
  var videoControl = this;

  if (state == -1) {
    videoControl.player_.loadVideoById(videoControl.videoId_);
  } else if (state == 0 && videoControl.params_.callbacks.done) {
    videoControl.params_.callbacks.done(videoControl.videoId_);
  }
};


/**
 * PhotoParams class. Holds values for initialized a PhotoControl
 * @params {gtv.jq.PhotoParams} opt_params Optional initial values.
 * @constructor
 */
gtv.jq.PhotoParams = function(opt_params) {
  var params = opt_params || {};

  this.createParams = new gtv.jq.CreationParams(params.createParams);

  params.size = params.size || {};
  this.size = new gtv.jq.Size(params.size.width, params.size.height);

  this.callbacks = new gtv.jq.PlayerCallbacks(params.callbacks);
  this.photoUrl = params.photoUrl;
  this.buttons = new gtv.jq.PlayerButtons(params.buttons);
  this.slideshowSpeed = params.slideshowSpeed || 4;
};

/**
 * Creation params for the Photo control.
 * @type {CreationParams}
 */
gtv.jq.PhotoParams.prototype.createParams;

/**
 * The size in pixels of the control.
 * @type {gtv.jq.Size}
 */
gtv.jq.PhotoParams.prototype.size;

/**
 Callbacks for various player
 *     events. These include: play, pause, next, previous.
 * @type {gtv.jq.PlayerCallbacks}
 */
gtv.jq.PhotoParams.prototype.callbacks;

/**
 * Url of the photo to display. If supplied begins
 *     the slideshow.
 * @type {?photoUrl}
 */
gtv.jq.PhotoParams.prototype.photoUrl;

/**
 * Set of buttons to display under player, any of:
 *     play, pause, next, previous.
 * @type {?PlayerButtons}
 */
gtv.jq.PhotoParams.prototype.buttons;

/**
 * Delay, in seconds, between each photo.
 * @param {?number}
 */
gtv.jq.PhotoParams.prototype.slideshowSpeed;


/**
 * PhotoControl class. The Photo control plays back photos from a feed,
 * either in slideshow mode or manual control. The user can select the photo
 * to view from a thumbnail on a row control.
 * @param {gtv.jq.PhotoParams} photoParams Creation params for the control.
 * @constructor
 */
gtv.jq.PhotoControl = function(photoParams) {
  this.params_ = new gtv.jq.PhotoParams(photoParams);
};

/**
 * Holds the params the control was created with.
 * @type {ControlParams}
 * @private
 */
gtv.jq.PhotoControl.prototype.params_ = null;

/**
 * Holds the params for showing the control.
 * @type {ShowParams}
 * @private
 */
gtv.jq.VideoControl.prototype.showParams_ = null;

/**
 * Parent element containing the roller elements.
 * @type {jQuery.Element}
 * @private
 */
gtv.jq.PhotoControl.prototype.container_ = null;

/**
 * Key controller behavior zone for this control.
 * @type {KeyBehaviorZone}
 * @private
 */
gtv.jq.PhotoControl.prototype.behaviorZone_ = null;

/**
 * Removes the photo control from its container and removes its key zone from
 * the key controller.
 */
gtv.jq.PhotoControl.prototype.deleteControl = function()
{
  var photoControl = this;

  photoControl.params_.createParams.keyController.removeBehaviorZone(
    photoControl.behaviorZone_);
  photoControl.container_.remove();
};

/**
 * Creates a new PhotoControl with the specified buttons and adds it to a
 * container on the page.
 * @param {gtv.jq.ShowParams} showParams Params for creating the control.
 */
gtv.jq.PhotoControl.prototype.showControl = function(showParams) {
  var photoControl = this;
  photoControl.showParams_ = new gtv.jq.ShowParams(showParams);

  var container = $('<div></div>')
    .addClass('photo-container')
    .attr('id', photoControl.params_.createParams.containerId)
    .css({
      position: 'absolute',
      left: $(window).width() / 2 - photoControl.params_.size.width / 2,
      width: photoControl.params_.size.width + 'px',
      height: photoControl.params_.size.height + 'px'
    });
  photoControl.showParams_.topParent.append(container);

  photoControl.player_ = $('<img></img>')
    .attr('height', photoControl.params_.size.height)
    .css('position', 'absolute')
    .attr('id', 'playerContainer');
  container.append(photoControl.player_);

  photoControl.container_ = container;
  photoControl.photoId_ = 0;

  gtv.jq.PlaybackControl_.addPlaybackButtons(
    photoControl.container_,
    photoControl.params_.createParams.styles,
    photoControl.params_.buttons);

  var navSelectors = {
    item: '.player-item',
    itemParent: '.player-item-div'
  };

  var selectionClasses = {
    basic: photoControl.params_.createParams.styles.selected
  };

  var keyMapping = {
    13: function(item) {
      return gtv.jq.PlaybackControl_.handleButton(photoControl, item);
    }
  };

  // Configure gtv.jq.KeyActions object.
  var actions = {
    click: function(item) {
      return gtv.jq.PlaybackControl_.handleButton(photoControl, item);
    }
  };

  photoControl.behaviorZone_ =
      new gtv.jq.KeyBehaviorZone({
        containerSelector: '#' + photoControl.params_.createParams.containerId,
        keyMapping: keyMapping,
        actions: actions,
        navSelectors: navSelectors,
        selectionClasses: selectionClasses
      });

  photoControl.params_.createParams.keyController.addBehaviorZone(
    photoControl.behaviorZone_,
    true,
    photoControl.params_.createParams.layerNames);

  gtv.jq.PlaybackControl_.setMediaKeyMapping(
    photoControl,
    photoControl.params_.createParams.keyController,
    photoControl.params_.createParams.layerNames);

  if (photoControl.params_.slideshowSpeed) {
    photoControl.paused_ = false;
  }
  photoControl.loadPhoto(photoControl.params_.photoUrl);
};

/**
 * Loads the specified photo and, once loaded, fades out any currently displayed
 * photo and fades in the new photo.
 * @param {string} url Url of the photo to display.
 */
gtv.jq.PhotoControl.prototype.loadPhoto = function(url) {
  var photoControl = this;

  clearTimeout(photoControl.playTimeout_);

  var newPlayer = $('<img></img>')
    .attr('height', photoControl.params_.size.height)
    .css('opacity', '0')
    .css('position', 'absolute')
    .attr('src', url);
  photoControl.container_.prepend(newPlayer);

  newPlayer.load(function(e) {
    photoControl.player_.css({
      '-webkit-transition': 'all 1s ease-in',
      'opacity': 0
    });
    photoControl.player_.get(0).addEventListener('webkitTransitionEnd',
                                                 fadedOut);

    var windowWidth = $(window).width();
    var containerOffset = photoControl.container_.offset();
    newPlayer.css('left', ((windowWidth / 2) -
        (newPlayer.width() / 2) - containerOffset.left) + 'px');

    function fadedOut(event) {
      photoControl.player_.remove();

      newPlayer.attr('id', 'playerContainer');
      photoControl.player_ = newPlayer;

      photoControl.player_.css({
        '-webkit-transition': 'all 1s ease-in',
        'opacity': 1
      });
      newPlayer.get(0).addEventListener('webkitTransitionEnd', fadedIn);

      function fadedIn(event) {
        photoControl.player_.get(0).removeEventListener('webkitTransitionEnd',
                                                        fadedIn);
        if (!photoControl.paused_) {
          clearTimeout(photoControl.playTimeout_);

          photoControl.playTimeout_ =
              setTimeout(function() {
                           photoControl.next_();
                         },
                         photoControl.params_.slideshowSpeed * 1000);
        }
      }
    }
  });
};

/**
 * Toggles the playing state of the slideshow.
 */
gtv.jq.PhotoControl.prototype.playPause = function() {
  var photoControl = this;

  if (photoControl.paused_) {
    photoControl.play();
  } else {
    photoControl.pause();
  }
};

/**
 * Starts playing the slideshow.
 */
gtv.jq.PhotoControl.prototype.play = function() {
  var photoControl = this;

  var override = false;
  if (photoControl.params_.callbacks.play) {
    override = photoControl.params_.callbacks.play();
  }

  if (!override) {
    photoControl.paused_ = false;
    clearTimeout(photoControl.playTimeout_);
    photoControl.playTimeout_ =
        setTimeout(function() {
                     photoControl.next_();
                   },
                   photoControl.params_.slideshowSpeed * 1000);
  }
};

/**
 * Pauses the slideshow.
 */
gtv.jq.PhotoControl.prototype.pause = function() {
  var photoControl = this;

  var override = false;
  if (photoControl.params_.callbacks.pause) {
    override = photoControl.params_.callbacks.pause();
  }

  if (!override) {
    photoControl.paused_ = true;
    clearTimeout(photoControl.playTimeout_);
  }
};

/**
 * Makes callbacks.next() callback to get the next photo URL, then loads it.
 * @private
 */
gtv.jq.PhotoControl.prototype.next_ = function() {
  var photoControl = this;
  var url;
  if (photoControl.params_.callbacks.next) {
    url = photoControl.params_.callbacks.next();
    if (url) {
      photoControl.loadPhoto(url);
    }
  }
  return url;
};

/**
 * Makes callbacks.previous() callback to retrieve the previous photo URL,
 * then loads it.
 * @private
 */
gtv.jq.PhotoControl.prototype.previous_ = function() {
  var photoControl = this;

  var url;
  if (photoControl.params_.callbacks.previous) {
    url = photoControl.params_.callbacks.previous();
    if (url) {
      photoControl.loadPhoto(url);
    }
  }
  return url;
};

