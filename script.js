"use strict"

let alarmSound, timerSound, mainContentArea, body, pageId, timeZoneRefreshFrame, layerView, alarmAlertLayer, removeAlarmAlert, timerAlertLayer, removeTimerAlert, vibrationInterval;

function alertVibrationPattern() {
  navigator.vibrate([1000, 1000]);
}

document.addEventListener('load', () => {
  document.querySelector('.preload').classList.remove('preload');
});

mainContentArea = document.querySelector('#main-content-area');
body = document.querySelector('body');

const timezones = (sessionStorage.getItem('timezones')) ?
JSON.parse(sessionStorage.getItem('timezones')) :
{
  losAngeles: ['Los Angeles', '-8', 'hide'],
  chicago: ['Chicago', '-6', 'hide'],
  newYork: ['New York', '-5', 'hide'],
  london: ['London', '+0', 'hide'],
  paris: ['Paris', '+1', 'hide'],
  moscow: ['Moscow', '+3', 'hide'],
  dubai: ['Dubai', '+4', 'hide'],
  singapore: ['Singapore', '+8', 'hide'],
  tokyo: ['Tokyo', '+9', 'hide'],
  sydney: ['Sydney', '+11', 'hide']
};

const alarms = [];

const stopwatch = (sessionStorage.getItem('stopwatch')) ?
JSON.parse(sessionStorage.getItem('stopwatch')) :
{
  laps: []
};

const timer = {};

function loadPageResources() {
  let alarmStorage, timerStorage;

  alarmSound = new Audio('clock_sounds/alarm_sound.mp3');
  alarmSound.loop = true;

  timerSound = new Audio('clock_sounds/timer_sound.mp3');
  timerSound.loop = true;
  
  alarmStorage = JSON.parse(sessionStorage.getItem('alarms'));
  timerStorage = JSON.parse(sessionStorage.getItem('timer'));

  if (alarmStorage?.length) {
    alarmStorage.forEach((item) => {
      alarms.push(item);
    });
  
    alarms.forEach((item) =>{
      if (item.state === 'on') {
        item.timeout = generateAlarmTimeout.call(item);
      }
    });
  }

  if (timerStorage?.startTime) {
    for (let keys in timerStorage) {
      timer[keys] = timerStorage[keys];
    }
    
    if (timer.state === 'play') {
      timer.timeout = generateTimerTimeout.call(timer);
    }
  }

  body.removeEventListener('click', loadPageResources, true);
}

body.addEventListener('click', loadPageResources, true);

function isItTodayTime(zone) {
  let homeTime, newTime, homeZone, difference;
  
  homeTime = new Date();
  newTime = new Date();

  homeZone = homeTime.getTimezoneOffset();
  newTime.setHours(homeTime.getHours() + (homeZone / 60) + zone);

  difference = (newTime.getDate()) - (homeTime.getDate());

  if (difference === -1) {return ['Yesterday', newTime.toLocaleString('en-GB', {hour: 'numeric', minute:'numeric'})];}
  else if (difference === 1) {return ['Tomorrow', newTime.toLocaleString('en-GB', {hour: 'numeric', minute:'numeric'})];}
  else {return ['Today', newTime.toLocaleString('en-GB', {hour: 'numeric', minute:'numeric'})];}
}

function alarmSetSessionStorage() {
  let alarmsTemp = JSON.parse(JSON.stringify(alarms));

  alarmsTemp.forEach((item) => {
    delete item.timeout;
  });

  sessionStorage.setItem('alarms', JSON.stringify(alarmsTemp));
}

function alarmAlertLayout() {
  alarmAlertLayer = document.createElement('div');
  alarmAlertLayer.setAttribute('id', 'alarm-alert-layer');
  alarmAlertLayer.setAttribute('class', 'alert-layer');

  layerView.insertBefore(alarmAlertLayer, layerView.childNodes[0]);

  alarmAlertLayer.innerHTML = `
  <div id="alarm-label-text" class="alert-text"></div>

  <button id="alarm-alert-stop" class="text-btn solid-btn click-effect">STOP</button>
  `;
}

function alarmStopBtnEvent() {
  let currentAlarmLabel = alarmAlertLayer.querySelector('#alarm-label-text').textContent;

  if (pageId === 'clock-main') {
    clearInterval(timeZoneRefreshFrame);
    renderWorldClock();
  } else if (pageId === 'alarm-main') {
    renderAlarm();
  } else if (pageId === 'stopwatch-main') {
    renderStopwatch();
  } else {
    renderTimer();
  }

  alarmAlertLayout();

  document.querySelector('#alarm-alert-stop').addEventListener('click', alarmStopBtnEvent);

  alarmAlertLayer.querySelector('#alarm-label-text').textContent = currentAlarmLabel;
  layerView.style.zIndex = 99;

  alarmAlertLayer.style.cssText = 'margin-bottom: 0;';

  requestAnimationFrame(() => {
    alarmAlertLayer.style.cssText = 'margin-bottom: 100vh;';
  });

  alarmSound.pause();
  alarmSound.currentTime = 0;

  if (navigator.vibrate) {
    clearInterval(vibrationInterval);
    navigator.vibrate(0);
  }

  removeAlarmAlert = setTimeout(() => {
    layerView.style.zIndex = 0;
    alarmAlertLayer.remove();
  }, parseFloat(getComputedStyle(alarmAlertLayer).transitionDuration) * 1000);
}

function alarmAlertFormat() {
  clearTimeout(removeAlarmAlert);

  if (!(document.querySelector('#alarm-alert-layer'))) {
    alarmAlertLayout();

    document.querySelector('#alarm-alert-stop').addEventListener('click', alarmStopBtnEvent);
  }

  if (document.querySelector('#timer-alert-layer')) {
    setTimeout(() => {
      alarmAlertLayer.style.zIndex = 4;
      timerSound.pause();
      timerSound.currentTime = 0;
    }, 20);
  }

  alarmSound.play();
  
  if (navigator.vibrate) {
    vibrationInterval = setInterval(() => {
      alertVibrationPattern();
    }, 2000);
  }

  alarmAlertLayer.querySelector('#alarm-label-text').textContent = this.label;

  layerView.style.zIndex = 99;
  
  requestAnimationFrame(() => {
    alarmAlertLayer.style.cssText = 'margin-bottom: 0;';
  });

  if (this.days.length) {
    this.timeout = generateAlarmTimeout.call(this);
  } else {
    this.state = 'off';
  }

  alarmSetSessionStorage();
}

function generateAlarmTimeout() {
  let timeArray, alarmTime, currentTime, difference;

  timeArray = this.time.split(':');
  alarmTime = new Date();
  currentTime = new Date();

  alarmTime.setHours(parseInt(timeArray[0]), parseInt(timeArray[1]), 0, 0);

  if (this.days.length) {
    let daysLength = this.days.length;
    for (let i = 0; i < daysLength; i++) {
      if (this.days[i] >= currentTime.getDay()) {
        alarmTime.setDate(currentTime.getDate() + this.days[i] - currentTime.getDay());

        if (alarmTime > currentTime) {
          break;
        }
      }
    }

    if ((alarmTime <= currentTime) || !(this.days.includes(alarmTime.getDay()))) {
      alarmTime.setDate(alarmTime.getDate() - currentTime.getDay() + this.days[0] + 7);
    }
  } else {
    while (alarmTime < currentTime) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }
  }

  difference = alarmTime - currentTime;

  return setTimeout(() => {
    alarmAlertFormat.call(this);
  }, difference);
}

