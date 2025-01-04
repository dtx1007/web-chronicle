from .base import initialize_database, SessionMaker

class DatabaseManager:
    _instance = None

    def __new__(cls):
        '''
        Singleton que permite la gestión de la base de datos.
        '''
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            initialize_database()
        return cls._instance
    
    def get_session(self):
        '''
        Proporciona una nueva sesión para interactuar con la base de
        datos.
        '''
        return SessionMaker()