# Respuestas — API de Rastro

## Ejercicio 0

Al intentar `git push` directamente a `main`, GitHub lo rechaza:

```text
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Changes must be made through a pull request.
remote: - 2 of 2 required status checks are expected.
 ! [remote rejected] main -> main (push declined due to repository rule violations)
```

La línea importante: **`Changes must be made through a pull request.`** La regla `proteger-main` solo deja cambiar `main` mediante una PR con los checks `htmlhint` y `lint` en verde.

## Pregunta 1

Con MongoDB parado, `GET /api/health` tarda unos 5 segundos (el `serverSelectionTimeoutMS`) y devuelve **`500`** con `{ "error": "Error interno del servidor" }`. Ha respondido el **manejador de errores** (el paso 5 de `index.ts`): el `ping` lanza un error, Express 5 lo pasa al middleware de 4 parámetros y este responde un mensaje genérico sin detalles internos.
