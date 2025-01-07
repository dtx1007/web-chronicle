from typing import Any, Generator
from sqlalchemy import JSON, Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import db


# Tabla de asociación para la relación muchos a muchos entre sitios y sesiones
site_sessions = Table(
    "site_sessions",
    db.Model.metadata,
    Column("site_id", Integer, ForeignKey("visited_sites.id"), primary_key=True),
    Column("session_id", String, ForeignKey("Sessions.id"), primary_key=True),
)


class VisitedSite(db.Model):
    """
    Modelo para almacenar información sobre los sitios visitados y su frecuencia.
    """

    __tablename__ = "visited_sites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String, nullable=False, unique=True)
    visit_count = Column(Integer, default=1, nullable=False)
    first_visit = Column(DateTime, nullable=False)
    last_visit = Column(DateTime, nullable=False)

    # Relación muchos a muchos con sesiones
    sessions = relationship(
        "Session", secondary=site_sessions, back_populates="visited_sites"
    )

    def __repr__(self) -> str:
        return f"<VisitedSite(id={self.id}, url={self.url}, visits={self.visit_count})>"


class Session(db.Model):
    __tablename__ = "Sessions"

    id = Column(String, primary_key=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    window_width = Column(Integer, nullable=True)
    window_height = Column(Integer, nullable=True)

    # Relación uno a muchos con interacciones
    interactions = relationship("Interaction", back_populates="session")

    # Nueva relación muchos a muchos con sitios visitados
    visited_sites = relationship(
        "VisitedSite", secondary=site_sessions, back_populates="sessions"
    )

    def register_user_interaction(
        self, eventType: str, eventDetails: JSON
    ) -> "Interaction":
        """
        Registra una interacción de un usuario en una web en la sesión actual.

        Parámetros:
        ------------
        eventType: str
            Tipo de la interacción del usuario sobre la web en la sesión actual.
        eventDetails: JSON
            Detalles de la interacción del usuario sobre la web en la sesión actual.

        Returns:
        ---------
        Interaction
            La interacción del usuario registrada en la sesión actual.
        """
        new_interaction = Interaction(
            type=eventType, details=eventDetails, time=datetime.now(), session=self
        )

        # Agregamos explícitamente la nueva interacción a la sesión para que SQLAlchemy la reconozca
        db.session.add(new_interaction)

        # Añadimos la interacción a la lista de interacciones de la sesión
        self.interactions.append(new_interaction)

        # Si es un evento de tipo tab y contiene una URL, actualizamos los sitios visitados
        if (
            eventType == "tab_created"
            and isinstance(eventDetails, dict)
            and "url" in eventDetails
        ):
            self._register_site_visit(eventDetails["url"])

        return new_interaction

    def _register_site_visit(self, url: str) -> None:
        """
        Registra o actualiza la visita a un sitio.

        Parámetros:
        ------------
        url: str
            URL del sitio visitado
        """
        site = VisitedSite.query.filter_by(url=url).first()
        current_time = datetime.now()

        if site:
            site.visit_count += 1
            site.last_visit = current_time
            if self not in site.sessions:
                site.sessions.append(self)
        else:
            site = VisitedSite(
                url=url, first_visit=current_time, last_visit=current_time
            )
            db.session.add(site)
            site.sessions.append(self)

    def get_user_interactions(self) -> Generator[dict[str, Any], None, None]:
        """
        Devuelve las interacciones del usuario en la sesión actual.

        Returns:
        ---------
        Generator[dict[str, Any], None, None]
            Las interacciones del usuario en forma de diccionario.
        """
        return (
            {
                "type": interaction.type,
                "details": interaction.details,
                "time": interaction.time,
            }
            for interaction in self.interactions
        )

    def __repr__(self) -> str:
        return f"<Session(id={self.id}, start_time={self.start_time}, end_time={self.end_time})>"


class Interaction(db.Model):
    __tablename__ = "Interactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String, nullable=False)
    details = Column(JSON, nullable=True)
    time = Column(DateTime, nullable=False)
    session_id = Column(String, ForeignKey("Sessions.id"), nullable=False)

    session = relationship("Session", back_populates="interactions")

    def __repr__(self) -> str:
        return f"<Interaction(id={self.id}, type={self.type}, details={self.details}, time={self.time})"
