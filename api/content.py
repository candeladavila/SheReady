"""Editorial sample data. These entries are not a live news/event feed."""

SKILLS = [
    {"id": "technical", "label": "Conocimientos técnicos"},
    {"id": "communication", "label": "Comunicación"},
    {"id": "teamwork", "label": "Trabajo en equipo"},
    {"id": "problem_solving", "label": "Resolución de problemas"},
    {"id": "self_presentation", "label": "Presentación de logros"},
]
CONTENT = {
    "news": [
        {
            "id": "news-1",
            "title": "Referentes que abren camino en tecnología",
            "description": "Ejemplo editorial: descubre trayectorias y prepara preguntas sobre tu futuro profesional.",
            "url": None,
        },
        {
            "id": "news-2",
            "title": "Cómo contar tu primer proyecto tecnológico",
            "description": "Ejemplo editorial: explica el problema, tu aportación y lo que aprendiste.",
            "url": None,
        },
    ],
    "events": [
        {
            "id": "event-1",
            "title": "Taller de entrevistas técnicas (ejemplo)",
            "description": "Evento ficticio para ilustrar esta sección de la demo.",
            "starts_at": None,
            "location": "Online",
            "url": None,
        },
        {
            "id": "event-2",
            "title": "Encuentro de mujeres en tecnología (ejemplo)",
            "description": "Evento ficticio para ilustrar una oportunidad de networking.",
            "starts_at": None,
            "location": "Por confirmar",
            "url": None,
        },
    ],
    "wellbeing": [
        {
            "id": "wellbeing-1",
            "title": "Una pausa para respirar",
            "duration_minutes": 2,
            "steps": [
                "Busca una postura cómoda.",
                "Respira a un ritmo cómodo, sin forzar ni retener el aire.",
                "Observa cómo te encuentras y termina cuando quieras.",
            ],
        },
        {
            "id": "wellbeing-2",
            "title": "Reconoce un avance",
            "duration_minutes": 3,
            "steps": [
                "Piensa en una situación reciente que hayas afrontado.",
                "Identifica una acción tuya que ayudó.",
                "Escribe qué te gustaría repetir la próxima vez.",
            ],
        },
    ],
}
