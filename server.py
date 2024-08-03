from flask import Flask, request, jsonify
from flask_cors import CORS
import chess
import chess.engine
import os
import sys

app = Flask(__name__)
CORS(app)

# Get the directory of the script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Construct the path to the engine
if sys.platform.startswith('win'):
    engine_path = os.path.join(script_dir, 'lc0', 'lc0.exe')
else:
    engine_path = os.path.join(script_dir, 'lc0', 'lc0')

print(f"Using engine at: {engine_path}")

engine = None

def initialize_engine():
    global engine
    try:
        engine = chess.engine.SimpleEngine.popen_uci(engine_path)
        print("Engine initialized successfully")
    except Exception as e:
        print(f"Error initializing engine: {str(e)}")
        engine = None

initialize_engine()

def analyze_position(board, movetime, multipv):
    try:
        # Set the UCI_ShowWDL option to true
        engine.configure({"UCI_ShowWDL": True})

        info = engine.analyse(board, chess.engine.Limit(time=movetime / 1000.0), multipv=multipv)
        result = []
        for entry in info:
            if 'pv' in entry and 'wdl' in entry:
                move = entry['pv'][0].uci()
                win_prob = entry['wdl'][0] / 1000.0  # Convert from permille to probability
                draw_prob = entry['wdl'][1] / 1000.0
                loss_prob = entry['wdl'][2] / 1000.0

                # Calculate winrate (adjust as needed based on how you want to handle draws)
                winrate = win_prob * 100  # Or you could incorporate draw_prob in some way

                result.append({'move': move, 'winrate': round(winrate)})

        return result
    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        return []


@app.route('/status', methods=['GET'])
def status():
    global engine
    engine_status = "running" if engine is not None else "not running"
    return jsonify({'status': 'ok', 'engine': engine_status})

@app.route('/analyze', methods=['POST'])
def analyze():
    global engine
    pgn = request.json['pgn']
    temperature = float(request.json.get('temperature', 0.5))
    multipv = int(request.json.get('multipv', 3))
    movetime = int(request.json.get('movetime', 1000))
    
    print(f"Analyzing position with settings: temp={temperature}, multipv={multipv}, movetime={movetime}")
    
    board = chess.Board()
    moves = pgn.split()
    for move in moves:
        if move.endswith('.'):
            continue
        try:
            board.push_san(move)
        except ValueError as e:
            print(f"Invalid move {move}: {e}")
            return jsonify({'error': f"Invalid move {move}"}), 400
    
    fen = board.fen()
    print(f"Analyzing FEN: {fen}")

    if not engine:
        initialize_engine()
        if not engine:
            return jsonify({'error': 'Engine initialization failed'}), 500

    try:
        moves = analyze_position(board, movetime, multipv)
        return jsonify({'moves': moves})
    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        return jsonify({'error': 'Analysis failed'}), 500

@app.route('/stop', methods=['POST'])
def stop():
    global engine
    if engine:
        engine.quit()
        engine = None
        return jsonify({'status': 'engine stopped'})
    else:
        return jsonify({'status': 'engine not running'})

@app.route('/restart', methods=['POST'])
def restart():
    global engine
    if engine:
        engine.quit()
    initialize_engine()
    return jsonify({'status': 'engine restarted'})

if __name__ == '__main__':
    app.run(debug=True)