function sortAlarmsData() {
  alarms.sort((a,b) => {
    let itemA, itemB;

    itemA = parseInt(a.time.replace(':',''));
    itemB = parseInt(b.time.replace(':',''));

    return itemA - itemB;
  });

  alarms.forEach((item, index) => {
    item.id = index + 1;
  });

  alarmSetSessionStorage();
}

function minMaxLapTimeIndex() {
  let min, max, lapLength;
  
  min = stopwatch.laps[0];
  max = stopwatch.laps[0];

  lapLength = stopwatch.laps.length;

  for (let i = 0; i < lapLength; i++) {
    if (min > stopwatch.laps[i]) {
      min = stopwatch.laps[i];
    }
  }

  for (let i = 0; i < lapLength; i++) {
    if (max < stopwatch.laps[i]) {
      max = stopwatch.laps[i];
    }
  }

  stopwatch.min = stopwatch.laps.indexOf(min) + 1;
  stopwatch.max = stopwatch.laps.indexOf(max) + 1;
}

function timerSetSessionStorage() {
  let timerTemp = JSON.parse(JSON.stringify(timer));

  delete timerTemp.timeout;

  sessionStorage.setItem('timer', JSON.stringify(timerTemp));
}

function timerAlertLayout() {
  timerAlertLayer = document.createElement('div');
  timerAlertLayer.setAttribute('id', 'timer-alert-layer');
  timerAlertLayer.setAttribute('class', 'alert-layer');

  layerView.insertBefore(timerAlertLayer, layerView.childNodes[0]);

  timerAlertLayer.innerHTML = `
  <div id="timer-label-text" class="alert-text"></div>

  <button id="timer-alert-stop" class="text-btn solid-btn click-effect">STOP</button>
  `;
}

function timerAlertFormat() {
  timerAlertLayout();

  document.querySelector('#timer-alert-stop').addEventListener('click', (e) => {
    if (pageId === 'clock-main') {
      clearInterval(timeZoneRefreshFrame);
      renderWorldClock();
    } else if (pageId === 'alarm-main') {
      renderAlarm();
    } else if (pageId === 'stopwatch-main') {
      renderStopwatch();
    } else {
      renderTimer();
    }

    timerAlertLayout();

    timerAlertLayer.querySelector('#timer-label-text').textContent = 'Timer';
    layerView.style.zIndex = 99;

    timerAlertLayer.style.cssText = 'margin-bottom: 0;';

    requestAnimationFrame(() => {
      timerAlertLayer.style.cssText = 'margin-bottom: 100vh;';
    });

    timerSound.pause();
    timerSound.currentTime = 0;

    if (navigator.vibrate) {
      clearInterval(vibrationInterval);
      navigator.vibrate(0);
    }

    removeTimerAlert = setTimeout(() => {
      layerView.style.zIndex = 0;
      timerAlertLayer.remove();
    }, parseFloat(getComputedStyle(timerAlertLayer).transitionDuration) * 1000);
  });

  if (layerView.childNodes[1] === document.querySelector('#alarm-alert-layer')) {
    setTimeout(() => {
      timerAlertLayer.style.zIndex = 3;
      alarmSound.pause();
      alarmSound.currentTime = 0;
    }, 20);
  }

  timerSound.play();
  
  if (navigator.vibrate) {
    vibrationInterval = setInterval(() => {
      alertVibrationPattern();
    }, 2000);
  }

  timerAlertLayer.querySelector('#timer-label-text').textContent = 'Timer';

  layerView.style.zIndex = 99;
  
  requestAnimationFrame(() => {
    timerAlertLayer.style.cssText = 'margin-bottom: 0;';
  });

  delete this.endTime;
  delete this.startTime;
  delete this.totalTime;
  delete this.timeout;
  delete this.state;

  timerSetSessionStorage();
}

function generateTimerTimeout() {
  let difference = this.endTime - Date.now();

  return setTimeout(() => {
    timerAlertFormat.call(timer);
  }, difference);
}

