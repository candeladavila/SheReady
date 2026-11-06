# SheReady API

API de SheReady con FastAPI. Requiere Python 3.10 o superior.

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
fastapi dev main.py
```

La API estará disponible en `http://127.0.0.1:8000`, la documentación interactiva en `http://127.0.0.1:8000/docs` y la comprobación de estado en `http://127.0.0.1:8000/health`.
