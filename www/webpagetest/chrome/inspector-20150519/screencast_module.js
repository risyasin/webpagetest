WebInspector.ScreencastApp=function()
{this._enabledSetting=WebInspector.settings.createSetting("screencastEnabled",true);this._toggleButton=new WebInspector.ToolbarButton(WebInspector.UIString("Toggle screencast."),"screencast-toolbar-item");this._toggleButton.setToggled(this._enabledSetting.get());this._toggleButton.addEventListener("click",this._toggleButtonClicked,this);WebInspector.targetManager.observeTargets(this);};WebInspector.ScreencastApp.prototype={presentUI:function(document)
{var rootView=new WebInspector.RootView();this._rootSplitWidget=new WebInspector.SplitWidget(false,true,"InspectorView.screencastSplitViewState",300,300);this._rootSplitWidget.setVertical(true);this._rootSplitWidget.setSecondIsSidebar(true);this._rootSplitWidget.show(rootView.element);this._rootSplitWidget.hideMain();this._rootSplitWidget.setSidebarWidget(WebInspector.inspectorView);WebInspector.inspectorView.showInitialPanel();rootView.attachToDocument(document);},targetAdded:function(target)
{if(this._target)
return;this._target=target;if(target.hasCapability(WebInspector.Target.Capabilities.CanScreencast)){this._screencastView=new WebInspector.ScreencastView(target);this._rootSplitWidget.setMainWidget(this._screencastView);this._screencastView.initialize();}else{this._toggleButton.setEnabled(false);}
this._onScreencastEnabledChanged();},targetRemoved:function(target)
{if(this._target===target){delete this._target;if(!this._screencastView)
return;this._toggleButton.setEnabled(false);this._screencastView.detach();delete this._screencastView;this._onScreencastEnabledChanged();}},_toggleButtonClicked:function()
{var enabled=!this._toggleButton.toggled();this._enabledSetting.set(enabled);this._onScreencastEnabledChanged();},_onScreencastEnabledChanged:function()
{if(!this._rootSplitWidget)
return;var enabled=this._enabledSetting.get()&&this._screencastView;this._toggleButton.setToggled(enabled);if(enabled)
this._rootSplitWidget.showBoth();else
this._rootSplitWidget.hideMain();}};WebInspector.ScreencastApp._appInstance;WebInspector.ScreencastApp._instance=function()
{if(!WebInspector.ScreencastApp._appInstance)
WebInspector.ScreencastApp._appInstance=new WebInspector.ScreencastApp();return WebInspector.ScreencastApp._appInstance;};WebInspector.ScreencastApp.ToolbarButtonProvider=function()
{}
WebInspector.ScreencastApp.ToolbarButtonProvider.prototype={item:function()
{return WebInspector.ScreencastApp._instance()._toggleButton;}}
WebInspector.ScreencastAppProvider=function()
{};WebInspector.ScreencastAppProvider.prototype={createApp:function()
{return WebInspector.ScreencastApp._instance();}};;WebInspector.ScreencastView=function(target)
{WebInspector.VBox.call(this);this._target=target;this._domModel=WebInspector.DOMModel.fromTarget(target);this.setMinimumSize(150,150);this.registerRequiredCSS("screencast/screencastView.css");};WebInspector.ScreencastView._bordersSize=44;WebInspector.ScreencastView._navBarHeight=29;WebInspector.ScreencastView._HttpRegex=/^https?:\/\/(.+)/;WebInspector.ScreencastView._SchemeRegex=/^(https?|about|chrome):/;WebInspector.ScreencastView.prototype={initialize:function()
{this.element.classList.add("screencast");this._createNavigationBar();this._viewportElement=this.element.createChild("div","screencast-viewport hidden");this._canvasContainerElement=this._viewportElement.createChild("div","screencast-canvas-container");this._glassPaneElement=this._canvasContainerElement.createChild("div","screencast-glasspane fill hidden");this._canvasElement=this._canvasContainerElement.createChild("canvas");this._canvasElement.tabIndex=1;this._canvasElement.addEventListener("mousedown",this._handleMouseEvent.bind(this),false);this._canvasElement.addEventListener("mouseup",this._handleMouseEvent.bind(this),false);this._canvasElement.addEventListener("mousemove",this._handleMouseEvent.bind(this),false);this._canvasElement.addEventListener("mousewheel",this._handleMouseEvent.bind(this),false);this._canvasElement.addEventListener("click",this._handleMouseEvent.bind(this),false);this._canvasElement.addEventListener("contextmenu",this._handleContextMenuEvent.bind(this),false);this._canvasElement.addEventListener("keydown",this._handleKeyEvent.bind(this),false);this._canvasElement.addEventListener("keyup",this._handleKeyEvent.bind(this),false);this._canvasElement.addEventListener("keypress",this._handleKeyEvent.bind(this),false);this._canvasElement.addEventListener("blur",this._handleBlurEvent.bind(this),false);this._titleElement=this._canvasContainerElement.createChild("div","screencast-element-title monospace hidden");this._tagNameElement=this._titleElement.createChild("span","screencast-tag-name");this._nodeIdElement=this._titleElement.createChild("span","screencast-node-id");this._classNameElement=this._titleElement.createChild("span","screencast-class-name");this._titleElement.createTextChild(" ");this._nodeWidthElement=this._titleElement.createChild("span");this._titleElement.createChild("span","screencast-px").textContent="px";this._titleElement.createTextChild(" \u00D7 ");this._nodeHeightElement=this._titleElement.createChild("span");this._titleElement.createChild("span","screencast-px").textContent="px";this._titleElement.style.top="0";this._titleElement.style.left="0";this._imageElement=new Image();this._isCasting=false;this._context=this._canvasElement.getContext("2d");this._checkerboardPattern=this._createCheckerboardPattern(this._context);this._shortcuts=({});this._shortcuts[WebInspector.KeyboardShortcut.makeKey("l",WebInspector.KeyboardShortcut.Modifiers.Ctrl)]=this._focusNavigationBar.bind(this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.ScreencastFrame,this._screencastFrame,this);this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.ScreencastVisibilityChanged,this._screencastVisibilityChanged,this);WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.SuspendStateChanged,this._onSuspendStateChange,this);this._updateGlasspane();},wasShown:function()
{this._startCasting();},willHide:function()
{this._stopCasting();},_startCasting:function()
{if(WebInspector.targetManager.allTargetsSuspended())
return;if(this._isCasting)
return;this._isCasting=true;const maxImageDimension=2048;var dimensions=this._viewportDimensions();if(dimensions.width<0||dimensions.height<0){this._isCasting=false;return;}
dimensions.width*=window.devicePixelRatio;dimensions.height*=window.devicePixelRatio;this._target.pageAgent().startScreencast("jpeg",80,Math.min(maxImageDimension,dimensions.width),Math.min(maxImageDimension,dimensions.height));this._domModel.setHighlighter(this);},_stopCasting:function()
{if(!this._isCasting)
return;this._isCasting=false;this._target.pageAgent().stopScreencast();this._domModel.setHighlighter(null);},_screencastFrame:function(event)
{var metadata=(event.data.metadata);var base64Data=(event.data.data);this._imageElement.src="data:image/jpg;base64,"+base64Data;this._pageScaleFactor=metadata.pageScaleFactor;this._screenOffsetTop=metadata.offsetTop;this._scrollOffsetX=metadata.scrollOffsetX;this._scrollOffsetY=metadata.scrollOffsetY;if(event.data.frameNumber)
this._target.pageAgent().screencastFrameAck(event.data.frameNumber);var deviceSizeRatio=metadata.deviceHeight/metadata.deviceWidth;var dimensionsCSS=this._viewportDimensions();this._imageZoom=Math.min(dimensionsCSS.width/this._imageElement.naturalWidth,dimensionsCSS.height/(this._imageElement.naturalWidth*deviceSizeRatio));this._viewportElement.classList.remove("hidden");var bordersSize=WebInspector.ScreencastView._bordersSize;if(this._imageZoom<1.01/window.devicePixelRatio)
this._imageZoom=1/window.devicePixelRatio;this._screenZoom=this._imageElement.naturalWidth*this._imageZoom/metadata.deviceWidth;this._viewportElement.style.width=metadata.deviceWidth*this._screenZoom+bordersSize+"px";this._viewportElement.style.height=metadata.deviceHeight*this._screenZoom+bordersSize+"px";this.highlightDOMNode(this._highlightNode,this._highlightConfig);},_isGlassPaneActive:function()
{return!this._glassPaneElement.classList.contains("hidden");},_screencastVisibilityChanged:function(event)
{this._targetInactive=!event.data.visible;this._updateGlasspane();},_onSuspendStateChange:function(event)
{if(WebInspector.targetManager.allTargetsSuspended())
this._stopCasting();else
this._startCasting();this._updateGlasspane();},_updateGlasspane:function()
{if(this._targetInactive){this._glassPaneElement.textContent=WebInspector.UIString("The tab is inactive");this._glassPaneElement.classList.remove("hidden");}else if(WebInspector.targetManager.allTargetsSuspended()){this._glassPaneElement.textContent=WebInspector.UIString("Profiling in progress");this._glassPaneElement.classList.remove("hidden");}else{this._glassPaneElement.classList.add("hidden");}},_handleMouseEvent:function(event)
{if(this._isGlassPaneActive()){event.consume();return;}
if(!this._pageScaleFactor)
return;if(!this._inspectModeConfig||event.type==="mousewheel"){this._simulateTouchForMouseEvent(event);event.preventDefault();if(event.type==="mousedown")
this._canvasElement.focus();return;}
var position=this._convertIntoScreenSpace(event);this._domModel.nodeForLocation(position.x/this._pageScaleFactor+this._scrollOffsetX,position.y/this._pageScaleFactor+this._scrollOffsetY,callback.bind(this));function callback(node)
{if(!node)
return;if(event.type==="mousemove")
this.highlightDOMNode(node,this._inspectModeConfig);else if(event.type==="click")
WebInspector.Revealer.reveal(node);}},_handleKeyEvent:function(event)
{if(this._isGlassPaneActive()){event.consume();return;}
var shortcutKey=WebInspector.KeyboardShortcut.makeKeyFromEvent((event));var handler=this._shortcuts[shortcutKey];if(handler&&handler(event)){event.consume();return;}
var type;switch(event.type){case"keydown":type="keyDown";break;case"keyup":type="keyUp";break;case"keypress":type="char";break;default:return;}
var text=event.type==="keypress"?String.fromCharCode(event.charCode):undefined;this._target.inputAgent().dispatchKeyEvent(type,this._modifiersForEvent(event),event.timeStamp/1000,text,text?text.toLowerCase():undefined,event.keyIdentifier,event.code,event.keyCode,event.keyCode,false,false,false);event.consume();this._canvasElement.focus();},_handleContextMenuEvent:function(event)
{event.consume(true);},_simulateTouchForMouseEvent:function(event)
{const buttons={0:"none",1:"left",2:"middle",3:"right"};const types={"mousedown":"mousePressed","mouseup":"mouseReleased","mousemove":"mouseMoved","mousewheel":"mouseWheel"};if(!(event.type in types)||!(event.which in buttons))
return;if(event.type!=="mousewheel"&&buttons[event.which]==="none")
return;if(event.type==="mousedown"||typeof this._eventScreenOffsetTop==="undefined")
this._eventScreenOffsetTop=this._screenOffsetTop;var modifiers=(event.altKey?1:0)|(event.ctrlKey?2:0)|(event.metaKey?4:0)|(event.shiftKey?8:0);var convertedPosition=this._zoomIntoScreenSpace(event);convertedPosition.y=Math.round(convertedPosition.y-this._eventScreenOffsetTop);var params={type:types[event.type],x:convertedPosition.x,y:convertedPosition.y,modifiers:modifiers,timestamp:event.timeStamp/1000,button:buttons[event.which],clickCount:0};if(event.type==="mousewheel"){params.deltaX=event.wheelDeltaX/this._screenZoom;params.deltaY=event.wheelDeltaY/this._screenZoom;}else{this._eventParams=params;}
if(event.type==="mouseup")
delete this._eventScreenOffsetTop;WebInspector.targetManager.mainTarget().inputAgent().invoke_emulateTouchFromMouseEvent(params);},_handleBlurEvent:function(event)
{if(typeof this._eventScreenOffsetTop!=="undefined"){var params=this._eventParams;delete this._eventParams;params.type="mouseReleased";WebInspector.targetManager.mainTarget().inputAgent().invoke_emulateTouchFromMouseEvent(params);}},_zoomIntoScreenSpace:function(event)
{var position={};position.x=Math.round(event.offsetX/this._screenZoom);position.y=Math.round(event.offsetY/this._screenZoom);return position;},_convertIntoScreenSpace:function(event)
{var position=this._zoomIntoScreenSpace(event);position.y=Math.round(position.y-this._screenOffsetTop);return position;},_modifiersForEvent:function(event)
{var modifiers=0;if(event.altKey)
modifiers=1;if(event.ctrlKey)
modifiers+=2;if(event.metaKey)
modifiers+=4;if(event.shiftKey)
modifiers+=8;return modifiers;},onResize:function()
{if(this._deferredCasting){clearTimeout(this._deferredCasting);delete this._deferredCasting;}
this._stopCasting();this._deferredCasting=setTimeout(this._startCasting.bind(this),100);},highlightDOMNode:function(node,config,backendNodeId,objectId)
{this._highlightNode=node;this._highlightConfig=config;if(!node){this._model=null;this._config=null;this._node=null;this._titleElement.classList.add("hidden");this._repaint();return;}
this._node=node;node.boxModel(callback.bind(this));function callback(model)
{if(!model||!this._pageScaleFactor){this._repaint();return;}
this._model=this._scaleModel(model);this._config=config;this._repaint();}},_scaleModel:function(model)
{function scaleQuad(quad)
{for(var i=0;i<quad.length;i+=2){quad[i]=quad[i]*this._screenZoom;quad[i+1]=(quad[i+1]+this._screenOffsetTop)*this._screenZoom;}}
scaleQuad.call(this,model.content);scaleQuad.call(this,model.padding);scaleQuad.call(this,model.border);scaleQuad.call(this,model.margin);return model;},_repaint:function()
{var model=this._model;var config=this._config;var canvasWidth=this._canvasElement.getBoundingClientRect().width;var canvasHeight=this._canvasElement.getBoundingClientRect().height;this._canvasElement.width=window.devicePixelRatio*canvasWidth;this._canvasElement.height=window.devicePixelRatio*canvasHeight;this._context.save();this._context.scale(window.devicePixelRatio,window.devicePixelRatio);this._context.save();this._context.fillStyle=this._checkerboardPattern;this._context.fillRect(0,0,canvasWidth,this._screenOffsetTop*this._screenZoom);this._context.fillRect(0,this._screenOffsetTop*this._screenZoom+this._imageElement.naturalHeight*this._imageZoom,canvasWidth,canvasHeight);this._context.restore();if(model&&config){this._context.save();const transparentColor="rgba(0, 0, 0, 0)";var quads=[];if(model.content&&config.contentColor!==transparentColor)
quads.push({quad:model.content,color:config.contentColor});if(model.padding&&config.paddingColor!==transparentColor)
quads.push({quad:model.padding,color:config.paddingColor});if(model.border&&config.borderColor!==transparentColor)
quads.push({quad:model.border,color:config.borderColor});if(model.margin&&config.marginColor!==transparentColor)
quads.push({quad:model.margin,color:config.marginColor});for(var i=quads.length-1;i>0;--i)
this._drawOutlinedQuadWithClip(quads[i].quad,quads[i-1].quad,quads[i].color);if(quads.length>0)
this._drawOutlinedQuad(quads[0].quad,quads[0].color);this._context.restore();this._drawElementTitle();this._context.globalCompositeOperation="destination-over";}
this._context.drawImage(this._imageElement,0,this._screenOffsetTop*this._screenZoom,this._imageElement.naturalWidth*this._imageZoom,this._imageElement.naturalHeight*this._imageZoom);this._context.restore();},_quadsAreEqual:function(quad1,quad2)
{for(var i=0;i<quad1.length;++i){if(quad1[i]!==quad2[i])
return false;}
return true;},_cssColor:function(color)
{if(!color)
return"transparent";return WebInspector.Color.fromRGBA([color.r,color.g,color.b,color.a]).asString(WebInspector.Color.Format.RGBA)||"";},_quadToPath:function(quad)
{this._context.beginPath();this._context.moveTo(quad[0],quad[1]);this._context.lineTo(quad[2],quad[3]);this._context.lineTo(quad[4],quad[5]);this._context.lineTo(quad[6],quad[7]);this._context.closePath();return this._context;},_drawOutlinedQuad:function(quad,fillColor)
{this._context.save();this._context.lineWidth=2;this._quadToPath(quad).clip();this._context.fillStyle=this._cssColor(fillColor);this._context.fill();this._context.restore();},_drawOutlinedQuadWithClip:function(quad,clipQuad,fillColor)
{this._context.fillStyle=this._cssColor(fillColor);this._context.save();this._context.lineWidth=0;this._quadToPath(quad).fill();this._context.globalCompositeOperation="destination-out";this._context.fillStyle="red";this._quadToPath(clipQuad).fill();this._context.restore();},_drawElementTitle:function()
{if(!this._node)
return;var canvasWidth=this._canvasElement.getBoundingClientRect().width;var canvasHeight=this._canvasElement.getBoundingClientRect().height;var lowerCaseName=this._node.localName()||this._node.nodeName().toLowerCase();this._tagNameElement.textContent=lowerCaseName;this._nodeIdElement.textContent=this._node.getAttribute("id")?"#"+this._node.getAttribute("id"):"";this._nodeIdElement.textContent=this._node.getAttribute("id")?"#"+this._node.getAttribute("id"):"";var className=this._node.getAttribute("class");if(className&&className.length>50)
className=className.substring(0,50)+"\u2026";this._classNameElement.textContent=className||"";this._nodeWidthElement.textContent=this._model.width;this._nodeHeightElement.textContent=this._model.height;this._titleElement.classList.remove("hidden");var titleWidth=this._titleElement.offsetWidth+6;var titleHeight=this._titleElement.offsetHeight+4;var anchorTop=this._model.margin[1];var anchorBottom=this._model.margin[7];const arrowHeight=7;var renderArrowUp=false;var renderArrowDown=false;var boxX=Math.max(2,this._model.margin[0]);if(boxX+titleWidth>canvasWidth)
boxX=canvasWidth-titleWidth-2;var boxY;if(anchorTop>canvasHeight){boxY=canvasHeight-titleHeight-arrowHeight;renderArrowDown=true;}else if(anchorBottom<0){boxY=arrowHeight;renderArrowUp=true;}else if(anchorBottom+titleHeight+arrowHeight<canvasHeight){boxY=anchorBottom+arrowHeight-4;renderArrowUp=true;}else if(anchorTop-titleHeight-arrowHeight>0){boxY=anchorTop-titleHeight-arrowHeight+3;renderArrowDown=true;}else
boxY=arrowHeight;this._context.save();this._context.translate(0.5,0.5);this._context.beginPath();this._context.moveTo(boxX,boxY);if(renderArrowUp){this._context.lineTo(boxX+2*arrowHeight,boxY);this._context.lineTo(boxX+3*arrowHeight,boxY-arrowHeight);this._context.lineTo(boxX+4*arrowHeight,boxY);}
this._context.lineTo(boxX+titleWidth,boxY);this._context.lineTo(boxX+titleWidth,boxY+titleHeight);if(renderArrowDown){this._context.lineTo(boxX+4*arrowHeight,boxY+titleHeight);this._context.lineTo(boxX+3*arrowHeight,boxY+titleHeight+arrowHeight);this._context.lineTo(boxX+2*arrowHeight,boxY+titleHeight);}
this._context.lineTo(boxX,boxY+titleHeight);this._context.closePath();this._context.fillStyle="rgb(255, 255, 194)";this._context.fill();this._context.strokeStyle="rgb(128, 128, 128)";this._context.stroke();this._context.restore();this._titleElement.style.top=(boxY+3)+"px";this._titleElement.style.left=(boxX+3)+"px";},_viewportDimensions:function()
{const gutterSize=30;const bordersSize=WebInspector.ScreencastView._bordersSize;var width=this.element.offsetWidth-bordersSize-gutterSize;var height=this.element.offsetHeight-bordersSize-gutterSize-WebInspector.ScreencastView._navBarHeight;return{width:width,height:height};},setInspectModeEnabled:function(enabled,inspectUAShadowDOM,config,callback)
{this._inspectModeConfig=enabled?config:null;if(callback)
callback(null);},highlightFrame:function(frameId)
{},_createCheckerboardPattern:function(context)
{var pattern=(createElement("canvas"));const size=32;pattern.width=size*2;pattern.height=size*2;var pctx=pattern.getContext("2d");pctx.fillStyle="rgb(195, 195, 195)";pctx.fillRect(0,0,size*2,size*2);pctx.fillStyle="rgb(225, 225, 225)";pctx.fillRect(0,0,size,size);pctx.fillRect(size,size,size,size);return context.createPattern(pattern,"repeat");},_createNavigationBar:function()
{this._navigationBar=this.element.createChild("div","toolbar-background toolbar-colors screencast-navigation");if(Runtime.queryParam("hideNavigation"))
this._navigationBar.classList.add("hidden");this._navigationBack=this._navigationBar.createChild("button","back");this._navigationBack.disabled=true;this._navigationBack.addEventListener("click",this._navigateToHistoryEntry.bind(this,-1),false);this._navigationForward=this._navigationBar.createChild("button","forward");this._navigationForward.disabled=true;this._navigationForward.addEventListener("click",this._navigateToHistoryEntry.bind(this,1),false);this._navigationReload=this._navigationBar.createChild("button","reload");this._navigationReload.addEventListener("click",this._navigateReload.bind(this),false);this._navigationUrl=this._navigationBar.createChild("input");this._navigationUrl.type="text";this._navigationUrl.addEventListener('keyup',this._navigationUrlKeyUp.bind(this),true);this._navigationProgressBar=new WebInspector.ScreencastView.ProgressTracker(this._navigationBar.createChild("div","progress"));this._requestNavigationHistory();WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.InspectedURLChanged,this._requestNavigationHistory,this);},_navigateToHistoryEntry:function(offset)
{var newIndex=this._historyIndex+offset;if(newIndex<0||newIndex>=this._historyEntries.length)
return;this._target.pageAgent().navigateToHistoryEntry(this._historyEntries[newIndex].id);this._requestNavigationHistory();},_navigateReload:function()
{this._target.resourceTreeModel.reloadPage();},_navigationUrlKeyUp:function(event)
{if(event.keyIdentifier!='Enter')
return;var url=this._navigationUrl.value;if(!url)
return;if(!url.match(WebInspector.ScreencastView._SchemeRegex))
url="http://"+url;this._target.pageAgent().navigate(url);this._canvasElement.focus();},_requestNavigationHistory:function()
{this._target.pageAgent().getNavigationHistory(this._onNavigationHistory.bind(this));},_onNavigationHistory:function(error,currentIndex,entries)
{if(error)
return;this._historyIndex=currentIndex;this._historyEntries=entries;this._navigationBack.disabled=currentIndex==0;this._navigationForward.disabled=currentIndex==(entries.length-1);var url=entries[currentIndex].url;var match=url.match(WebInspector.ScreencastView._HttpRegex);if(match)
url=match[1];InspectorFrontendHost.inspectedURLChanged(url);this._navigationUrl.value=url;},_focusNavigationBar:function()
{this._navigationUrl.focus();this._navigationUrl.select();return true;},__proto__:WebInspector.VBox.prototype}
WebInspector.ScreencastView.ProgressTracker=function(element)
{this._element=element;WebInspector.targetManager.addModelListener(WebInspector.ResourceTreeModel,WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated,this._onMainFrameNavigated,this);WebInspector.targetManager.addModelListener(WebInspector.ResourceTreeModel,WebInspector.ResourceTreeModel.EventTypes.Load,this._onLoad,this);WebInspector.targetManager.addModelListener(WebInspector.NetworkManager,WebInspector.NetworkManager.EventTypes.RequestStarted,this._onRequestStarted,this);WebInspector.targetManager.addModelListener(WebInspector.NetworkManager,WebInspector.NetworkManager.EventTypes.RequestFinished,this._onRequestFinished,this);}
WebInspector.ScreencastView.ProgressTracker.prototype={_onMainFrameNavigated:function()
{this._requestIds={};this._startedRequests=0;this._finishedRequests=0;this._maxDisplayedProgress=0;this._updateProgress(0.1);},_onLoad:function()
{delete this._requestIds;this._updateProgress(1);setTimeout(function(){if(!this._navigationProgressVisible())
this._displayProgress(0);}.bind(this),500);},_navigationProgressVisible:function()
{return!!this._requestIds;},_onRequestStarted:function(event)
{if(!this._navigationProgressVisible())
return;var request=(event.data);if(request.type===WebInspector.resourceTypes.WebSocket)
return;this._requestIds[request.requestId]=request;++this._startedRequests;},_onRequestFinished:function(event)
{if(!this._navigationProgressVisible())
return;var request=(event.data);if(!(request.requestId in this._requestIds))
return;++this._finishedRequests;setTimeout(function(){this._updateProgress(this._finishedRequests/this._startedRequests*0.9);}.bind(this),500);},_updateProgress:function(progress)
{if(!this._navigationProgressVisible())
return;if(this._maxDisplayedProgress>=progress)
return;this._maxDisplayedProgress=progress;this._displayProgress(progress);},_displayProgress:function(progress)
{this._element.style.width=(100*progress)+"%";}};;Runtime.cachedResources["screencast/screencastView.css"]="/*\n * Copyright (C) 2013 Google Inc. All rights reserved.\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions are\n * met:\n *\n *     * Redistributions of source code must retain the above copyright\n * notice, this list of conditions and the following disclaimer.\n *     * Redistributions in binary form must reproduce the above\n * copyright notice, this list of conditions and the following disclaimer\n * in the documentation and/or other materials provided with the\n * distribution.\n *     * Neither the name of Google Inc. nor the names of its\n * contributors may be used to endorse or promote products derived from\n * this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n * \"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\n * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\n * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\n * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\n * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\n * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.screencast {\n    overflow: hidden;\n}\n\n.screencast-navigation {\n    flex-direction: row;\n    display: flex;\n    flex: 24px 0 0;\n    position: relative;\n}\n\n.screencast-navigation button {\n    border-radius: 2px;\n    background-color: transparent;\n    background-image: -webkit-image-set(\n        url(Images/navigationControls.png) 1x,\n        url(Images/navigationControls_2x.png) 2x);\n    background-clip: content-box;\n    background-origin: content-box;\n    background-repeat: no-repeat;\n    border: 1px solid transparent;\n    height: 23px;\n    padding: 2px;\n    width: 23px;\n}\n\n.screencast-navigation button:hover {\n    border-color: #ccc;\n}\n\n.screencast-navigation button:active {\n    border-color: #aaa;\n}\n\n.screencast-navigation button[disabled] {\n    opacity: 0.5;\n}\n\n.screencast-navigation button.back {\n    background-position-x: -1px;\n}\n\n.screencast-navigation button.forward {\n    background-position-x: -18px;\n}\n\n.screencast-navigation button.reload {\n    background-position-x: -37px;\n}\n\n.screencast-navigation input {\n    -webkit-flex: 1;\n    border: 1px solid #aaa;\n    border-radius: 2px;\n    margin: 1px;\n    padding-left: 5px;\n}\n\n.screencast-navigation input:focus {\n    border: 1px solid #aaa;\n    outline: none !important;\n}\n\n.screencast-navigation .progress {\n    background-color: rgb(66, 129, 235);\n    height: 3px;\n    left: 0;\n    position: absolute;\n    top: 100%;  /* Align with the bottom edge of the parent. */\n    width: 0;\n    z-index: 2;  /* Above .screencast-glasspane. */\n}\n\n.screencast-viewport {\n    display: flex;\n    border: 1px solid #999;\n    border-radius: 20px;\n    flex: none;\n    padding: 20px;\n    margin: 10px;\n    background-color: #eee;\n}\n\n.screencast-canvas-container {\n    flex: auto;\n    display: flex;\n    border: 1px solid #999;\n    position: relative;\n    cursor: -webkit-image-set(url(Images/touchCursor.png) 1x, url(Images/touchCursor_2x.png) 2x), default;\n}\n\n.screencast canvas {\n    flex: auto;\n    position: relative;\n}\n\n.screencast-px {\n    color: rgb(128, 128, 128);\n}\n\n.screencast-element-title {\n    position: absolute;\n    z-index: 10;\n}\n\n.screencast-tag-name {\n    /* Keep this in sync with view-source.css (.webkit-html-tag) */\n    color: rgb(136, 18, 128);\n}\n\n.screencast-node-id {\n    /* Keep this in sync with view-source.css (.webkit-html-attribute-value) */\n    color: rgb(26, 26, 166);\n}\n\n.screencast-class-name {\n    /* Keep this in sync with view-source.css (.webkit-html-attribute-name) */\n    color: rgb(153, 69, 0);\n}\n\n.screencast-glasspane {\n    background-color: rgba(255, 255, 255, 0.8);\n    font-size: 30px;\n    z-index: 100;\n    display: flex;\n    justify-content: center;\n    align-items: center;\n}\n\n/*# sourceURL=screencast/screencastView.css */";