function renderWorldClock() {
  let currentTime, currentDate, currentTimeDate, myTimezones, layerContent, removeLayer, addLayer, savesLayout, removeLayout, addLayout, saveEntry, layerEntry, editBtn, doneBtn, manageLayer, layerHead, layerBtn;

  mainContentArea.innerHTML = `
  <div id="clock-main" class="main">
    <div class="layer-view">
      <div id="manage-timezones-layer" class="layer-overlay">
        <div class="layer-head">
          <div class="layer-heading">My Timezones</div>
  
          <div id="clock-done-btn" class="heading-btn btn-right">DONE</div>
        </div>
  
        <div class="layer-content">
          <div id="remove-layer" class="layer-area">
          </div>
    
          <div id="add-layer" class="layer-area">
          </div>
        </div>
      </div>
    </div>
  
    <div class="head-layer">
      <button id="clock-edit-btn" class="text-btn">EDIT</button>
    </div>
  
    <div id="date-time" class="section">
      <div id="current-time"></div>
  
      <div id="current-date"></div>
    </div>
  
    <div id="my-timezones" class="my-saves section">
    </div>
  </div>
  `;

  pageId = document.querySelector('.main').id;

  layerContent = document.querySelector('.layer-content');
  removeLayer = document.querySelector('#remove-layer');
  addLayer = document.querySelector('#add-layer');
  currentTime = document.querySelector('#current-time');
  currentDate = document.querySelector('#current-date');
  myTimezones = document.querySelector('#my-timezones');
  layerView = document.querySelector('.layer-view');
  editBtn = document.querySelector('#clock-edit-btn');
  doneBtn = document.querySelector('#clock-done-btn');
  manageLayer = document.querySelector('#manage-timezones-layer');
  layerHead = document.querySelector('.layer-head');

  manageLayer.addEventListener('scroll', () => {
    requestAnimationFrame(() => {
      if (manageLayer.scrollTop > 0) {
        layerHead.style.boxShadow = '0 2px 4px #00000033, 0 4px 5px #00000024, 0 1px 10px #0000001f';
      } else {
        layerHead.style.boxShadow = '0 2px 4px #ff000000, 0 4px 5px #ff000000, 0 1px 10px #ff000000';
      }
    });
  });

  function refreshTimeZones() {
    currentTimeDate = new Date();

    currentTime.textContent = currentTimeDate.toLocaleString('en-GB', {hour: 'numeric', minute:'numeric'});
    currentDate.textContent = currentTimeDate.toLocaleString('en-GB', {weekday: 'long', day: 'numeric', month: 'long'});

    saveEntry = document.querySelectorAll('.save-entry');
    layerEntry = document.querySelectorAll('.layer-entry');

    saveEntry.forEach((item) => {
      item.querySelector('.entry-info').textContent = `${isItTodayTime(parseInt(timezones[item.id][1]))[0]} (GMT ${timezones[item.id][1]})`;
      item.querySelector('.entry-time').textContent = isItTodayTime(parseInt(timezones[item.id][1]))[1];
    });

    layerEntry.forEach((item) => {
      item.querySelector('.entry-info').textContent = `${isItTodayTime(parseInt(timezones[item.id][1]))[0]} (GMT ${timezones[item.id][1]})`;
    });
  }
  refreshTimeZones();
  timeZoneRefreshFrame = setInterval(refreshTimeZones, 1000);

  function createTimeZones() {
    myTimezones.innerHTML = '';
    removeLayer.innerHTML = '';
    addLayer.innerHTML = '';

    for (let key in timezones) {
      if (timezones[key][2] === 'show') {
        savesLayout = `
        <div id="${key}" class="save-entry">
          <div class="entry-details">
            <div class="location">${timezones[key][0]}</div>
            <div class="entry-info">${isItTodayTime(parseInt(timezones[key][1]))[0]} (GMT ${timezones[key][1]})</div>
          </div>
  
          <div class="entry-time">${isItTodayTime(parseInt(timezones[key][1]))[1]}</div>
        </div>
        `;
  
        myTimezones.innerHTML += savesLayout;
  
        removeLayout = `
        <div id="${key}" class="layer-entry">
          <div class="entry-details">
            <div class="location">${timezones[key][0]}</div>
            <div class="entry-info">${isItTodayTime(parseInt(timezones[key][1]))[0]} (GMT ${timezones[key][1]})</div>
          </div>
  
          <div class="btn-area">
            <button class="small-btn remove-btn"><img class="small-btn-icon svg-red" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTIgMGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnptNiAxM2gtMTJ2LTJoMTJ2MnoiLz48L3N2Zz4="></button>
          </div>
        </div>
        `;
  
        removeLayer.innerHTML += removeLayout;
      } else {
        addLayout = `
        <div id="${key}" class="layer-entry">
          <div class="entry-details">
            <div class="location">${timezones[key][0]}</div>
            <div class="entry-info">${isItTodayTime(parseInt(timezones[key][1]))[0]} (GMT ${timezones[key][1]})</div>
          </div>
      
          <div class="btn-area"><button class="small-btn add-btn"><img class="small-btn-icon svg-green" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTIgMGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnptNiAxM2gtNXY1aC0ydi01aC01di0yaDV2LTVoMnY1aDV2MnoiLz48L3N2Zz4="></button>
          </div>
        </div>
        `;
  
        addLayer.innerHTML += addLayout;
      }
    }

    if (!(removeLayer.children.length)) {
      removeLayer.style.display = 'none';
    } else {
      removeLayer.style.display = '';
    }

  }

  createTimeZones();
  layerBtn = document.querySelectorAll('.remove-btn, .add-btn');

  function layerBtnEvent(e) {
    let btnElement, entryElement;

    btnElement = e.target.closest('.small-btn');
    entryElement = e.target.closest('.layer-entry');

    if (btnElement.classList.contains('add-btn')) {
      timezones[entryElement.id][2] = 'show';
    } else {
      timezones[entryElement.id][2] = 'hide';
    }

    createTimeZones();

    layerBtn = document.querySelectorAll('.remove-btn, .add-btn');

    layerBtn.forEach((item) => {
      item.addEventListener('click', layerBtnEvent);
    });

    sessionStorage.setItem('timezones', JSON.stringify(timezones));
  }

  editBtn.addEventListener('click', () => {
    manageLayer.scrollTop = 0;

    manageLayer.style.marginTop = 0;
    layerView.style.cssText = 'z-index: 99; background-color: #0000001a;';

    setTimeout(() => {
      layerHead.style.position = 'fixed';
      layerHead.style.margin = `0 ${(innerWidth - manageLayer.offsetWidth) / 2}px`;
      layerContent.style.marginTop = `${layerHead.offsetHeight}px`;
    }, parseFloat(getComputedStyle(manageLayer)['transition-duration']) * 1000);
  });

  doneBtn.addEventListener('click', () => {
    manageLayer.style.marginTop = '100vh';
    layerView.style.backgroundColor = '#ff000000';

    layerHead.style.position = 'sticky';
    layerHead.style.margin = 0;
    layerContent.style.marginTop = 0;
    setTimeout(() => {layerView.style.zIndex = 0;}, parseFloat(getComputedStyle(manageLayer)['transition-duration']) * 1000);
  });

  layerBtn.forEach((item) => {
    item.addEventListener('click', layerBtnEvent);
  });
}

renderWorldClock();

