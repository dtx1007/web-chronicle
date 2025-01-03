import pytest
from sqlalchemy import create_engine
from datetime import datetime, timedelta
from database.base import Base, initialize_database
from database.models import Session, Interaction
from database.manager import DatabaseManager

# Inicializamos la base de datos para realizar cada uno de los tests.
@pytest.fixture(scope='function')
def setup_tests():
    '''
    Método que se llama cada vez que se ejecuta un test y sirve para inicializar
    la base de datos en un estado conocido para ejecutar correctamente los tests.
    '''
    # Inicializamos la base de datos creada y la cargamos en memoria.
    initialize_database()
    # Devolvemos el control para ejecutar el test correspondiente.
    yield
    # Limpiamos después de ejecutar el test correspondiente.
    Base.metadata.drop_all(bind=create_engine('sqlite:///:memory:'))

def test_create_session(setup_tests: None):
    '''
    Test que se encarga de comprobar la creación de una sesión de un usuario
    en la base de datos.
    '''
    # Inicializamos la conexión con la base de datos y una nueva conexión a la misma.
    db_manager = DatabaseManager()
    db_session = db_manager.get_session()

    # Creamos una nueva sesión del usuario.
    new_session = Session(
        id="session_001", name="Test Session",
        start_time=datetime.now(), end_time=datetime.now() + timedelta(hours=1),
    )

    # Guardamos en la base de datos, la sesión del usuario creada.
    db_session.add(new_session)
    # Hacemos commit para guardar y confirmar los datos.
    db_session.commit()

    # Comprobamos que la sesión se haya creada correctamente.
    saved_session = db_session.query(Session).filter_by(id="session_001").first()
    assert saved_session is not None
    assert saved_session.id == "session_001"
    assert saved_session.name == "Test Session"
    assert saved_session.start_time is not None
    assert saved_session.end_time is not None

def test_register_interaction(setup_tests: None):
    '''
    Test que se encarga de comprobar la creación y almacenamiento de una interacción
    del usuario en la base de datos.
    '''
    # Inicializamos la conexión con la base de datos y una nueva conexión a la misma.
    db_manager = DatabaseManager()
    db_session = db_manager.get_session()

    # Creamos una nueva sesión del usuario para asociar la interacción.
    new_session = Session(
        id="session_004", name="Session for Interaction",
        start_time=datetime.now(), end_time=datetime.now() + timedelta(hours=1),
    )

    # Guardamos en la base de datos, la sesión del usuario creada.
    db_session.add(new_session)
    # Hacemos commit para guardar y confirmar los datos.
    db_session.commit()

    # Creamos una interacción del usuario en la sesión creada y la guardamos.
    new_session.register_user_interaction(eventType="Click", eventDetails="Clicked on the signup button")
    db_session.commit()

    # Comprobamos que la interacción se ha registrado correctamente.
    saved_interaction = db_session.query(Interaction).filter_by(type="Click").first()
    assert saved_interaction is not None
    assert saved_interaction.type == "Click"
    assert saved_interaction.details == "Clicked on the signup button"
    assert saved_interaction.time is not None

def test_get_user_interactions(setup_tests):
    '''
    Test para comprobar la obtención de las interacciones asociadas a una sesión del
    usuario.
    '''
    # Inicializamos la conexión con la base de datos y una nueva conexión a la misma.
    db_manager = DatabaseManager()
    db_session = db_manager.get_session()

    # Creamos una nueva sesión del usuario.
    new_session = Session(
        id="session_005", name="Session with Interactions",
        start_time=datetime.now(), end_time=datetime.now() + timedelta(hours=1),
    )

    # Guardamos la sesión creada y hacemos commit.
    db_session.add(new_session)
    db_session.commit()

    # Guardamos las interacciones del usuario creadas y hacemos commit.
    new_session.register_user_interaction(eventType="Click", eventDetails="Clicked on the signup button")
    new_session.register_user_interaction(eventType="Scroll", eventDetails="Scrolled through the homepage")
    db_session.commit()

    # Obtenemos la sesión creada.
    saved_session = db_session.query(Session).filter_by(id="session_005").first()
    
    # Ahora, obtenemos las interacciones de la sesión.
    saved_interactions = list(saved_session.get_user_interactions())

    # Comprobamos que las interacciones del usuario se obtienen de forma correcta.
    assert len(saved_interactions) == 2
    assert any(interaction['type'] == "Click" for interaction in saved_interactions)
    assert any(interaction['type'] == "Scroll" for interaction in saved_interactions)