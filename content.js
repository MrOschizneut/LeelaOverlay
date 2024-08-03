function convertToPGN() {
    let movesArray = [];
    const moveListElement = document.querySelector('l4x') || document
        .querySelector('.tview2.tview2-column');
    if (!moveListElement) {
        console.error('Move list element not found');
        return null;
    }
    const moveElements = moveListElement.querySelectorAll('i5z, san, kwdb');
    moveElements.forEach(el => {
        if (el.tagName.toLowerCase() === 'i5z') {
            movesArray.push(`${el.textContent}.`);
        } else if (el.tagName.toLowerCase() === 'san' || el.tagName
            .toLowerCase() === 'kwdb') {
            movesArray.push(el.textContent);
        }
    });
    const pgn = movesArray.join(' ');
    return pgn.trim() === '' ? null : pgn;
}

function initializeCanvas() {
    const board = document.querySelector('cg-board');
    if (board) {

        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '1000'
        canvas.style.pointerEvents = 'none';
        board.appendChild(canvas);


        function getBoardOrientationAndSize() {
            const boardRect = board.getBoundingClientRect();
            const boardContainer = document.querySelector('.cg-wrap');
            const isWhiteOriented = !boardContainer.classList.contains('orientation-black');
            return { isWhiteOriented, boardSize: boardRect.width };
        }

        function convertMoveToCoordinates(move, isWhiteOriented, squareSize, boardSize) {
            const moveString = move.move;
            const fromSquare = moveString.substring(0, 2);
            const toSquare = moveString.substring(2, 4);


            let fromX = (fromSquare.charCodeAt(0) - 'a'.charCodeAt(0)) * squareSize;
            let fromY = (8 - parseInt(fromSquare.charAt(1))) * squareSize;
            let toX = (toSquare.charCodeAt(0) - 'a'.charCodeAt(0)) * squareSize;
            let toY = (8 - parseInt(toSquare.charAt(1))) * squareSize;


            if (!isWhiteOriented) {
                fromX = boardSize - fromX - squareSize;
                fromY = boardSize - fromY - squareSize;
                toX = boardSize - toX - squareSize;
                toY = boardSize - toY - squareSize;
            }

            return { fromX, fromY, toX, toY };
        }

        function drawArrows(moves) {
            const { isWhiteOriented, boardSize } = getBoardOrientationAndSize();
            const squareSize = boardSize / 8;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            moves.forEach((move, index) => {
                const { fromX, fromY, toX, toY } = convertMoveToCoordinates(move, isWhiteOriented, squareSize, boardSize);

                ctx.beginPath();
                ctx.moveTo(fromX + squareSize / 2, fromY + squareSize / 2);
                ctx.lineTo(toX + squareSize / 2, toY + squareSize / 2);
                const hue = 180 - (index / (moves.length - 1)) * 180;

                const color = `hsla(${hue}, 100%, 50%, 0.4)`;
                ctx.strokeStyle = color;
                ctx.lineWidth = 20;
                ctx.lineCap = "round";
                ctx.stroke();


                if (move.winrate) {
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2;
                    ctx.font = "bold 14px ";
                    ctx.strokeText(`${move.winrate}%`, toX + squareSize / 2, toY + squareSize / 2);
                    ctx.fillText(`${move.winrate}%`, toX + squareSize / 2, toY + squareSize / 2);
                }
            });
        }

        function updateArrows(moves) {
            canvas.width = board.offsetWidth;
            canvas.height = board.offsetHeight;
            drawArrows(moves);
        }
        window.addEventListener('resize', () => {
            updateArrows(moves);
        });


        const boardContainer = document.querySelector('.cg-wrap');
        const orientationObserver = new MutationObserver(() => {
            updateArrows(moves);
        });
        orientationObserver.observe(boardContainer, { attributes: true });


        let moves = [];
        updateArrows(moves);

        function sendPGNToServer(pgn) {
            if (!pgn) {
                console.error('Attempted to send null PGN to server');
                return;
            }
            chrome.storage.sync.get(['temperature', 'multipv', 'movetime'],
                function (items) {
                    items = items || {};
                    chrome.runtime.sendMessage({
                        action: "sendPGN",
                        pgn: pgn,
                        temperature: items.temperature || 0.5,
                        multipv: items.multipv || 3,
                        movetime: items.movetime || 1000
                    }, function (response) {
                        if (response && response.moves) {
                            moves = response.moves;
                            updateArrows(moves);
                        } else if (response && response.error) {
                            console.error('Error from server:',
                                response.error);
                        }
                    });
                });
        }

        function initializeObserver() {
            let moveListElement = document.querySelector('l4x') || document
                .querySelector('.tview2.tview2-column');
            if (!moveListElement) {
                console.log('Move list not found. Retrying...');
                setTimeout(initializeObserver, 500);
                return;
            }
            const observer = new MutationObserver(() => {
                console.log('Move list changed, converting to PGN');
                const pgn = convertToPGN();
                if (pgn) {
                    console.log('PGN:', pgn);
                    sendPGNToServer(pgn);
                } else {
                    console.log('No moves found, skipping analysis');
                }
            });
            const config = {
                childList: true,
                subtree: true
            };
            observer.observe(moveListElement, config);
            console.log('Observing move list:', moveListElement);
            moveListElement.addEventListener('DOMNodeRemoved', () => {
                console.log(
                    'Move list element removed, reattaching observer...'
                );
                setTimeout(initializeObserver, 500);
            });
        }

        function initialAnalysis() {
            const initialPgn = convertToPGN();
            if (initialPgn) {
                console.log('Initial PGN:', initialPgn);
                sendPGNToServer(initialPgn);
            } else {
                console.log('No initial moves found, waiting for moves...');
            }
        }
        initialAnalysis();
        initializeObserver();
    } else {
        setTimeout(initializeCanvas, 500);
    }
}
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'CG-BOARD') {
                console.log('cg-board element added!');
                initializeCanvas();
                observer.disconnect();
            }
        });
    });
});
observer.observe(document.body, {
    childList: true,
    subtree: true
});