function renderAlarm() {
  let addAlarmLayer, addAlarmBtn, hourInputArea, hourInput, minuteInputArea, minuteInput, hoursValue, minutesValue, addAlarmCancel, addAlarmDone, alarmName, addAlarmLabel, myAlarms, alarmsLayout, repeatCheckboxes, editAlarmBtn, editAlarmDone, alarmNumber;

  mainContentArea.innerHTML = `
  <div id="alarm-main" class="main">
    <div class="layer-view">
      <div id="add-alarm-layer" class="layer-overlay alarm-layer">
        <div class="layer-head edit-head">
          <div id="add-alarm-cancel" class="heading-btn btn-left">CANCEL</div>
  
          <div class="layer-heading">Add Alarm</div>
  
          <div id="add-alarm-done" class="heading-btn btn-right">DONE</div>
        </div>
  
        <div id="add-alarm-time" class="edit-time">
          <div id="hour-input-area" class="digit-input-area">
            <input id="hour-input" type="number" class="digit-input" inputmode="numeric" pattern="[0-9]*">
          </div>
          <span class="digit-colon">:</span>
          <div id="minute-input-area" class="digit-input-area">
            <input id="minute-input" type="number" class="digit-input" inputmode="numeric" pattern="[0-9]*">
          </div>
        </div>

        <div id="repeat-alarm">
          <label for="sunday-checkbox">Su</label>
          <label for="monday-checkbox">Mo</label>
          <label for="tuesday-checkbox">Tu</label>
          <label for="wednesday-checkbox">We</label>
          <label for="thursday-checkbox">Th</label>
          <label for="friday-checkbox">Fr</label>
          <label for="saturday-checkbox">Sa</label>

          <input id="sunday-checkbox" type="checkbox" name="repeat-alarm" value="sunday">
          <input id="monday-checkbox" type="checkbox" name="repeat-alarm" value="monday">
          <input id="tuesday-checkbox" type="checkbox" name="repeat-alarm" value="tuesday">
          <input id="wednesday-checkbox" type="checkbox" name="repeat-alarm" value="wednesday">
          <input id="thursday-checkbox" type="checkbox" name="repeat-alarm" value="thursday">
          <input id="friday-checkbox" type="checkbox" name="repeat-alarm" value="friday">
          <input id="saturday-checkbox" type="checkbox" name="repeat-alarm" value="saturday">
        </div>

        <div class="add-layer-label">
          <label for="alarm-name">Label</label>
  
          <input id="alarm-name" type="text" maxlength="20" placeholder="Alarm">
        </div>
      </div>
    </div>
  
    <div class="head-layer">
      <button id="alarm-edit-btn" class="text-btn heading-btn btn-left">EDIT</button>
      
      <button id="edit-alarm-done" class="text-btn solid-btn click-effect btn-center">DONE</button>

      <button id="alarm-add-btn" class="icon-btn heading-btn btn-right"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMjQgMTBoLTEwdi0xMGgtNHYxMGgtMTB2NGgxMHYxMGg0di0xMGgxMHoiLz48L3N2Zz4="></button>
    </div>
  
    <div id="my-alarms" class="my-saves section">
    </div>
  </div>
  `;

  pageId = document.querySelector('.main').id;

  layerView = document.querySelector('.layer-view');
  addAlarmLayer = document.querySelector('#add-alarm-layer');
  addAlarmBtn = document.querySelector('#alarm-add-btn');
  hourInputArea = document.querySelector('#hour-input-area');
  hourInput = document.querySelector('#hour-input');
  minuteInputArea = document.querySelector('#minute-input-area');
  minuteInput = document.querySelector('#minute-input');
  addAlarmCancel = document.querySelector('#add-alarm-cancel');
  addAlarmDone = document.querySelector('#add-alarm-done');
  alarmName = document.querySelector('#alarm-name');
  addAlarmLabel = document.querySelector('.add-layer-label');
  myAlarms = document.querySelector('#my-alarms');
  repeatCheckboxes = document.querySelectorAll('input[type="checkbox"]');
  editAlarmBtn = document.querySelector('#alarm-edit-btn');
  editAlarmDone = document.querySelector('#edit-alarm-done');

  addAlarmLayer.style.overflowY = 'hidden';
  editAlarmDone.style.display = 'none';

  hourInput.addEventListener('focus', () => {
    hourInputArea.style.borderColor = '#1470eb';
  });

  hourInput.addEventListener('blur', () => {
    hourInputArea.style.borderColor = '#747c8b66';
  });

  minuteInput.addEventListener('focus', () => {
    minuteInputArea.style.borderColor = '#1470eb';
  });

  minuteInput.addEventListener('blur', () => {
    minuteInputArea.style.borderColor = '#747c8b66';
  });

  alarmName.addEventListener('focus', () => {
    addAlarmLabel.style.borderColor = '#1470eb';
  });

  alarmName.addEventListener('blur', () => {
    addAlarmLabel.style.borderColor = '#747c8b66';
  });

  function editExist() {
    if (!(alarms.length)) {
      editAlarmBtn.style.display = 'none';
    } else {
      editAlarmBtn.style.display = '';
    }
  }
  
  editExist();

  function addLayerResize() {
    addAlarmLayer.style.marginTop = `${innerHeight - addAlarmLayer.offsetHeight}px`;
  }

  addAlarmBtn.addEventListener('click', () => {
    repeatCheckboxes.forEach((item) => {
      let labelBox = document.querySelector(`[for=${item.id}]`);

      if (item.checked) {
        item.checked = false;
        labelBox.style.backgroundColor = '#ff000000';
      }
    });

    addAlarmLayer.style.marginTop = `${innerHeight - addAlarmLayer.offsetHeight}px`;

    window.addEventListener('resize', addLayerResize);

    layerView.style.cssText = 'z-index: 99; background-color: #0000001a;';
    hoursValue = '00';
    minutesValue = '00';
    hourInput.value = '00';
    minuteInput.value = '00';
    alarmName.value = '';
  });

  function removeAddAlarmLayer() {
    window.removeEventListener('resize', addLayerResize);

    addAlarmLayer.style.marginTop = '100vh';
    layerView.style.backgroundColor = '#ff000000';
    setTimeout(() => {layerView.style.zIndex = 0;}, parseFloat(getComputedStyle(addAlarmLayer)['transition-duration']) * 1000);
  }

  addAlarmCancel.addEventListener('click', removeAddAlarmLayer);

  function digitInputFocus (e) {
    e.preventDefault();

    if (e.target === hourInput) {
      if (e.key === 'Backspace') {
        hoursValue = '00';
      } else if ((isFinite(e.key)) && (e.key !== ' ')) {
        if (hoursValue.length === 0) {
          hoursValue += e.key;
        } else if (hoursValue.length === 1) {
          hoursValue += e.key;
          minuteInput.focus();
        } else {
          hoursValue = '';
          hoursValue += e.key;
        }
      }

      if (parseInt(hoursValue) > 23) {
        hoursValue = '23'
      }

      hourInput.value = ((hoursValue.length < 2) ? '0' : '') + hoursValue;
    } else if (e.target === minuteInput) {
      if (e.key === 'Backspace') {
        minutesValue = '00';
      } else if ((isFinite(e.key)) && (e.key !== ' ')) {
        if (minutesValue.length === 0) {
          minutesValue += e.key;
        } else if (minutesValue.length === 1) {
          minutesValue += e.key;
          minuteInput.blur();
        } else {
          minutesValue = '';
          minutesValue += e.key;
        }
      }

      if (parseInt(minutesValue) > 59) {
        minutesValue = '59';
      }

      minuteInput.value = ((minutesValue.length < 2) ? '0' : '') + minutesValue;
    }
  }

  hourInput.addEventListener('keydown', digitInputFocus);
  minuteInput.addEventListener('keydown', digitInputFocus);

  function updateSavedAlarmsData() {
    let alarmObject;
    alarmObject = {};
    alarmObject.days = [];

    alarmObject.label = alarmName.value;
    alarmObject.time = `${hourInput.value}:${minuteInput.value}`;

    repeatCheckboxes.forEach((item) => {
      if (item.checked) {
        switch (item.value) {
          case 'sunday':
            alarmObject.days.push(0);
            break;
          case 'monday':
            alarmObject.days.push(1);
            break;
          case 'tuesday':
            alarmObject.days.push(2);
            break;
          case 'wednesday':
            alarmObject.days.push(3);
            break;
          case 'thursday':
            alarmObject.days.push(4);
            break;
          case 'friday':
            alarmObject.days.push(5);
            break;
          case 'saturday':
            alarmObject.days.push(6);
            break;
        }
      }
    });

    alarmObject.state = 'on';
    alarms.push(alarmObject);

    alarmObject.timeout = generateAlarmTimeout.call(alarmObject);

    sortAlarmsData();
  }

  repeatCheckboxes.forEach((item) => {
    item.addEventListener('change', (e) => {
      let labelBox = document.querySelector(`[for=${item.id}]`);

      if (item.checked) {
        labelBox.style.backgroundColor = '#ffffff';
      } else {
        labelBox.style.backgroundColor = '#ff000000';
      }
    });
  });

  function createAlarmsLayout() {
    myAlarms.innerHTML = '';

    alarms.forEach((item) => {
      alarmsLayout = `
      <div id="alarm${item.id}" class="save-entry">
        <div class="entry-details">
          <div class="entry-time">${item.time}</div>
          <div class="entry-info"></div>
        </div>

        <div class="btn-area">
        </div>
      </div> 
      `;
      myAlarms.innerHTML += alarmsLayout;

      if (item.days.length) {
        let daysText = [];

        item.days.forEach((entry) => {
          if (entry === 0) {
            daysText.push('Sun');
          } else if (entry === 1) {
            daysText.push('Mon');
          } else if (entry === 2) {
            daysText.push('Tue');
          } else if (entry === 3) {
            daysText.push('Wed');
          } else if (entry === 4) {
            daysText.push('Thu');
          } else if (entry === 5) {
            daysText.push('Fri');
          } else if (entry === 6) {
            daysText.push('Sat');
          }
        });
        
        if (daysText.length === 1) {
          if (daysText.includes('Sun')) {
            daysText = ['Every Sunday'];
          } else if (daysText.includes('Mon')) {
            daysText = ['Every Monday'];
          } else if (daysText.includes('Tue')) {
            daysText = ['Every Tuesday'];
          } else if (daysText.includes('Wed')) {
            daysText = ['Every Wednesday'];
          } else if (daysText.includes('Thu')) {
            daysText = ['Every Thursday'];
          } else if (daysText.includes('Fri')) {
            daysText = ['Every Friday'];
          } else if (daysText.includes('Sat')) {
            daysText = ['Every Saturday'];
          }
        } else if (daysText.length === 2 && daysText.includes('Sun') && daysText.includes('Sat')) {
          daysText = ['Weekends'];
        } else if (daysText.length === 5 && !(daysText.includes('Sat')) && !(daysText.includes('Sun'))) {
          daysText = ['Weekdays'];
        } else if (daysText.length === 7) {
          daysText = ['Every day']
        }

        document.querySelector(`#alarm${item.id} .entry-info`).textContent = `${item.label}, ${daysText.join(' ')}`;
      } else {
        document.querySelector(`#alarm${item.id} .entry-info`).textContent = item.label;
      }
    });
  }

  function createAlarms() {
    createAlarmsLayout();

    document.querySelectorAll('.save-entry').forEach((item) => {
      if (alarms[parseInt(item.id.slice(5)) - 1].state === 'on') {
        item.querySelector('.btn-area').innerHTML = `<button class="toggle-btn"><img class="alarm-toggle svg-green" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik02IDE4aDEyYzMuMzExIDAgNi0yLjY4OSA2LTZzLTIuNjg5LTYtNi02aC0xMi4wMzljLTMuMjkzLjAyMS01Ljk2MSAyLjcwMS01Ljk2MSA2IDAgMy4zMTEgMi42ODggNiA2IDZ6bTEyLTEwYy0yLjIwOCAwLTQgMS43OTItNCA0czEuNzkyIDQgNCA0IDQtMS43OTIgNC00LTEuNzkyLTQtNC00eiIvPjwvc3ZnPg=="></button>`;
      } else {
        item.querySelector('.btn-area').innerHTML = `<button class="toggle-btn"><img class="alarm-toggle" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0xOCAxOGgtMTJjLTMuMzExIDAtNi0yLjY4OS02LTZzMi42ODktNiA2LTZoMTIuMDM5YzMuMjkzLjAyMSA1Ljk2MSAyLjcwMSA1Ljk2MSA2IDAgMy4zMTEtMi42ODggNi02IDZ6bS0xMi0xMGMyLjIwOCAwIDQgMS43OTIgNCA0cy0xLjc5MiA0LTQgNC00LTEuNzkyLTQtNCAxLjc5Mi00IDQtNHoiLz48L3N2Zz4="></button>`;
        item.querySelector('.alarm-toggle').style.cssText = 'filter: invert(35%) sepia(12%) saturate(410%) hue-rotate(176deg) brightness(94%) contrast(94%);';
        item.querySelector('.entry-details').style.color = '#535a64';
      }

      item.querySelectorAll('.toggle-btn').forEach((element) => {
        element.addEventListener('click', (e) => {
          if (alarms[parseInt(item.id.slice(5)) - 1].state === 'on') {
            alarms[parseInt(item.id.slice(5)) - 1].state = 'off';
            clearTimeout(alarms[parseInt(item.id.slice(5)) - 1].timeout);
          } else {
            alarms[parseInt(item.id.slice(5)) - 1].state = 'on';
            alarms[parseInt(item.id.slice(5)) - 1].timeout = generateAlarmTimeout.call(alarms[parseInt(item.id.slice(5)) - 1]);
          }

          createAlarms();
          
          alarmSetSessionStorage();
        });
      });
    });
  }
  
  createAlarms();

  function setNewAlarm() {
    alarmName.value = (alarmName.value) ? alarmName.value : 'Alarm';

    updateSavedAlarmsData();

    createAlarms();

    removeAddAlarmLayer();
    
    editExist();
  }

  addAlarmDone.addEventListener('click', setNewAlarm);

  function createEditAlarmsEntry() {
    createAlarmsLayout();

    document.querySelectorAll('.save-entry').forEach((item) => {
      item.querySelector('.btn-area').innerHTML = `<button class="small-btn remove-btn"><img class="small-btn-icon svg-red" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTIgMGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnptNiAxM2gtMTJ2LTJoMTJ2MnoiLz48L3N2Zz4="></button>`;

      item.querySelector('.entry-details').addEventListener('click', (e) => {
        let timeArea, arrayObject;

        alarmNumber = parseInt(item.id.slice(5)) - 1;
        
        timeArea = (item.querySelector('.entry-time').textContent).split(':');
        arrayObject = alarms[parseInt(item.id.slice(5)) - 1];

        hourInput.value = timeArea[0];
        minuteInput.value = timeArea[1];

        repeatCheckboxes.forEach((inputItem) => {
          if (inputItem.checked) {
            inputItem.checked = false;
            document.querySelector(`[for=${inputItem.id}]`).style.backgroundColor = '#ff000000';
          }
        });

        if (arrayObject.days.length) {
          arrayObject.days.forEach((element) => {
            repeatCheckboxes[element].checked = true;
            document.querySelector(`[for=${repeatCheckboxes[element].id}`).style.backgroundColor = '#ffffff';
          });
        }

        alarmName.value = (arrayObject.label === 'Alarm') ? '' : arrayObject.label;

        addAlarmLayer.style.marginTop = `${innerHeight - addAlarmLayer.offsetHeight}px`;

        window.addEventListener('resize', addLayerResize);

        layerView.style.cssText = 'z-index: 99; background-color: #0000001a;';
      });

      item.querySelector('.remove-btn').addEventListener('click', (e) => {
        clearTimeout(alarms[parseInt(item.id.slice(5)) - 1].timeout);
        alarms.splice((parseInt(item.id.slice(5)) - 1), 1);

        sortAlarmsData();

        if (alarms.length === 0) {
          renderAlarm();
        } else {
          createEditAlarmsEntry();
        }

      });
    });
  }

  function setEditedAlarm() {
    clearTimeout(alarms[alarmNumber].timeout);
    alarms.splice(alarmNumber, 1);

    alarmName.value = (alarmName.value) ? alarmName.value : 'Alarm';

    updateSavedAlarmsData();

    window.removeEventListener('resize', addLayerResize);

    renderAlarm();
  }

  function editAlarms() {
    editAlarmDone.style.display = '';
    addAlarmBtn.style.display = 'none';
    editAlarmBtn.style.display = 'none';
    layerView.querySelector('.layer-heading').textContent = 'Edit Alarm';

    addAlarmDone.removeEventListener('click', setNewAlarm);
    addAlarmDone.addEventListener('click', setEditedAlarm);

    createEditAlarmsEntry();
  }
  
  editAlarmBtn.addEventListener('click', editAlarms);
  
  editAlarmDone.addEventListener('click', (e) => {
    editAlarmDone.style.display = 'none';
    addAlarmBtn.style.display = '';
    editAlarmBtn.style.display = '';
    layerView.querySelector('.layer-heading').textContent = 'Add Alarm';

    addAlarmDone.removeEventListener('click', setEditedAlarm);
    addAlarmDone.addEventListener('click', setNewAlarm);
    
    editExist();
    createAlarms();
  });
}

