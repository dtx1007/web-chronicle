# WebChronicle

> *Slogan (W.I.P.)*

Herramienta de grabado de sesiones web.

## 📋 Índice

- 📋 [Índice](#-índice)
- ⚡ [Instalación](#-instalación)
- 🔨 [Build](#-build)
- 📜 [Licencia](#-licencia)

## ⚡ Instalación

**W.I.P. (Diseño preliminar)**

## 🔨 Build

**W.I.P. (Diseño preliminar)**

Es posible ejecutar el proyecto y desarrollar este tanto en versión local como en versión de contenedor mediante Docker. Independientemente de que opcion se elegija, serán necesario tener `git` instalado.

- [Git](https://git-scm.com/downloads)

El primer paso antes de ejecutar será clonar el repositorio en su equipo mediante:

```sh
git clone https://github.com/dtx1007/web-chronicle
cd ./web-chronicle
```

### 🏠 Instalación local

Si se desea buildear el proyecto de forma local o realizar modificaciones a este es necesario levantar un entorno de desarrollo. Para ello será necesario seguir los siguientes pasos.

> 📝**Nota:** Este proyecto usa Poetry para gestionar el entorno de desarrollo.

Dependencias necesarias:

- [Python](https://www.python.org/downloads/) (3.12.0 o superior)

Lo siguiente será instalar `Poetry` en nuestro equipo para poder crear el entorno de desarrollo.

```sh
pipx install poetry
```

Una vez instalado `Poetry` simplemente debemos ejecutar el siguiente comando y este se encargará de descargar todas las depetencias y preparar el entorno de desarrollo.

```sh
poetry install
poetry shell

# Alternativamente, si no funciona lo anterior
python -m poetry install
python -m poetry shell
```

Con el entorno preparado, podemos ejecutar el programa usando:

```sh
flask --app webchronicle.app run

# Si se quiere habilitar el hot-reloading
flask --app webchronicle.app run --debug

# Si se quiere exponer el servidor a la red local
flask --app webchronicle.app run --host 0.0.0.0 --port 5000
```

### 🐋 Instalación mediante Docker

El entorno de desarrollo mediante Docker es mucho más cómodo de montar pero tiene ciertas desventajas en cuanto a la experiencia de desarrollo. Si se desea modificar el proyecto, se recomienda encarecidamente seguir instalando las dependencias para la ejecución en local dado que ofrecen diferentes herramientas de desarrollo que facilitan el trabajo.

Dependencias necesarias:

- [Docker](https://www.docker.com/)

Con Docker instalado, lo único que debemos hacer es ejecutar los siguientes comandos:

```sh
docker compose build
docker compose up
```

Una vez el proceso termine, el servidor de desarrollo se expone de forma local en la dirección `localhost:80`.

> 📝**Nota:** Si se desea que las modifiacciones realizadas al código tomen efecto sin tener que reinicializar el contenedor, se incluye un watch de Docker el cual se puede activar de forma interactiva dentro de la shell del contenedor pulsando la tecla `w` o mediante el argumento `--watch` al iniciar el contenedor. Este watch simplemente sincroniza los archivos locales con los del contenedor cuando se detectan cambios en el directorio `./webcronicle`.

## 📜 Licencia

Este proyecto se adhiere a los principios de la [Licencia MIT](https://choosealicense.com/licenses/mit/#), garantizando la libertad para usar, modificar y distribuir el software con mínimas restricciones. Promovemos la colaboración abierta y el intercambio libre de conocimientos.
