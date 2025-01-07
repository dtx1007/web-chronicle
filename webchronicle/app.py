from typing import NoReturn, no_type_check
from flask import Flask, render_template
from flask_sock import Sock
from time import sleep
from dateutil.parser import parse as parse_date
from json import loads, dumps, JSONDecodeError
from sqlalchemy import func, desc
from database.base import db
from database.manager import DatabaseManager
from database.models import Session, Interaction

### Configuración de la aplicación ###

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

sock = Sock(app)

db.init_app(app)

with app.app_context():
    from database.models import Session, Interaction

    DatabaseManager(db)

INTERACTION_BUFFER_SIZE = 10

### Funciones auxiliares ###

def add_interaction(
    message_data: dict, session_id: str, interaction_buffer: list[Interaction]
) -> None:
    timestamp = message_data.get("timestamp")
    parsed_time = parse_date(timestamp) if timestamp else None

    if "details" not in message_data:
        return  

    interaction = Interaction(
        type=message_data["event"],
        time=parsed_time,  
        details=message_data["details"],
        session_id=session_id,
    )

    interaction_buffer.append(interaction)
    if len(interaction_buffer) >= INTERACTION_BUFFER_SIZE:
        db.session.add_all(interaction_buffer)
        db.session.commit()
        interaction_buffer.clear()

def is_valid_message(message: str) -> bool:
    try:
        message_dict = loads(message)
    except JSONDecodeError:
        return False

    if not isinstance(message_dict, dict):
        return False

    if "type" not in message_dict or "message" not in message_dict:
        return False

    if not isinstance(message_dict["type"], str) or not isinstance(
        message_dict["message"], dict
    ):
        return False

    return True


### Rutas ###

@app.teardown_appcontext
def shutdown_session(exception=None) -> None:
    db.session.remove()

@app.route("/sites")
def sites_page():
    return render_template('sites.html')

@app.route("/")
def index() -> str:
    sessions = Session.query.all()
    return render_template("index.html", sessions=sessions)

@app.route("/events/<session_id>")
def view_events(session_id: str) -> str:
    events = Interaction.query.filter_by(session_id=session_id).all()
    return render_template("events.html", events=events, session_id=session_id)

@app.route("/play/<session_id>")
def play_session(session_id: str) -> str:
    return f"Reproduciendo la sesión con ID: {session_id}"

# Formato de ejemplo de los mensajes recibidos:
        #
        # base: {type: "tipo", message: {detalles}}
        #
        # evento: {type: "event_logged", message: {event: "click", timestamp: "2021-09-01 12:00:00", details: {x: 100, y: 120, target: "button", "id": 1, classes: ["btn", "btn-primary"]}}}
        #
        # tab: {type: "tab_event", message: {event: "tab_created", timestamp: "2021-09-01 12:00:00", details: {tabId: 1, url: "https://www.google.com"}}}
        #
        # window: {type: "window_data", message: {with: 1920, height: 1080, zoom: 1}}
        #
        # blacklist: {type: "update_blacklist", message: {blacklistedsites: ["facebook.com", "twitter.com"]}}
        #
        # tracking: {type: "tracking_state_changed", message: {timestamp: "2021-09-01 12:00:00", state: True, sessionId: 1}}
        #
        # session: {type: "session_state_changed", message: {timestamp: "2021-09-01 12:00:00", sessionId: 1, action: "end"}}
        #

@sock.route("/ws")
@no_type_check
def ws(ws) -> NoReturn:
    current_session: Session = None
    interaction_buffer: list[Interaction] = []

    ws.send(dumps({"type": "connected", "message": "Hello, World!"}))
    while True:
        message = ws.receive()

        if not is_valid_message(message):
            ws.send(dumps({"type": "error", "message": "Invalid message format"}))
            print(f"Invalid message received: {message}")
            continue

        message = loads(message)
        message_type: dict = message["type"]
        message_data: dict = message["message"]

        match message_type:
            case "event_logged":
                if current_session is None:
                    print("No session started, event message ignored.")
                    ws.send(dumps({"type": "error", "message": "No session started"}))
                    continue
                if "event" not in message_data or "details" not in message_data:
                    print("Error: 'event' or 'details' not found in message_data")
                    continue
                add_interaction(message_data, current_session.id, interaction_buffer)
                print(f"Event message received: {message['message']}")

            case "tab_event":
                if current_session is None:
                    print("No session started, tab event message ignored.")
                    ws.send(dumps({"type": "error", "message": "No session started"}))
                    continue
                add_interaction(message_data, current_session.id, interaction_buffer)
                print(f"Tab event message received: {message['message']}")

            case "window_data":
                if current_session is None:
                    print("No session started, window data message ignored.")
                    continue

                current_session.window_width = message_data.get("width", 480)
                current_session.window_height = message_data.get("height", 360)
                db.session.commit()

                print(f"Window data message received: {message['message']}")

            case "update_blacklist":
                print(f"Blaclist update message received: {message["message"]}")

            case "session_state_changed":
                if message_data["action"] == "start":
                    current_session = Session(
                        id=message_data["sessionId"],
                        start_time=parse_date(message_data["timestamp"]),
                        end_time=None,
                        window_width=None,
                        window_height=None,
                    )
                    db.session.add(current_session)
                    db.session.commit()

                    print(f"Session started: {message['message']}")
                elif message_data["action"] == "end":
                    if current_session is not None:  # Asegúrate de que current_session no sea None
                        current_session.end_time = parse_date(message_data["timestamp"])
                        db.session.commit()
                        current_session = None
                        print(f"Session ended: {message['message']}")
                    else:
                        print("No active session to end.")
                else:
                    print(f"Unknown session action received: '{message_data['action']}'")
            case _:
                print(f"Unknown message type received: '{message['type']}'")

        sleep(1e-3)
