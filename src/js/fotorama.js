jQuery.Fotorama = function ($fotorama, opts) {
  $HTML = $HTML || $('html');
  $BODY = $BODY || $('body');

  $.Fotorama.$load = $.Fotorama.$load || $('<div class="' + loadClass + '"></div>').appendTo($BODY);

  var that = this,
      index = _size,
      stamp = new Date().getTime(),
      fotorama = $fotorama.addClass(_fotoramaClass + stamp)[0],
      data,
      dataFrameCount = 1,
      fotoramaData = $fotorama.data(),
      size,

      $style = $('<style></style>').insertBefore($fotorama),

      $anchor = $(div(hiddenClass)).insertBefore($fotorama),
      $wrap = $(div(wrapClass + ' ' + wrapNotReadyClass)),
      $stage = $(div(stageClass)).appendTo($wrap),
      stage = $stage[0],
      $stageShaft = $(div(stageShaftClass)).appendTo($stage),
      $stageFrame = $(),
      $arrPrev = $(div(arrClass + ' ' + arrPrevClass, div(arrArrClass))),
      $arrNext = $(div(arrClass + ' ' + arrNextClass, div(arrArrClass))),
      $arrs = $arrPrev.add($arrNext).appendTo($stage),
      $navWrap = $(div(navWrapClass)),
      $nav = $(div(navClass)).appendTo($navWrap),
      $navShaft = $(div(navShaftClass)).appendTo($nav),
      $navFrame,
      $navDotFrame = $(),
      $navThumbFrame = $(),
      stageFrameKey = '$stageFrame',
      navFrameKey,
      navDotFrameKey = '$navDotFrame',
      navThumbFrameKey = '$navThumbFrame',

      stageShaftData = $stageShaft.data(),
      navShaftData = $navShaft.data(),

      $thumbBorder = $(div(thumbBorderClass)).appendTo($navShaft),

      $fullscreenIcon = $(div(fullscreenIconClass)),
      $videoPlay = $(div(videoPlayClass)),
      $videoClose = $(div(videoCloseClass)).appendTo($stage),

      $videoPlaying,

      activeIndex = false,
      activeFrame,
      repositionIndex,
      dirtyIndex,
      lastActiveIndex,
      prevIndex,
      nextIndex,
      startIndex = false,

      o_loop,
      o_nav,
      o_navTop,
      o_allowFullScreen,
      o_nativeFullScreen,
      o_fade,
      o_thumbSide,
      o_thumbSide2,
      lastOptions = {},

      measures = {},
      measuresSetFLAG,

      stageShaftTouchTail = {},
      navShaftTouchTail = {},

      scrollTop,
      scrollLeft,
      showedFLAG,
      pausedAutoplayFLAG,
      stoppedAutoplayFLAG,
      wrapAppendedFLAG,

      measuresStash;

  $wrap[stageFrameKey] = $(div(stageFrameClass));
  $wrap[navThumbFrameKey] = $(div(navFrameClass + ' ' + navFrameThumbClass, div(thumbClass)));
  $wrap[navDotFrameKey] = $(div(navFrameClass + ' ' + navFrameDotClass, div(dotClass)));


  if (CSS3) {
    $wrap.addClass(wrapCss3Class);
  }

  fotoramaData.fotorama = this;
  that.options = opts;
  _size++;

  function checkForVideo () {
    $.each(data, function (i, dataFrame) {
      if (!dataFrame.i) {
        dataFrame.i = dataFrameCount++;
        var video = findVideoId(dataFrame.video, true);
        if (video) {
          var thumbs = {};
          dataFrame.video = video;
          if (!dataFrame.img && !dataFrame.thumb) {
            thumbs = getVideoThumbs(dataFrame, data, that);
            ////console.log('thumbs', thumbs)
          } else {
            dataFrame.thumbsReady = true;
          }
          updateData(data, {img: thumbs.img, thumb: thumbs.thumb}, dataFrame.i, that);
        }
      }
    });
  }

  function setData () {
    data = that.data = data || getDataFromHtml($fotorama);
    size = that.size = data.length;

    checkForVideo();

    activeIndex = limitIndex(activeIndex);
    navAppend.ok = false;

    if (!size) {
      //that.destroy();
    } else if (!wrapAppendedFLAG) {
      // Заменяем содержимое блока:
      $fotorama
          .html('')
          .append($wrap);

      $.Fotorama.size++;

      wrapAppendedFLAG = true;
    }
  }

  function stageNoMove () {
    stageShaftTouchTail.noMove = size < 2 || $videoPlaying || o_fade;
  }

  function setAutoplayInterval (interval) {
    if (interval === true) interval = '';
    opts.autoplay = Math.max(Number(interval) || AUTOPLAY_INTERVAL, TRANSITION_DURATION * 1.5);
  }

  function addOrRemove (FLAG) {
    return FLAG ? 'add' : 'remove';
  }

  /**
   * Options on the fly
   * */
  function setOptions () {
    o_fade = opts.transition === 'crossfade' || opts.transition === 'dissolve';

    o_loop = opts.loop && (size > 2 || o_fade);

    var classes = {add: [], remove: []};

    if (size > 1) {
      o_nav = opts.nav;
      o_navTop = opts.navPosition === 'top';
      classes.remove.push(selectClass);

      $arrs.show();
      arrsUpdate();
    } else {
      o_nav = false;

      $arrs.hide();
    }

    classes[addOrRemove(size > 1)].push('fotorama__wrap--navigation');

    if (opts.autoplay) setAutoplayInterval(opts.autoplay);

    o_thumbSide = numberFromMeasure(opts.thumbWidth) || THUMB_SIZE;
    o_thumbSide2 = numberFromMeasure(opts.thumbHeight) || THUMB_SIZE;

    stageNoMove();

    extendMeasures(opts, true);

    if (o_nav === true || o_nav === 'dots') {
      $nav
          .addClass(navDotsClass)
          .removeClass(navThumbsClass);
      frameDraw(size, 'navDot');
    } else if (o_nav === 'thumbs') {
      setStyle($style, $.Fotorama.jst.style({w: o_thumbSide, h: o_thumbSide2, m: MARGIN, s: stamp, q: !COMPAT}));

      $nav
          .addClass(navThumbsClass)
          .removeClass(navDotsClass);

      frameDraw(size, 'navThumb');
    } else {
      o_nav = false;
      $nav.removeClass(navThumbsClass + ' ' + navDotsClass);
    }

    o_allowFullScreen = opts.allowFullScreen;
    $fotorama
        .insertAfter($anchor)
        .removeClass(hiddenClass);

    if (o_nav && o_navTop) {
      $navWrap.insertBefore($stage);
    } else {
      $navWrap.insertAfter($stage);
    }

    if (o_allowFullScreen) {
      $fullscreenIcon.appendTo($stage);
      o_nativeFullScreen = FULLSCREEN && o_allowFullScreen === 'native';
    } else {
      $fullscreenIcon.detach();
      o_nativeFullScreen = false;
    }

    classes[addOrRemove(o_fade)].push(wrapFadeClass);
    classes[addOrRemove(!o_fade && !stageShaftTouchTail.noMove)].push(wrapSlideClass);

    ooooStop();

    $wrap
        .addClass(classes.add.join(' '))
        .removeClass(classes.remove.join(' '));

    lastOptions = $.extend({}, opts);
  }

  function normalizeIndex (index) {
    return index < 0 ? (size + (index % size)) % size : index >= size ? index % size : index;
  }

  function limitIndex (index) {
    return minMaxLimit(index, 0, size - 1);
  }

  function getPrevIndex (index) {
    return index > 0 || o_loop ? index - 1 : false;
  }

  function getNextIndex (index) {
    return index < size - 1 || o_loop ? index + 1 : false;
  }

  function setStageShaftMinMaxPosAndSnap () {
    stageShaftData.minPos = o_loop ? -Infinity : -getPosByIndex(size - 1, measures.w, MARGIN, repositionIndex);
    stageShaftData.maxPos = o_loop ? Infinity : -getPosByIndex(0, measures.w, MARGIN, repositionIndex);
    stageShaftData.snap = measures.w + MARGIN;
  }

  function setNavShaftMinMaxPos () {
    navShaftData.minPos = Math.min(0, measures.w - $navShaft.width());
    navShaftData.maxPos = 0;

    navShaftTouchTail.noMove = navShaftData.minPos === navShaftData.maxPos;
  }

  function eachIndex (indexes, type, fn) {
    if (typeof indexes === 'number') {
      indexes = new Array(indexes);
      var rangeFLAG = true;
    }
    return $.each(indexes, function (i, index) {
      if (rangeFLAG) index = i;
      if (typeof(index) === 'number') {
        var dataFrame = data[normalizeIndex(index)],
            key = '$' + type + 'Frame',
            $frame = dataFrame[key];

        fn.call(this, i, index, dataFrame, $frame, key, $frame && $frame.data());
      }
    });
  }

  function setMeasures (width, height, ratio, index) {
    if (!measuresSetFLAG || (measuresSetFLAG === '*' && index === startIndex)) {
      width = measureIsValid(opts.width) || measureIsValid(width) || WIDTH;
      height = measureIsValid(opts.height) || measureIsValid(height) || HEIGHT;
      that.resize({
        width: width,
        ratio: opts.ratio || ratio || width / height
      }, 0, index === startIndex ? true : '*');
    }
  }

  function loadImg (indexes, type, specialMeasures, specialFit, again) {
    eachIndex(indexes, type, function (i, index, dataFrame, $frame, key, frameData) {

      if (!$frame) return;

      var fullFLAG = that.fullScreen && dataFrame.full && !frameData.$full && type === 'stage';

      if (frameData.$img && !again && !fullFLAG) return;

      var img = new Image(),
          $img = $(img),
          imgData = $img.data();

      frameData[fullFLAG ? '$full' : '$img'] = $img;

      var srcKey = type === 'stage' ? (fullFLAG ? 'full' : 'img') : 'thumb',
          src = dataFrame[srcKey],
          dummy = fullFLAG ? null : dataFrame[type === 'stage' ? 'thumb' : 'img'];

      if (type === 'navThumb') $frame = frameData.$wrap;

      function triggerTriggerEvent (event) {
        var _index = normalizeIndex(index);
        triggerEvent(event, {
          index: _index,
          src: src,
          frame: data[_index]
        });
      }

      function error () {
        ////console.log('error', index, src);
        $img.remove();

        $.Fotorama.cache[src] = 'error';

        if ((!dataFrame.$html || type !== 'stage') && dummy && dummy !== src) {
          dataFrame[srcKey] = src = dummy;
          loadImg([index], type, specialMeasures, specialFit, true);
        } else {
          if (src && !frameData.$html) {
            $frame
                .trigger('f:error')
                .removeClass(loadingClass)
                .addClass(errorClass);

            triggerTriggerEvent('error');
          } else if (type === 'stage') {
            $frame
                .trigger('f:load')
                .removeClass(loadingClass + ' ' + errorClass)
                .addClass(loadedClass);

            triggerTriggerEvent('load');
            setMeasures();
          }

          frameData.state = 'error';

          if (size > 1 && !dataFrame.html && !dataFrame.deleted && !dataFrame.video && !fullFLAG) {
            dataFrame.deleted = true;
            that.splice(index, 1);
          }
        }
      }

      function loaded () {
        ////console.log('loaded', index, src);

        var width = $img.width(),
            height = $img.height(),
            ratio = width / height;

        imgData.measures = {
          width: width,
          height: height,
          ratio: ratio
        };

        setMeasures(width, height, ratio, index);

        $img
            .off('load error')
            .addClass(imgClass + (fullFLAG ? ' ' + imgFullClass : ''))
            .prependTo($frame);

        fit($img, specialMeasures || measures, specialFit || dataFrame.fit || opts.fit);

        $.Fotorama.cache[src] = 'loaded';
        frameData.state = 'loaded';

        setTimeout(function () {
          $frame
              .trigger('f:load')
              .removeClass(loadingClass + ' ' + errorClass)
              .addClass(loadedClass + ' ' + (fullFLAG ? loadedFullClass : loadedImgClass));

          if (type === 'stage') {
            triggerTriggerEvent('load');
          }
        }, 5);
      }

      if (!src) {
        error();
        return;
      }

      function waitAndLoad () {
        waitFor(function () {
          return !isHidden(img)/* && !touchedFLAG*/;
        }, function () {
          loaded();
        });
      }

      if (!$.Fotorama.cache[src]) {
        $.Fotorama.cache[src] = '*';

        $img
            .on('load', waitAndLoad)
            .on('error', error);
      } else {
        (function justWait () {
          if ($.Fotorama.cache[src] === 'error') {
            error();
          } else if ($.Fotorama.cache[src] === 'loaded') {
            waitAndLoad();
          } else {
            setTimeout(justWait, 100);
          }
        })();
      }

      img.src = src;
      $img.appendTo($.Fotorama.$load);
    });
  }

  function updateFotoramaState () {
    var $frame = that.activeFrame[stageFrameKey];

    if ($frame && !$frame.data().state) {
      ooooStart($frame);
      $frame.on('f:load f:error', function () {
        $frame.off('f:load f:error');
        ooooStop();
      });
    }
  }

  function frameDraw (indexes, type) {
    eachIndex(indexes, type, function (i, index, dataFrame, $frame, key, frameData) {
      ////console.log('frameDraw');

      if ($frame) return;

      ////console.log('frameDraw execute');

      $frame = dataFrame[key] = $wrap[key].clone();
      frameData = $frame.data();
      frameData.data = dataFrame;

      if (type === 'stage') {

        //////console.log('dataFrame.html', $(dataFrame.html).html());

        if (dataFrame.html) {
          var $html = $(dataFrame.html).html(dataFrame._html); // Because of IE

          $('<div class="' + htmlClass + '"></div>')
              .append(dataFrame.html)
              .appendTo($frame);
        }

        if (opts.captions && dataFrame.caption) {
          $('<div class="' + captionClass + '"></div>').append(dataFrame.caption).appendTo($frame);
        }

        if (dataFrame.video) {
          var $oneVideoPlay = $videoPlay.clone();

          smartClick($oneVideoPlay, function () {
                that.playVideo();
              }, {
                onStart: function (e) {
                  onTouchStart.call(this, e);
                  stageShaftTouchTail.control = true;
                },
                tail: stageShaftTouchTail
              }
          );

          $frame
              .addClass(stageFrameVideoClass)
              .append($oneVideoPlay);
        }

        $stageFrame = $stageFrame.add($frame);
      } else if (type === 'navDot') {
        $navDotFrame = $navDotFrame.add($frame);
      } else if (type === 'navThumb') {
        frameData.$wrap = $frame.children(':first');
        $navThumbFrame = $navThumbFrame.add($frame);
        if (dataFrame.video) {
          $frame.append($videoPlay.clone());
        }
  	    if (dataFrame.caption) {
		  $('<div class="' + captionClass + '"></div>').append(dataFrame.caption).appendTo($frame);
	    }
      }
    });
  }

  function callFit ($img, measuresToFit, method) {
    return $img && $img.length && fit($img, measuresToFit, method);
  }

  function stageFramePosition (indexes) {
    eachIndex(indexes, 'stage', function (i, index, dataFrame, $frame, key, frameData) {
      if (!$frame) return;

      $frame
          .css($.extend({left: o_fade ? 0 : getPosByIndex(index, measures.w, MARGIN, repositionIndex)/*, display: 'block'*/}, o_fade && getDuration(0)));
      //.fadeTo(0, o_fade && index !== activeIndex ? 0 : 1);

      if (!frameData.appended) {
        $frame.appendTo($stageShaft);
        frameData.appended = true;
        unloadVideo(dataFrame.$video);
      }



      ///
//			if (frameData.hidden) {
//				$frame.show();
//				frameData.hidden = false;
//
//			}
      ///

      var method = dataFrame.fit || opts.fit;

      callFit(frameData.$img, measures, method);
      callFit(frameData.$full, measures, method);
    });
  }

  function thumbsDraw (pos, loadFLAG) {
    if (o_nav !== 'thumbs' || isNaN(pos)) return;

    var thumbSide = o_thumbSide + MARGIN,
        leftIndex = limitIndex(getIndexByPos(pos + thumbSide, thumbSide)),
        rightIndex = limitIndex(getIndexByPos(pos - measures.w/* - thumbSide*/, thumbSide)),
        specialMeasures = {};

    specialMeasures.w = o_thumbSide;
    specialMeasures.h = o_thumbSide2;

    $navThumbFrame.each(function () {
      var $this = $(this),
          thisData = $this.data(),
          eq = thisData.eq,
          specialFit = 'cover';

      if (eq < leftIndex
          || eq > rightIndex
          || callFit(thisData.$img, specialMeasures, specialFit)) return;

      loadFLAG && loadImg([eq], 'navThumb', specialMeasures, specialFit);
    });
  }

  function navAppend ($navFrame, $navShaft, mainFLAG) {
    if (!navAppend.ok) {
      $navFrame = $navFrame
          .filter(function () {
            var actual,
                $this = $(this),
                frameData = $this.data();
            for (var _i = 0, _l = data.length; _i < _l; _i++) {
              var dataFrame = data[_i];
              if (frameData.data === dataFrame) {
                actual = true;
                frameData.eq = _i;
                break;
              }
            }
            if (!actual) {
              $this.remove();
            }
            return actual;
          })
          .sort(function (a, b) {
            return $(a).data().eq - $(b).data().eq;
          })
          .appendTo($navShaft);

      if (mainFLAG) {
        setNavShaftMinMaxPos();
      }

      navAppend.ok = true;
    }
  }

  function arrsUpdate () {
    $arrs.each(function (i) {
      $(this).toggleClass(
          arrDisabledClass,
          (!o_loop
              && ((activeIndex === 0 && i === 0)
              || (activeIndex === size - 1 && i === 1)))
              && !$videoPlaying
      );
    });
  }

  function getNavFrameCenter ($navFrame) {
    return $navFrame.position().left + (o_thumbSide) / 2
  }

  function slideThumbBorder (time) {
    slide($thumbBorder, {
      time: time * .9,
      pos: getNavFrameCenter(that.activeFrame[navFrameKey])
    });
  }

  function slideNavShaft (options) {
    if (data[options.guessIndex][navFrameKey]) {
      var pos = minMaxLimit(options.coo - getNavFrameCenter(data[options.guessIndex][navFrameKey]), navShaftData.minPos, navShaftData.maxPos),
          time = options.time * .9;
      slide($navShaft, {
        time: time,
        pos: pos,
        onEnd: function () {
          thumbsDraw(pos, true);
        }
      });

      if (time) thumbsDraw(pos);
      setShadow($nav, findShadowEdge(pos, navShaftData.minPos, navShaftData.maxPos));
    }
  }

  function navUpdate () {
    ////console.log('navUpdate', o_nav);
    if (o_nav === 'thumbs') {
      $navFrame = $navThumbFrame;
      navFrameKey = navThumbFrameKey;
    } else if (o_nav) {
      $navFrame = $navDotFrame;
      navFrameKey = navDotFrameKey;
    } else return;

    navAppend($navFrame, $navShaft, true);
    $navFrame.removeClass(activeClass);
    that.activeFrame[navFrameKey].addClass(activeClass);
  }

  function stageShaftReposition () {
    /*if (touchedFLAG) {
     waitFor(function () {
     return !touchedFLAG;
     }, stageShaftReposition, 100);
     return;
     }*/
    repositionIndex = dirtyIndex = activeIndex;

    var dataFrame = that.activeFrame,
        $frame = dataFrame[stageFrameKey];

    if ($frame) {
      $stageFrame
          .not(that.activeFrame[stageFrameKey].addClass(activeClass))
          //.css({display: 'none'})
        //.hide()
        //.data('hidden', true)
          .detach()
          .data('appended', false)
          .removeClass(activeClass);

      stop($stageShaft);
      $stageShaft.css(getTranslate(0));

      stageFramePosition([activeIndex, prevIndex, nextIndex]);
      setStageShaftMinMaxPosAndSnap();
      setNavShaftMinMaxPos();
    }
  }

  function extendMeasures (options, optsLeave) {
    options && $.extend(measures, {
      width: options.width || measures.width,
      height: options.height,
      minWidth: options.minWidth,
      maxWidth: options.maxWidth,
      minHeight: options.minHeight,
      maxHeight: options.maxHeight,
      ratio: (function (_ratio) {
        if (!_ratio) return;
        var ratio = Number(_ratio);
        if (!isNaN(ratio)) {
          return ratio;
        } else {
          ratio = _ratio.split('/');
          return Number(ratio[0] / ratio[1]) || undefined;
        }
      })(options.ratio)
    })
        && !optsLeave && $.extend(opts, {
      width: measures.width,
      height: measures.height,
      minWidth: measures.minWidth,
      maxWidth: measures.maxWidth,
      minHeight: measures.minHeight,
      maxHeight: measures.maxHeight,
      ratio: measures.ratio
    });
  }

  function triggerEvent (event, extra) {
    //console.log('triggerEvent', event, extra);
    $fotorama.trigger(_fotoramaClass + ':' + event, [that, extra]);
  }

  function eventData (index) {
    //console.log('eventData', index);
    return {
      index: index,
      frame: data[index]
    }
  }

  /*var touchedFLAG; */

  function onTouchStart () {
    /*clearTimeout(onTouchEnd.t);
     touchedFLAG = 1;*/

    if (opts.stopAutoplayOnTouch) {
      that.stopAutoplay();
    } else {
      pausedAutoplayFLAG = true;
    }
  }

  function releaseAutoplay () {
    pausedAutoplayFLAG = !(!$videoPlaying && !stoppedAutoplayFLAG);
  }

  function changeAutoplay () {
    clearTimeout(changeAutoplay.t);
    if (!opts.autoplay || pausedAutoplayFLAG) {
      if (that.autoplay) {
        that.autoplay = false;
        triggerEvent('stopautoplay');
      }

      return;
    }

    if (!that.autoplay) {
      that.autoplay = true;
      triggerEvent('startautoplay');
    }

    var _activeIndex = activeIndex;

    changeAutoplay.t = setTimeout(function () {
      var frameData = that.activeFrame[stageFrameKey].data();
      waitFor(function () {
        return frameData.state || _activeIndex !== activeIndex;
      }, function () {
        if (pausedAutoplayFLAG || _activeIndex !== activeIndex) return;
        that.show({index: normalizeIndex(activeIndex + 1)});
      });
    }, opts.autoplay);
  }


  that.startAutoplay = function (interval) {
    if (that.autoplay) return this;
    pausedAutoplayFLAG = stoppedAutoplayFLAG = false;
    setAutoplayInterval(interval || opts.autoplay);
    changeAutoplay();

    return this;
  }

  that.stopAutoplay = function () {
    if (that.autoplay) {
      pausedAutoplayFLAG = stoppedAutoplayFLAG = true;
      changeAutoplay();
    }
    return this;
  };

  that.show = function (options) {
    var index,
        time = TRANSITION_DURATION,
        overPos;

    if (typeof options !== 'object') {
      index = options;
      options = {};
    } else {
      index = options.index;
      time = typeof options.time === 'number' ? options.time : time;
      overPos = options.overPos;
    }

    if (options.slow) time *= 10;

    if (index === '>') {
      index = dirtyIndex + 1;
    } else if (index === '<') {
      index = dirtyIndex - 1;
    } else if (index === '<<') {
      index = 0;
    } else if (index === '>>') {
      index = size - 1;
    }

    if (isNaN(index)) {
      index = getIndexFromHash(index, data, true) || activeIndex || 0;
    }

    that.activeIndex = activeIndex = o_loop ? normalizeIndex(index) : limitIndex(index);
    prevIndex = getPrevIndex(activeIndex);
    nextIndex = getNextIndex(activeIndex);

    dirtyIndex = o_loop ? index : activeIndex;

    that.activeFrame = activeFrame = data[activeIndex];

    stageFramePosition([dirtyIndex]);
    unloadVideo(false, activeFrame.i !== data[normalizeIndex(repositionIndex)].i);
    triggerEvent('show', options.direct);

    function onEnd () {
      frameDraw([activeIndex, prevIndex, nextIndex], 'stage'); /////
      updateFotoramaState();
      loadImg([activeIndex, prevIndex, nextIndex], 'stage');
      stageShaftReposition(); /////

      triggerEvent('showend', options.direct);

      opts.hash && showedFLAG && !that.eq && setHash(activeFrame.id || activeIndex + 1);

      releaseAutoplay();
      changeAutoplay();

      showedFLAG = true;
    }

    if (!o_fade) {
      slide($stageShaft, {
        pos: -getPosByIndex(dirtyIndex, measures.w, MARGIN, repositionIndex),
        overPos: overPos,
        time: time,
        onEnd: onEnd
      });
    } else {
      var $activeFrame = activeFrame[stageFrameKey],
          $prevActiveFrame = activeIndex !== lastActiveIndex ? data[lastActiveIndex][stageFrameKey] : null;

      fade($activeFrame, $prevActiveFrame, $stageFrame, {
        time: time,
        method: opts.transition,
        onEnd: onEnd
      });
    }

    arrsUpdate();
    navUpdate();

    if (o_nav) {
      var guessIndex = limitIndex(activeIndex + minMaxLimit(dirtyIndex - lastActiveIndex, -1, 1)),
          cooUndefinedFLAG = typeof options.coo === 'undefined';

      if (cooUndefinedFLAG || guessIndex !== activeIndex) {
        slideNavShaft({time: time, coo: !cooUndefinedFLAG ? options.coo : measures.w / 2, guessIndex: !cooUndefinedFLAG ? guessIndex : activeIndex});
      }
    }
    if (o_nav === 'thumbs') slideThumbBorder(time);

    lastActiveIndex = activeIndex;

    return this;
  };

  that.requestFullScreen = function () {
    if (o_allowFullScreen && !that.fullScreen) {
      scrollTop = $WINDOW.scrollTop();
      scrollLeft = $WINDOW.scrollLeft();

      $WINDOW.scrollLeft(1).scrollTop(1);

      $fotorama
          .addClass(fullscreenClass)
          .appendTo($BODY);

      measuresStash = $.extend({}, measures);
      //console.log('measuresStash', measuresStash, measures);

      unloadVideo($videoPlaying, true);

      that.fullScreen = true;

      if (o_nativeFullScreen) {
        fullScreenApi.request(fotorama);
      }

      setTimeout(function () {
        $WINDOW.scrollLeft(0).scrollTop(0);
        // Timeout for Safari
        $BODY.addClass(_fullscreenClass);

        that.resize();
        loadImg([activeIndex, prevIndex, nextIndex], 'stage');
      }, 5);

      triggerEvent('fullscreenenter');
    }

    return this;
  };

  function cancelFullScreen () {
    //console.log('/!\ cancelFullScreen');

    if (that.fullScreen) {
      that.fullScreen = false;

      if (FULLSCREEN) {
        fullScreenApi.cancel(fotorama);
      }

      $BODY.removeClass(_fullscreenClass);

      $fotorama
          .removeClass(fullscreenClass)
          .insertAfter($anchor);

      triggerEvent('fullscreenexit');

      measures = $.extend({}, measuresStash);

      //console.log('measures', measures, measuresStash);

      unloadVideo($videoPlaying, true);

      that.resize();
      loadImg([activeIndex, prevIndex, nextIndex], 'stage');

      $WINDOW.scrollLeft(scrollLeft).scrollTop(scrollTop);
    }
  }

  that.cancelFullScreen = function () {
    if (o_nativeFullScreen && fullScreenApi.is()) {
      fullScreenApi.cancel(document);
    } else {
      cancelFullScreen();
    }

    return this;
  };

  if (document.addEventListener) {
    document.addEventListener(fullScreenApi.event, function () {
      if (!fullScreenApi.is() && !$videoPlaying) {
        cancelFullScreen();
      }
    });
  }

  $DOCUMENT.on('keydown', function (e) {
    if ($videoPlaying && e.keyCode === 27) {
      e.preventDefault();
      unloadVideo($videoPlaying, true, true);
    } else if (that.fullScreen || (opts.keyboard && !index)) {
      if (e.keyCode === 27) {
        e.preventDefault();
        that.cancelFullScreen();
      } else if (e.keyCode === 39 || (e.keyCode === 40 && that.fullScreen)) {
        e.preventDefault();
        that.show({index: '>', slow: e.altKey, direct: true});
      } else if (e.keyCode === 37 || (e.keyCode === 38 && that.fullScreen)) {
        e.preventDefault();
        that.show({index: '<', slow: e.altKey, direct: true});
      }
    }
  });

  if (!index) {
    $DOCUMENT.on('keydown', 'textarea, input, select', function (e) {
      if (!that.fullScreen) {
        e.stopPropagation();
      }
    });
  }

  that.resize = function (options) {
    if (!data) return;

    extendMeasures(!that.fullScreen ? options : {width: '100%', maxWidth: null, minWidth: null, height: '100%', maxHeight: null, minHeight: null});

    var time = arguments[1] || 0,
        setFLAG = arguments[2],
        width = measures.width,
        height = measures.height,
        ratio = measures.ratio,
        windowHeight = window.innerHeight - (o_nav ? $nav.height() : 0);

    if (measureIsValid(width)) {
      $wrap.css({width: width, minWidth: measures.minWidth, maxWidth: measures.maxWidth});

      width = measures.w = $wrap.width();
      height = numberFromPercent(height) / 100 * windowHeight || numberFromMeasure(height);

      height = height || (ratio && width / ratio);

      if (height) {
        width = Math.round(width);
        height = measures.h = Math.round(minMaxLimit(height, numberFromPercent(measures.minHeight) / 100 * windowHeight || numberFromMeasure(measures.minHeight), numberFromPercent(measures.maxHeight) / 100 * windowHeight || numberFromMeasure(measures.maxHeight)));

        stageShaftReposition();

        $stage
            .addClass(stageOnlyActiveClass)
            .stop()
            .animate({width: width, height: height}, time, function () {
              $stage.removeClass(stageOnlyActiveClass);
            });

        if (o_nav) {
          $nav
              .stop()
              .animate({width: width}, time)
              .css({left: 0});

          slideNavShaft({guessIndex: activeIndex, time: time, coo: measures.w / 2});
          if (o_nav === 'thumbs' && navAppend.ok) slideThumbBorder(time);
        }
        measuresSetFLAG = setFLAG || true;
        ready();
      }
    }

    return this;
  };

  that.setOptions = function (options) {
    $.extend(opts, options);
    reset();
    return this;
  };


  function setShadow ($el, edge) {
    $el.removeClass(shadowsLeftClass + ' ' + shadowsRightClass);
    edge && !$videoPlaying && $el.addClass(edge.replace(/^|\s/g, ' ' + shadowsClass + '--'));
  }

  that.destroy = function () {
    //console.log('destroy');
    that.stopAutoplay();
    $wrap.detach();
    $fotorama.html(fotoramaData.urtext);
    wrapAppendedFLAG = false;
    data = that.data = null;
    $.Fotorama.size--;
    return this;
  };

  that.playVideo = function () {
    var dataFrame = that.activeFrame,
        video = dataFrame.video,
        _activeIndex = activeIndex;

    if (typeof video === 'object' && dataFrame.videoReady) {
      o_nativeFullScreen && that.fullScreen && that.cancelFullScreen();

      waitFor(function () {
        return !fullScreenApi.is() || _activeIndex !== activeIndex;
      }, function () {
        if (_activeIndex === activeIndex) {
          dataFrame.$video = dataFrame.$video || $($.Fotorama.jst.video(video));
          dataFrame.$video.appendTo(dataFrame[stageFrameKey]);

          $wrap.addClass(wrapVideoClass);
          $videoPlaying = dataFrame.$video;
          stageShaftTouchTail.noMove = true;

          triggerEvent('loadvideo');
        }
      });
    }

    return this;
  };

  that.stopVideo = function () {
    unloadVideo($videoPlaying, true, true);
    return this;
  };


  function unloadVideo ($video, unloadActiveFLAG, releaseAutoplayFLAG) {
    if (unloadActiveFLAG) {
      $wrap.removeClass(wrapVideoClass);
      $videoPlaying = false;

      stageNoMove();
    }

    if ($video && $video !== $videoPlaying) {
      $video.remove();
      triggerEvent('unloadvideo');
    }

    if (releaseAutoplayFLAG) {
      releaseAutoplay();
      changeAutoplay();
    }
  }

  function toggleControlsClass (FLAG) {
    $wrap.toggleClass(wrapNoControlsClass, FLAG);
  }

  $wrap.hover(
      function () {
        toggleControlsClass(false);
      }, function () {
        toggleControlsClass(true);
      }
  );

  function onStageTap (e, touch) {
    if ($videoPlaying) {
      unloadVideo($videoPlaying, true, true);
    } else {
      if (touch) {
        toggleControlsClass();
      } else {
        that.show({index: e.shiftKey || e._x - $stage.offset().left < measures.w / 3 ? '<' : '>', slow: e.altKey, direct: true});
      }
    }
  }

  stageShaftTouchTail = moveOnTouch($stageShaft, {
    onStart: onTouchStart,
    onMove: function (e, result) {
      setShadow($stage, result.edge);
    },
    onEnd: function (result) {
      setShadow($stage);

      if (result.moved || (result.touch && result.pos !== result.newPos)) {
        var index = getIndexByPos(result.newPos, measures.w, MARGIN, repositionIndex);
        that.show({
          index: index,
          time: result.time,
          overPos: result.overPos,
          direct: true
        });
      } else if (!result.aborted) {
        onStageTap(result.startEvent, result.touch);
      }
    },
    timeLow: 1,
    timeHigh: 1,
    friction: 2,
    select: '.' + selectClass + ', .' + selectClass + ' *',
    $wrap: $stage
  });

  navShaftTouchTail = moveOnTouch($navShaft, {
    onStart: onTouchStart,
    onMove: function (e, result) {
      setShadow($nav, result.edge);
    },
    onEnd: function (result) {
      function onEnd () {
        releaseAutoplay();
        changeAutoplay();
        thumbsDraw(result.newPos, true);
      }

      if (!result.moved) {
        var target = result.$target.closest('.' + navFrameClass, $navShaft)[0];
        target && onNavFrameClick.call(target, result.startEvent);
      } else if (result.pos !== result.newPos) {
        slide($navShaft, {
          time: result.time,
          pos: result.newPos,
          overPos: result.overPos,
          onEnd: onEnd
        });
        thumbsDraw(result.newPos);
        setShadow($nav, findShadowEdge(result.newPos, navShaftData.minPos, navShaftData.maxPos));
      } else {
        onEnd();
      }
    },
    timeLow: .5,
    timeHigh: 2,
    friction: 5,
    $wrap: $nav
  });

  function onNavFrameClick (e, time) {
    var index = $(this).data().eq;
    that.show({index: index, slow: e.altKey, direct: true, coo: e._x - $nav.offset().left, time: time});
  }

  smartClick($arrs, function (e) {
    e.preventDefault();
    if ($videoPlaying) {
      unloadVideo($videoPlaying, true, true);
    } else {
      that.show({index: $arrs.index(this) ? '>' : '<', slow: e.altKey, direct: true});
    }
  }, {
    onStart: function (e) {
      onTouchStart.call(this, e);
      stageShaftTouchTail.control = true;
    },
    tail: stageShaftTouchTail
  });

  // Клик по иконке фуллскрина
  smartClick($fullscreenIcon, function () {
    if (that.fullScreen) {
      that.cancelFullScreen();
    } else {
      that.requestFullScreen();
    }
    releaseAutoplay();
    changeAutoplay();
  }, {
    onStart: function (e) {
      onTouchStart.call(this, e);
      stageShaftTouchTail.control = true;
    },
    tail: stageShaftTouchTail
  });

  function reset () {
    setData();
    setOptions();

    if (!ready.ok) {
      // Only first time
      if (opts.hash && location.hash) {
        startIndex = getIndexFromHash(location.hash.replace(/^#/, ''), data, index === 0);
      }
      startIndex = (o_loop ? normalizeIndex(startIndex) : limitIndex(startIndex)) || 0;
      activeIndex = repositionIndex = dirtyIndex = lastActiveIndex = startIndex;
    }

    if (size) {
      if ($videoPlaying) {
        unloadVideo($videoPlaying, true);
      }
      that.show({index: activeIndex, time: 0});
      that.resize();
    } else {
      that.destroy();
    }
  }

  $.each('load push pop shift unshift reverse sort splice'.split(' '), function (i, method) {
    that[method] = function () {
      data = data || [];
      if (method !== 'load') {
        Array.prototype[method].apply(data, arguments);
      } else if (arguments[0] && typeof arguments[0] === 'object' && arguments[0].length) {
        data = arguments[0];
      }
      reset();
      return that;
    }
  });

  function ready () {
    if (!ready.ok) {
      ready.ok = true;
      $wrap.removeClass(wrapNotReadyClass);
      triggerEvent('ready');
    }
  }

  $WINDOW.on('resize', that.resize);
  reset();
};

$.fn.fotorama = function (opts) {
  return this.each(function () {
    var that = this,
        $fotorama = $(this),
        fotoramaData = $fotorama.data(),
        fotorama = fotoramaData.fotorama;

    if (!fotorama) {
      waitFor(function () {
        return !isHidden(that);
      }, function () {
        fotoramaData.urtext = $fotorama.html();
        new $.Fotorama($fotorama,
            /* Priority for options:
             * 1. <div data-loop="true"></div>
             * 2. $('div').fotorama({loop: false})
             * 3. Defaults */
            $.extend(
                {},
                {
                  // dimensions
                  width: null, // 500 || '100%'
                  minWidth: null,
                  maxWidth: null, // '100%'
                  height: null,
                  minHeight: null,
                  maxHeight: null,
                  ratio: null, // '16/9' || 500/333 || 1.5

                  // navigation, thumbs
                  nav: 'dots', // 'thumbs' || false
                  navPosition: 'bottom', // 'top'
                  thumbWidth: THUMB_SIZE,
                  thumbHeight: THUMB_SIZE,

                  allowFullScreen: false, // true || 'native'

                  fit: 'contain', // 'cover' || 'scale-down' || 'none'

                  transition: 'slide', // 'crossfade' || 'dissolve'

                  captions: true,

                  hash: false,

                  autoplay: false,
                  stopAutoplayOnTouch: true,

                  keyboard: false,

                  loop: false
                },
                $.extend(
                    {},
                    opts,
                    fotoramaData
                )
            )
        );
      });
    } else {
      fotorama.setOptions(opts);
    }
  });
//  }
};

$.Fotorama.cache = {};

var _size = 0;
$.Fotorama.size = 0;

$(function () {
  $('.' + _fotoramaClass + ':not([data-auto="false"])').fotorama();
});