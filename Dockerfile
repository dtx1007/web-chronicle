FROM python:3.12-slim

RUN pip install poetry

# Set poetry environment variables
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache \
    FLASK_APP=webchronicle.app

WORKDIR /app

COPY pyproject.toml poetry.lock ./

RUN poetry install --without dev,test --no-root && rm -rf $POETRY_CACHE_DIR

COPY webchronicle ./webchronicle
COPY database ./database

RUN poetry install --without dev

EXPOSE 80
ENTRYPOINT ["poetry", "run", "flask", "run", "--debug", "--host", "0.0.0.0", "--port", "5050"]
