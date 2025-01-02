from typing import NoReturn, no_type_check
from flask import Flask, render_template
from flask_sock import Sock
from time import sleep
from json import loads, dumps

app = Flask(__name__)
sock = Sock(app)


@app.route("/")
def index() -> str:
    return render_template("index.html")


@sock.route("/ws")
@no_type_check
def ws(ws) -> NoReturn:
    ws.send(dumps({"type": "connected", "message": "Hello, World!"}))
    while True:
        message = ws.receive()

        # TODO: Verificar formato del mensaje
        message = loads(message)

        match message["type"]:
            case "event_logged":
                print(f"Event message received: {message["message"]}")
            case "update_blacklist":
                print(f"Blaclist update message received: {message["message"]}")
            case 'tracking_state_changed':
                print(f"Tracking state changed message received: {message["message"]}")
            case _:
                print(f"Unknown message type received: '{message["type"]}'")

        sleep(1e-3)
