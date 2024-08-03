document.addEventListener('DOMContentLoaded', function() {
  const temperatureInput = document.getElementById('temperature');
  const temperatureValue = document.getElementById('temperatureValue');
  const multipvInput = document.getElementById('multipv');
  const movetimeInput = document.getElementById('movetime');
  const saveButton = document.getElementById('saveSettings');
  const saveStatus = document.getElementById('saveStatus');
  const serverStatus = document.getElementById('serverStatus');

  // Load saved settings
  chrome.storage.sync.get(['temperature', 'multipv', 'movetime'], function(items) {
    items = items || {}; // Ensure items is an object
    temperatureInput.value = items.temperature !== undefined ? items.temperature : 0.5;
    temperatureValue.textContent = temperatureInput.value;
    multipvInput.value = items.multipv !== undefined ? items.multipv : 3;
    movetimeInput.value = items.movetime !== undefined ? items.movetime : 1000;
  });

  // Update temperature value display
  temperatureInput.addEventListener('input', function() {
    temperatureValue.textContent = this.value;
  });

  // Save settings
  saveButton.addEventListener('click', function() {
    chrome.storage.sync.set({
      temperature: parseFloat(temperatureInput.value),
      multipv: parseInt(multipvInput.value),
      movetime: parseInt(movetimeInput.value)
    }, function() {
      saveStatus.textContent = 'Settings saved!';
      saveStatus.className = 'success';
      setTimeout(() => {
        saveStatus.textContent = '';
        saveStatus.className = '';
      }, 3000);
    });
  });

  // Check server status
  function checkServerStatus() {
    fetch('http://localhost:5000/status', { method: 'GET' })
      .then(response => response.json())
      .then(data => {
        serverStatus.textContent = 'Server connected';
        serverStatus.className = 'success';
      })
      .catch(error => {
        serverStatus.textContent = 'Server disconnected';
        serverStatus.className = 'error';
      });
  }

  checkServerStatus();
  setInterval(checkServerStatus, 5000);
});