function renderStopwatch() {
  let stopwatchLapResetBtn, stopwatchStateBtn, stopwatchTime, elapsedTimeTemp, elapsedLapTimeTemp, stopwatchRefreshFrame, runningLap, lapSaves, lapsLayout;

  mainContentArea.innerHTML = `
  <div id="stopwatch-main" class="main">
    <div id class="layer-view">
      <div id="stopwatch-body">
        <div id="stopwatch-time-area">
          <span id="stopwatch-time">00:00:00.00</span>
        </div>

        <div id="stopwatch-btns" class="head-layer">
          <button id="stopwatch-lap-reset-btn" class="text-btn solid-btn">LAP</button>

          <button id="stopwatch-state-btn" class="text-btn solid-btn click-effect">START</button>
        </div>
      
        <div class="lap-area">
          <div id="running-lap" class="add-layer-label lap-entry">
            <div class="alarm-label">Lap 1</div>
    
            <div class="lap-time"></div>
          </div>

          <div id="lap-saves"></div>
        </div>
      </div>
    </div>
  </div>
  `;

  pageId = document.querySelector('.main').id;

  layerView = document.querySelector('.layer-view');
  stopwatchLapResetBtn = document.querySelector('#stopwatch-lap-reset-btn');
  stopwatchStateBtn = document.querySelector('#stopwatch-state-btn');
  stopwatchTime = document.querySelector('#stopwatch-time');
  runningLap = document.querySelector('#running-lap');
  lapSaves = document.querySelector('#lap-saves');

  runningLap.style.display = 'none';

  stopwatch.elapsedTime = (stopwatch.elapsedTime) ? stopwatch.elapsedTime : 0;
  stopwatch.elapsedLapTime = (stopwatch.elapsedLapTime) ? stopwatch.elapsedLapTime : 0;

  function formatTime(value) {
    let hours, minutes, seconds, milliseconds;

    hours = Math.floor(value / 3600000);
    minutes = Math.floor(value / 60000) % 60;
    seconds = Math.floor(value / 1000) % 60;
    milliseconds = parseInt((value % 1000) / 10);

    hours = ((hours < 10) ? '0' : '') + hours;
    minutes = ((minutes < 10) ? '0' : '') + minutes;
    seconds = ((seconds < 10) ? '0' : '') + seconds;
    milliseconds = ((milliseconds < 10) ? '0' : '') + milliseconds;

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  function refreshStopwatch() {
    elapsedTimeTemp = (Date.now() - stopwatch.start + stopwatch.elapsedTime);
    elapsedLapTimeTemp = (Date.now() - stopwatch.lapStart + stopwatch.elapsedLapTime);
    
    stopwatchTime.textContent = formatTime(elapsedTimeTemp);

    runningLap.innerHTML = `
    <div class="alarm-label">Lap ${stopwatch.laps.length + 1}</div>
      
    <div class="lap-time">${formatTime(elapsedLapTimeTemp)}</div>
    `;

    stopwatchRefreshFrame = requestAnimationFrame(refreshStopwatch);
  }

  if (stopwatch.state === 'play') {
    runningLap.style.display = '';

    requestAnimationFrame(() => {
      refreshStopwatch();
    });

    createLaps();

    stopwatchLapResetBtn.classList.add('click-effect');

    stopwatchLapResetBtn.style.backgroundColor = '#1a1a1a';
    stopwatchStateBtn.style.backgroundColor = '#d60000';

    stopwatchStateBtn.textContent = 'STOP';
  } else if (stopwatch.state === 'pause') {
    stopwatchTime.textContent = formatTime(stopwatch.elapsedTime);

    runningLap.style.display = '';

    runningLap.innerHTML = `
    <div class="alarm-label">Lap ${stopwatch.laps.length + 1}</div>
      
    <div class="lap-time">${formatTime(stopwatch.elapsedLapTime)}</div>
    `;

    createLaps();

    stopwatchLapResetBtn.classList.add('click-effect');

    stopwatchLapResetBtn.style.backgroundColor = '#1a1a1a';
    stopwatchStateBtn.style.backgroundColor = '#00b800';

    stopwatchLapResetBtn.textContent = 'RESET';
  }

  function startPauseStopwatch () {
    if (stopwatch.state !== 'play') {
      stopwatch.start = new Date().getTime();
      stopwatch.lapStart = new Date().getTime();

      runningLap.style.display = '';

      requestAnimationFrame(refreshStopwatch);

      stopwatch.state = 'play';

      stopwatchLapResetBtn.classList.add('click-effect');

      stopwatchLapResetBtn.style.backgroundColor = '#1a1a1a';
      stopwatchStateBtn.style.backgroundColor = '#d60000';

      stopwatchLapResetBtn.textContent = 'LAP';
      stopwatchStateBtn.textContent = 'STOP';
    } else {
      cancelAnimationFrame(stopwatchRefreshFrame);

      stopwatch.elapsedTime = elapsedTimeTemp;
      stopwatch.elapsedLapTime = elapsedLapTimeTemp;

      stopwatch.state = 'pause';

      stopwatchStateBtn.style.backgroundColor = '#00b800';

      stopwatchLapResetBtn.textContent = 'RESET';
      stopwatchStateBtn.textContent = 'START';
    }

    sessionStorage.setItem('stopwatch', JSON.stringify(stopwatch));
  }

  stopwatchStateBtn.addEventListener('click', startPauseStopwatch);

  function createLaps() {
    let stopwatchLapLength = stopwatch.laps.length;
    
    lapSaves.innerHTML = '';

    for (let i = stopwatchLapLength - 1; i >= 0; i--) {
      lapsLayout = `
      <div id="Lap${i + 1}" class="add-layer-label lap-entry">
        <div class="alarm-label">Lap ${i + 1}</div>

        <div class="lap-time">${formatTime(stopwatch.laps[i])}</div>
      </div>
      `;
      lapSaves.innerHTML += lapsLayout;
    }

    if (stopwatch.laps.length > 1) {
      document.querySelector(`#Lap${stopwatch.min}`).style.color = '#008000';
      document.querySelector(`#Lap${stopwatch.max}`).style.color = '#ff0000';
    }
  }

  function lapResetStopwatch() {
    if (stopwatch.state === 'play') {
      stopwatch.laps.push(Date.now() - stopwatch.lapStart + stopwatch.elapsedLapTime);

      if (stopwatch.laps.length > 1) {
        minMaxLapTimeIndex();
      }

      stopwatch.lapStart = new Date().getTime();
      stopwatch.elapsedLapTime = 0;

      createLaps();
    } else if (stopwatch.state === 'pause') {
      delete stopwatch.start;
      delete stopwatch.lapStart;
      delete stopwatch.min;
      delete stopwatch.max;
      delete stopwatch.state;

      stopwatch.elapsedTime = 0;
      stopwatch.elapsedLapTime = 0;
      
      stopwatchTime.textContent = formatTime(0);
      runningLap.style.display = 'none';

      stopwatch.laps = [];

      lapSaves.innerHTML = '';

      stopwatchLapResetBtn.classList.remove('click-effect');

      stopwatchLapResetBtn.style.backgroundColor = '#5c5c5c';
      stopwatchLapResetBtn.textContent = 'LAP';
    }

    sessionStorage.setItem('stopwatch', JSON.stringify(stopwatch));
  }

  stopwatchLapResetBtn.addEventListener('click', lapResetStopwatch);
}

function renderTimer() {
  let addTimerTime, timerTimeArea, timerTime, ringTimeArea, ringTime, hourInputArea, timerHourInput, minuteInputArea, timerMinuteInput, secondInputArea, timerSecondInput, timerStartPauseBtn, timerCancelBtn, hoursValue, minutesValue, secondsValue, timerRefreshFrame;

  mainContentArea.innerHTML = `
  <div id="timer-main" class="main">
    <div class="layer-view">
      <div id="timer-body">
        <div class="timer-area">
          <div id="add-timer-time" class="edit-time">
            <div id="hour-input-area" class="digit-input-area">
              <span class="input-guide">H</span>
        
              <input id="timer-hour-input" type="number" class="digit-input" inputmode="numeric" pattern="[0-9]*">
            </div>
            <span class="digit-colon">:</span>
            <div id="minute-input-area" class="digit-input-area">
              <span class="input-guide">M</span>
        
              <input id="timer-minute-input" type="number" class="digit-input" inputmode="numeric" pattern="[0-9]*">
            </div>
            <span class="digit-colon">:</span>
            <div id="second-input-area" class="digit-input-area">
              <span class="input-guide">S</span>
        
              <input id="timer-second-input" type="number" class="digit-input" inputmode="numeric" pattern="[0-9]*">
            </div>
          </div>
      
          <div id="timer-time-area">
            <span id="timer-time">00:10:00</span>
          </div>
      
          <div id="ring-time-area">
            <img id="ring-time-icon" class="icon" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTcuMTU1IDIxLjEzNnYuMDE4YTIuODQ2IDIuODQ2IDAgMSAwIDUuNjkgMHYtLjAxOGgtNS42OVptMTEuOTMtMy41NTctMi41Ni0zLjc2MlY5LjEyM2E2LjUyNiA2LjUyNiAwIDAgMC01LjI0Ni02LjM5OFYxLjI3OWExLjI4IDEuMjggMCAwIDAtMi41NTggMHYxLjQ0NmE2LjUyNiA2LjUyNiAwIDAgMC01LjI0NSA2LjM5OHY0LjY5NEwuOTE1IDE3LjU3OWExLjI5NCAxLjI5NCAwIDAgMCAxLjA3IDIuMDIxaDE2LjAzYTEuMjk0IDEuMjk0IDAgMCAwIDEuMDctMi4wMjFaIiBmaWxsPSIjMDAwIi8+PC9zdmc+">

            <div id="ring-time">23:49</div>
          </div>
        </div>
      
        <div id="timer-btns" class="head-layer">
          <button id="timer-cancel-btn" class="text-btn solid-btn">CANCEL</button>
      
          <button id="timer-start-pause-btn" class="text-btn solid-btn click-effect">START</button>
        </div>
      </div>
    </div>
  </div>
  `;

  pageId = document.querySelector('.main').id;

  layerView = document.querySelector('.layer-view');
  addTimerTime = document.querySelector('#add-timer-time');
  timerTimeArea = document.querySelector('#timer-time-area');
  timerTime = document.querySelector('#timer-time');
  ringTimeArea = document.querySelector('#ring-time-area');
  ringTime = document.querySelector('#ring-time');
  hourInputArea = document.querySelector('#hour-input-area');
  timerHourInput = document.querySelector('#timer-hour-input');
  minuteInputArea = document.querySelector('#minute-input-area');
  timerMinuteInput = document.querySelector('#timer-minute-input');
  secondInputArea = document.querySelector('#second-input-area');
  timerSecondInput = document.querySelector('#timer-second-input');
  timerStartPauseBtn = document.querySelector('#timer-start-pause-btn');
  timerCancelBtn = document.querySelector('#timer-cancel-btn');

  timer.elapsedTime = (timer.elapsedTime) ? timer.elapsedTime : 0;

  timerHourInput.addEventListener('focus', () => {
    hourInputArea.style.borderColor = '#1470eb';
  });

  timerHourInput.addEventListener('blur', () => {
    hourInputArea.style.borderColor = '#747c8b66';
  });

  timerMinuteInput.addEventListener('focus', () => {
    minuteInputArea.style.borderColor = '#1470eb';
  });

  timerMinuteInput.addEventListener('blur', () => {
    minuteInputArea.style.borderColor = '#747c8b66';
  });

  timerSecondInput.addEventListener('focus', () => {
    secondInputArea.style.borderColor = '#1470eb';
  });

  timerSecondInput.addEventListener('blur', () => {
    secondInputArea.style.borderColor = '#747c8b66';
  });

  if (!(timer.startTime)) {
    timerTimeArea.style.opacity = 0;
    ringTimeArea.style.opacity = 0;
    timerCancelBtn.style.backgroundColor = '#5c5c5c';

    hoursValue = '00';
    minutesValue = '10';
    secondsValue = '00';

    timerHourInput.value = '00';
    timerMinuteInput.value = '10';
    timerSecondInput.value = '00';
  } else if (timer.state === 'play') {
    addTimerTime.style.display = 'none';

    timerRefreshFrame = requestAnimationFrame(refreshTimer);
    
    updateRingTime();

    timerCancelBtn.classList.add('click-effect');

    timerCancelBtn.style.backgroundColor = '#1a1a1a';
    timerStartPauseBtn.style.backgroundColor = '#1470eb';

    timerStartPauseBtn.textContent = 'PAUSE';
  } else if (timer.state === 'pause') {
    addTimerTime.style.display = 'none';

    timerTime.textContent = formatTime(timer.totalTime - timer.elapsedTime);
    
    ringTimeArea.style.opacity = 0.6;
    ringTime.textContent = new Date(timer.endTime).toLocaleString('en-GB', {hour: 'numeric', minute:'numeric'});

    timerCancelBtn.classList.add('click-effect');

    timerCancelBtn.style.backgroundColor = '#1a1a1a';
    timerStartPauseBtn.style.backgroundColor = '#00b800';

    timerStartPauseBtn.textContent = 'RESUME';
  }

  function timerDigitInputFocus (e) {
    e.preventDefault();

    if (e.target === timerHourInput) {
      if (e.key === 'Backspace') {
        hoursValue = '00';
      } else if ((isFinite(e.key)) && (e.key !== ' ')) {
        if (hoursValue.length === 0) {
          hoursValue += e.key;
        } else if (hoursValue.length === 1) {
          hoursValue += e.key;
          timerMinuteInput.focus();
        } else {
          hoursValue = '';
          hoursValue += e.key;
        }
      }

      if (parseInt(hoursValue) > 23) {
        hoursValue = '23'
      }

      timerHourInput.value = ((hoursValue.length < 2) ? '0' : '') + hoursValue;
    } else if (e.target === timerMinuteInput) {
      if (e.key === 'Backspace') {
        minutesValue = '00';
      } else if ((isFinite(e.key)) && (e.key !== ' ')) {
        if (minutesValue.length === 0) {
          minutesValue += e.key;
        } else if (minutesValue.length === 1) {
          minutesValue += e.key;
          timerSecondInput.focus();
        } else {
          minutesValue = '';
          minutesValue += e.key;
        }
      }

      if (parseInt(minutesValue) > 59) {
        minutesValue = '59';
      }

      timerMinuteInput.value = ((minutesValue.length < 2) ? '0' : '') + minutesValue;
    } else if (e.target === timerSecondInput) {
      if (e.key === 'Backspace') {
        secondsValue = '00';
      } else if ((isFinite(e.key)) && (e.key !== ' ')) {
        if (secondsValue.length === 0) {
          secondsValue += e.key;
        } else if (secondsValue.length === 1) {
          secondsValue += e.key;
          timerSecondInput.blur();
        } else {
          secondsValue = '';
          secondsValue += e.key;
        }
      }

      if (parseInt(secondsValue) > 59) {
        secondsValue = '59';
      }

      timerSecondInput.value = ((secondsValue.length < 2) ? '0' : '') + secondsValue;
    }
  }

  timerHourInput.addEventListener('keydown', timerDigitInputFocus);
  timerMinuteInput.addEventListener('keydown', timerDigitInputFocus);
  timerSecondInput.addEventListener('keydown', timerDigitInputFocus);

  function formatTime(value) {
    let hours, minutes, seconds;

    if (value <= 0) {
      value = 0;
    }

    hours = Math.floor(value / 3600000);
    minutes = Math.floor(value / 60000) % 60;
    seconds = Math.floor(value / 1000) % 60;

    hours = ((hours < 10) ? '0' : '') + hours;
    minutes = ((minutes < 10) ? '0' : '') + minutes;
    seconds = ((seconds < 10) ? '0' : '') + seconds;

    return `${hours}:${minutes}:${seconds}`;
  }

  function refreshTimer() {
    if (!(timer.startTime)) {
      return;
    }

    timerTime.textContent = formatTime(timer.totalTime - (Date.now() - timer.startTime) - timer.elapsedTime);

    timerRefreshFrame = requestAnimationFrame(refreshTimer);
  }

  function updateRingTime() {
    ringTimeArea.style.opacity = 0.9;

    ringTime.textContent = new Date(timer.endTime).toLocaleString('en-GB', {hour: 'numeric', minute:'numeric'});
  }

  timerStartPauseBtn.addEventListener('click', (e) => {
    if (!(timer.startTime)) {
      timer.startTime = new Date().getTime();

      timer.totalTime = (parseInt(timerHourInput.value) * 3.6e6) + (parseInt(timerMinuteInput.value) * 6e4) + (parseInt(timerSecondInput.value) * 1000);

      timer.endTime = new Date(timer.startTime + timer.totalTime - timer.elapsedTime).getTime();
      
      timerRefreshFrame = requestAnimationFrame(refreshTimer);

      timer.timeout = generateTimerTimeout.call(timer);

      timer.state = 'play';
      
      updateRingTime();

      addTimerTime.style.display = 'none';
      timerTimeArea.style.opacity = 0.9;

      timerCancelBtn.classList.add('click-effect');

      timerCancelBtn.style.backgroundColor = '#1a1a1a';
      timerStartPauseBtn.style.backgroundColor = '#1470eb';

      timerStartPauseBtn.textContent = 'PAUSE';
    } else if (timer.state === 'play') {
      cancelAnimationFrame(timerRefreshFrame);

      timer.elapsedTime += Date.now() - timer.startTime;

      clearTimeout(timer.timeout);
      delete timer.timeout;

      timer.state = 'pause';
      
      ringTimeArea.style.opacity = 0.6;

      timerStartPauseBtn.style.backgroundColor = '#00b800';

      timerStartPauseBtn.textContent = 'RESUME';
    } else if (timer.state === 'pause') {
      timer.startTime = new Date().getTime();

      timer.endTime = new Date(timer.startTime + timer.totalTime - timer.elapsedTime).getTime();

      timerRefreshFrame = requestAnimationFrame(refreshTimer);

      timer.timeout = generateTimerTimeout.call(timer);

      timer.state = 'play';

      updateRingTime();

      timerStartPauseBtn.style.backgroundColor = '#1470eb';

      timerStartPauseBtn.textContent = 'PAUSE';
    }

    timerSetSessionStorage();
  });

  function timerCancel() {
    if (timer.startTime) {
      clearTimeout(timer.timeout);

      delete timer.endTime;
      delete timer.startTime;
      delete timer.totalTime;
      delete timer.timeout;
      delete timer.state;

      timer.elapsedTime = 0;

      timerCancelBtn.classList.remove('click-effect');

      timerSetSessionStorage();
      renderTimer();
    }
  }

  timerCancelBtn.addEventListener('click', timerCancel);
}

function iconSwitchBtn(iconId) {
  clearInterval(timeZoneRefreshFrame);

  document.querySelectorAll('.icon-area').forEach((item) => {
    item.querySelector('.icon').style.cssText = 'filter: invert(18%) sepia(2%) saturate(0%) hue-rotate(301deg) brightness(96%) contrast(91%);';
    item.querySelector('.icon-text').style.color = '#333333';
  });

  if (iconId === '#world-clock') {
    renderWorldClock();
  } else if (iconId === '#alarm') {
    renderAlarm();
  } else if (iconId === '#stopwatch') {
    renderStopwatch();
  } else if (iconId === '#timer') {
    renderTimer();
  }

  document.querySelector(`${iconId} .icon`).style.cssText = 'filter: invert(36%) sepia(64%) saturate(7316%) hue-rotate(209deg) brightness(105%) contrast(84%);';
  document.querySelector(`${iconId} .icon-text`).style.color = '#1470eb';
}

document.querySelector('#world-clock').addEventListener('click', (e) => {
  if (pageId !== 'clock-main') {
    iconSwitchBtn('#world-clock');
  }
});

document.querySelector('#alarm').addEventListener('click', (e) => {
  if (pageId !== 'alarm-main') {
    iconSwitchBtn('#alarm');
  }
});

document.querySelector('#stopwatch').addEventListener('click', (e) => {
  if (pageId !== 'stopwatch-main') {
    iconSwitchBtn('#stopwatch');
  }
});

document.querySelector('#timer').addEventListener('click', (e) => {
  if (pageId !== 'timer-main') {
    iconSwitchBtn('#timer');
  }
});
