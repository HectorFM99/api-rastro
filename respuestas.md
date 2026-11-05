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

## Pregunta 4

No. La copia `listing.price: 380` de la oferta es una **foto del momento** en que Sara ofertó: indica el precio que tenía el anuncio cuando hizo su oferta de 340 €, y ese dato histórico debe conservarse. El precio actual siempre se puede consultar en el propio anuncio; si el `PATCH` cambiara la copia, perderíamos el contexto de la oferta.

## Pregunta 5

Porque la petición está bien hecha: los ids tienen buen formato, existen y la cantidad es válida. El problema no es lo que envía el cliente, sino que choca con el **estado actual** del anuncio (ya está `SOLD`). `400` es para peticiones mal formadas; `409` es para peticiones correctas que entran en conflicto con el estado del recurso.

## Pregunta 6

MongoDB comprueba lo que le pedimos con **índices**, por ejemplo el índice único de `users.email` (no deja dos usuarios con el mismo email) y que cada `_id` sea único. Todo lo demás lo comprueba la API en el código: que una referencia existe (que el `sellerId` o el `listingId` estén de verdad en su colección), que `price`/`amount` sean números (y no el texto `"75"`), que los campos obligatorios lleguen o que el anuncio esté `AVAILABLE` antes de aceptar una oferta.

---

# Retos opcionales

## Reto 1: aceptar una oferta

**¿Qué pasa si el servidor se apaga entre una escritura y otra?** Los datos quedan incoherentes: la oferta queda `ACCEPTED` pero el anuncio sigue `AVAILABLE`, y otros compradores podrían seguir ofertando por algo que ya está reservado. MongoDB solo garantiza que cada escritura sobre **un** documento es atómica; para que las dos se hagan juntas o ninguna haría falta una **transacción** (que necesita MongoDB en modo replica set).
