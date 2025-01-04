from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

# Definimos la tabla 'Sessions' para recoger cada una de las sesiones del usuario.
class Session(Base):
    # Definimos e Inicializamos el nombre de la tabla.
    __tablename__ = 'Sessions'

    # Definimos e Inicializamos los campos y la Primary Key de la tabla 'Sessions'.
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)

    # Definimos la relación uno a muchos con la tabla 'Interactions'.
    interactions = relationship('Interaction', back_populates='session')

    def register_user_interaction(self, eventType: str, eventDetails: str = None):
        '''
        Registra una interacción de un usuario en una web en la sesión actual.

        Parámetros:
        ------------
        eventName: str
            Tipo de la interacción del usuario sobre la web en la sesión actual.
        eventDetails: str
            Detalles de la interacción del usuario sobre la web en la sesión actual.
        
        Returns:
        ---------
        Interaction
            La interacción del usuario registrada en la sesión actual.
        '''
        new_interaction = Interaction(type=eventType, details=eventDetails, time=datetime.now(), session=self)
        self.interactions.append(new_interaction)
        return new_interaction
    
    def get_user_interactions(self):
        '''
        Devuelve las interacciones del usuario en la sesión actual.

        Returns:
        ---------
        Dict[Interaction]
            Las interacciones del usuario en forma de diccionario.
        '''
        return ({"type": interaction.type, "details": interaction.details, 
                "time": interaction.time} for interaction in self.interactions)
    
    def __repr__(self):
        '''
        Permite obtener en forma de String, la información de la sesión actual.
        '''
        return f"<Session(id={self.id}, name={self.name}, start_time={self.start_time}, end_time={self.end_time})>"

# Definimos la tabla 'Interactions' para almacenar las interacciones del usuario durante las sesiones.
class Interaction(Base):
    # Definimos e Inicializamos el nombre de la tabla.
    __tablename__ = 'Interactions'

    # Definimos e Inicializamos los campos de la tabla, incluyendo su Primary Key y su Foreign Key.
    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String, nullable=False)
    details = Column(String, nullable=True)
    time = Column(DateTime, nullable=False)
    session_id = Column(String, ForeignKey('Sessions.id'), nullable=False)

    # Definimos la relación inversa con tabla 'Sessions'.
    session = relationship('Session', back_populates='interactions')

    def __repr__(self):
        '''
        Permite obtener en forma de String la información de la interacción actual.
        '''
        return f"<Interaction(id={self.id}, type={self.type}, details={self.details}, time={self.time})"