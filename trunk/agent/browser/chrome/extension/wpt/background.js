goog.require('goog.debug');
goog.require('goog.debug.FancyWindow');
goog.require('goog.debug.Logger');

goog.require('wpt.commands');

goog.provide('wpt.main');

/** @const */
var STARTUP_DELAY = 5000;

/** @const */
var TASK_INTERVAL = 1000;

/** @const */
var TASK_INTERVAL_SHORT = 0;

// Developers can set LOG_WINDOW to true to see a window with logs that show
// commands and results.
/** @const */
var LOG_WINDOW = false;

// Set this to true, and set FAKE_COMMAND_SEQUENCE below, to feed a sequence
// of commands to run.  This makes testing new commands easy, because you do
// not need to use wptdriver.exe while debugging.
/** @const */
var RUN_FAKE_COMMAND_SEQUENCE = false;

var g_active = false;
var g_start = 0;
var g_requesting_task = false;
var g_commandRunner = null;  // Will create once we know the tab id under test.
var g_debugWindow = null;  // May create at window onload.


var LOG;
if (LOG_WINDOW) {
  window.onload = function() {
    g_debugWindow = new goog.debug.FancyWindow('main');
    g_debugWindow.setEnabled(true);
    g_debugWindow.init();

    // Create a logger.
    LOG = goog.debug.Logger.getLogger('log');
  };
} else {
  LOG = console;

  /**
   * The console has method warn(), and not warnning().  To keep our code
   * consistent, always use warning(), and implement it using warn() if
   * nessisary.  The function LOG.waring is defined to be the result of
   * calling LOG.warn, with |this| set to |LOG|, with identical |arguments|.
   * param {...*} var_args
   */
  LOG.warning = function(var_args) {
    LOG.warn.apply(LOG, arguments);
  };
}

// On startup, kick off our testing
window.setTimeout(wptStartup, STARTUP_DELAY);

function wptStartup() {
  LOG.info("wptStartup");
  chrome.tabs.getSelected(null, function(tab){
    LOG.info("Got tab id: " + tab.id);
    g_commandRunner = new wpt.commands.CommandRunner(tab.id, window.chrome);

    if (RUN_FAKE_COMMAND_SEQUENCE) {
      // Run the tasks in FAKE_TASKS.
      window.setInterval(wptFeedFakeTasks, TASK_INTERVAL);
    } else {
      // Fetch tasks from wptdriver.exe .
      window.setInterval(wptGetTask, TASK_INTERVAL);
    }
  });
}

var FAKE_TASKS_IDX = 0;
var FAKE_TASKS = [
  {
    'action': 'navigate',
    'target': 'http://www.google.com'
  },
  {
    'action': 'click',
    'target': 'name\'btnI'
  },
  {
    'action': 'navigate',
    'target': 'http://www.google.com/news'
  }
];

function wptFeedFakeTasks() {
  if (FAKE_TASKS.length == FAKE_TASKS_IDX) {
    console.log("DONE");
    return;
  }
  wptExecuteTask(FAKE_TASKS[FAKE_TASKS_IDX++]);
}

// Get the next task from the wptdriver
function wptGetTask(){
  LOG.info("wptGetTask");
  if (!g_requesting_task) {
    g_requesting_task = true;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "http://127.0.0.1:8888/task", true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4)
          return;
        if (xhr.status != 200) {
          LOG.warning("Got unexpected (not 200) XHR status: " + xhr.status);
          return;
        }
        var resp = JSON.parse(xhr.responseText);
        if (resp.statusCode != 200) {
          LOG.warning("Got unexpected status code " + resp.statusCode);
          return;
        }
        if (!resp.data) {
          LOG.warning("No data?");
          return;
        }
        wptExecuteTask(resp.data);
      };
      xhr.onerror = function() {
        LOG.warning("Got an XHR error!");
      };
      xhr.send();
    } catch(err){
      LOG.warning("Error getting task: " + err);
    }
    g_requesting_task = false;
  }
}

// notification that navigation started
function wptOnNavigate(){
  try {
    // update the start timestamp.
    g_start = new Date().getTime();
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:8888/event/navigate", true);
    xhr.send();
  } catch (err) {
    LOG.warning("Error sending navigation XHR: " + err);
  }
}

// notification that the page loaded
function wptOnLoad(load_time){
  // close the debug window.
  if (LOG_WINDOW && g_debugWindow) {
    g_debugWindow.setEnabled(false);
    g_debugWindow.win_.close();
    g_debugWindow = null;
  }
  try {
    g_active = false;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:8888/event/load?load_time="+load_time, true);
    xhr.send();
  } catch (err) {
    LOG.warning("Error sending page load XHR: " + err);
  }
}

// install an onLoad handler for all tabs
chrome.tabs.onUpdated.addListener(function(tabId, props) {
  if (g_active){
    if (props.status == "loading")
      wptOnNavigate();
  }
});

// Add a listener for messages from script.js through message passing.
chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    LOG.info("Message from content script: " + request.message);
    if (request.message == "DOMElementLoaded") {
      try {
	var dom_element_time = new Date().getTime() - g_start;
        var xhr = new XMLHttpRequest();
        xhr.open("POST",
		"http://127.0.0.1:8888/event/dom_element?name_value="
		+ encodeURIComponent(request.name_value)
		+ "&time=" + dom_element_time,
		true);
        xhr.send();
      } catch (err) {
        LOG.warning("Error sending dom element xhr: " + err);
      }
    }
    else if (request.message == "AllDOMElementsLoaded") {
      try {
	var time = new Date().getTime() - g_start;
        var xhr = new XMLHttpRequest();
        xhr.open("POST",
		"http://127.0.0.1:8888/event/all_dom_elements_loaded?load_time=" + time,
		true);
        xhr.send();
      } catch (err) {
        LOG.warning("Error sending all dom elements loaded xhr: " + err);
      }
    }
    else if (request.message == "wptLoad") {
      wptOnLoad(request.load_time);
    }
    // TODO: check whether calling sendResponse blocks in the content script side in page.
    sendResponse({});
});

/***********************************************************
                      Script Commands
***********************************************************/

// execute a single task/script command
function wptExecuteTask(task){
  if (task.action.length) {
    if (task.record)
      g_active = true;
    else
      g_active = false;

    // decode and execute the actual command
    LOG.info("Running task " + task.action + " " + task.target);
    switch (task.action) {
      case "navigate":
        g_commandRunner.doNavigate(task.target);
        break;
      case "exec":
        g_commandRunner.doExec(task.target);
        break;
      case "setcookie":
        g_commandRunner.doSetCookie(task.target, task.value);
        break;
      case "block":
        g_commandRunner.doBlock(task.target);
        break;
      case "setdomelement":
        // Sending request to set the DOM element has to happen only at the
        // navigate event after the content script is loaded. So, this just
        // sets the global variable.
        wpt.commands.g_domElements.push(task.target);
        break;
      case "click":
        g_commandRunner.doClick(task.target);
        break;

      default:
        LOG.error("Unimplemented command: ", task);
    }

    if (!g_active)
      window.setTimeout(wptGetTask, TASK_INTERVAL_SHORT);
  }
}
