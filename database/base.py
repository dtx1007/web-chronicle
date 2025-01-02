from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Declaramos la base que usa como referencia para crear las tablas.
Base = declarative_base()

# Configuramos el motor y la sesión.
engine = create_engine('sqlite:///:memory:')
SessionMaker = sessionmaker(bind=engine)

def initialize_database():
    '''
    Inicializa la base de datos y crea las diferentes tablas si no existen.
    '''
    global engine, SessionMaker
    # Inicializamos la base de datos con sus correspondientes tablas.
    Base.metadata.create_all(engine)