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

Si se desea buildear el proyecto de forma manual o realizar modificaciones a este es necesario levantar un entorno de desarrollo. Para ello será necesario seguir los siguientes pasos.

> 📝**Nota:** Este proyecto usa Poetry para gestionar el entorno de desarrollo.

Dependencias necesarias:

- [Git](https://git-scm.com/downloads)
- [Python](https://www.python.org/downloads/) (3.12.0 o superior)

Lo primero que se debe hacer es clonar este repositorio mediante el siguiente comando:

```sh
git clone https://github.com/dtx1007/web-chronicle
cd ./web-chronicle
```

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
python -m webchronicle.main
```

## 📜 Licencia

Este proyecto se adhiere a los principios de la [Licencia MIT](https://choosealicense.com/licenses/mit/#), garantizando la libertad para usar, modificar y distribuir el software con mínimas restricciones. Promovemos la colaboración abierta y el intercambio libre de conocimientos.
