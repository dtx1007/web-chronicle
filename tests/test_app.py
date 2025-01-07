# Clase de pruebas del servidor de la aplicación 
import pytest
from flask import Flask
from webchronicle.app import app, db, add_interaction, process_tab_event
from database.models import Session, Interaction, VisitedSite
from dateutil.parser import parse as parse_date
from json import dumps, loads
from flask.testing import FlaskClient

# Fixture para configurar las pruebas 
@pytest.fixture
def test_app():
    app.config.update(
        TESTING=True,  # Habilitar modo de prueba
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:", 
        SQLALCHEMY_TRACK_MODIFICATIONS=False,  
    )
    with app.app_context():
        db.create_all()  
        yield app  
        db.session.remove() 
        db.drop_all() 

# Fixture para crear un cliente de prueba
@pytest.fixture
def test_client(test_app) -> FlaskClient:
    return test_app.test_client()  # Devolver cliente de prueba para hacer solicitudes

# Prueba para verificar la página de sesiones
def test_sessions_index(test_client):
    response = test_client.get("/sessions")  # Realizar una solicitud GET a la ruta /sessions
    assert response.status_code == 200  # Verificar que el código de estado sea 200 (OK)
    assert b"Sessions" in response.data  # Verifica que la respuesta contenga la palabra "Sessions"

# Prueba para verificar la visualización de eventos
def test_view_events(test_client, test_app):
    with test_app.app_context():
        # Crear una nueva sesión
        session = Session(id="test-session", start_time=parse_date("2025-01-01T12:00:00Z"))
        db.session.add(session) 
        db.session.commit()  

        # Crear una nueva interacción
        interaction = Interaction(
            type="click",
            time=parse_date("2025-01-01T12:01:00Z"),
            details={"x": 100, "y": 200, "target": "button"},
            session_id="test-session",
        )
        db.session.add(interaction)  # Agregar la interacción a la base de datos
        db.session.commit()  # Confirmar los cambios

        response = test_client.get(f"/events/{session.id}")  # Realizar una solicitud GET a la ruta de eventos
        assert response.status_code == 200  # Verificar que el código de estado sea 200 (OK)
        assert b"click" in response.data  # Verificar que la respuesta contenga la palabra "click"

# Prueba para verificar la conexión del websocket
def test_websocket_connection(test_client, test_app):
    with test_app.test_client() as client:
        rules = [str(rule) for rule in app.url_map.iter_rules()]  # Obtener las reglas de URL de la aplicación
        assert '/ws' in rules  # Verificar que la ruta '/ws' esté en las reglas

# Prueba para agregar una interacción
def test_add_interaction(test_app):
    with test_app.app_context():
        # Crear una nueva sesión
        session = Session(id="test-session", start_time=parse_date("2025-01-01T12:00:00Z"))
        db.session.add(session)  
        db.session.commit()  

        interaction_buffer = []  # Inicializar buffer para interacciones
        message_data = {
            "event": "click",
            "timestamp": "2025-01-01T12:01:00Z",
            "details": {"x": 100, "y": 200, "target": "button"},
        }

        add_interaction(message_data, session.id, interaction_buffer)  # Agregar la interacción al buffer
        assert len(interaction_buffer) == 1  # Verificar que el buffer contenga una interacción
        assert interaction_buffer[0].details == message_data["details"]  # Verificar que los detalles sean correctos

# Prueba para procesar un evento de pestaña
def test_process_tab_event(test_app):
    with test_app.app_context():
        # Crear una nueva sesión
        session = Session(id="test-session", start_time=parse_date("2025-01-01T12:00:00Z"))
        db.session.add(session)
        db.session.commit