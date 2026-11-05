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

## Pregunta 2

Porque todo lo que viene en la URL llega como **texto**: `req.query` es `{ price: "380" }`, con el `"380"` como string. En MongoDB el precio está guardado como número (`380`), y `"380"` y `380` son tipos distintos, así que el filtro no coincide con ningún documento.

## Pregunta 3

Porque esos campos los decide el servidor, no el cliente: un anuncio nuevo siempre empieza `AVAILABLE` y con 0 visitas. Si la API los aceptara, cualquiera podría inflar sus visitas (`views: 9999`) para salir como anuncio popular, o publicarlo directamente como `SOLD`/`RESERVED`, falseando los datos que ven los demás usuarios.
