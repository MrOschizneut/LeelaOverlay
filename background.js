chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendPGN") {
    fetch('http://localhost:5000/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pgn: request.pgn,
        temperature: request.temperature,
        multipv: request.multipv,
        movetime: request.movetime
      }),
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({ moves: data.moves });
    })
    .catch(error => {
      console.error('Error:', error);
      sendResponse({ error: 'Failed to analyze PGN' });
    });
    return true; // Indicates that the response is asynchronous
  }
});
