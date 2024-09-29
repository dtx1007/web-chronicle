FROM python:3.12-slim

RUN pip install poetry

# Set poetry environment variables
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /app

COPY pyproject.toml poetry.lock ./

RUN poetry install --without dev,test --no-root && rm -rf $POETRY_CACHE_DIR

COPY webchronicle ./webchronicle

RUN poetry install --without dev

ENTRYPOINT ["poetry", "run", "python", "-m", "webchronicle.main"]
