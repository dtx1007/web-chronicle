from typing import Self

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import scoped_session


class DatabaseManager:
    _instance = None

    def __new__(cls, db: SQLAlchemy) -> Self:
        """
        Singleton que permite la gestión de la base de datos.
        """
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            db.create_all()
        return cls._instance

    def get_session(self, db: SQLAlchemy) -> scoped_session:
        """
        Proporciona una nueva sesión para interactuar con la base de
        datos.
        """
        return db.session