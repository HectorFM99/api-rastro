import { Router } from "express";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";
import { listingsCollection, usersCollection } from "../db";
import type { Listing } from "../types";

const router = Router();

// ¿Es un texto con algo dentro (no solo espacios)?
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

// ¿Es un número de verdad, mayor o igual que 0? ("75" no vale: es texto)
function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

// Lo que se enseña de cada anuncio en un listado
const LIST_FIELDS = { title: 1, price: 1, category: 1, city: 1, status: 1 };

// ---------- GET /api/listings (listado con filtros) ----------
router.get("/", async (req, res) => {
  // Cada filtro se construye a mano: nunca pasamos req.query tal cual
  const filter: Filter<Listing> = {};

  if (typeof req.query.category === "string") {
    filter.category = req.query.category;
  }

  if (typeof req.query.city === "string") {
    filter.city = req.query.city;
  }

  if (req.query.maxPrice !== undefined) {
    // Todo lo que llega en la URL es texto: hay que convertirlo
    const maxPrice = typeof req.query.maxPrice === "string" ? Number(req.query.maxPrice) : NaN;
    if (req.query.maxPrice === "" || Number.isNaN(maxPrice)) {
      res.status(400).json({ error: "maxPrice tiene que ser un número" });
      return;
    }
    filter.price = { $lte: maxPrice };
  }

  const listings = await listingsCollection()
    .find(filter)
    .project(LIST_FIELDS)
    .sort({ publishedAt: -1 })
    .toArray();

  res.json(listings);
});

// ---------- GET /api/listings/:id (ficha) ----------
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  // Alguien abre la ficha: sumamos 1 a las visitas y devolvemos el anuncio ya actualizado
  const listing = await listingsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $inc: { views: 1 } },
    { returnDocument: "after" },
  );

  if (!listing) {
    res.status(404).json({ error: "No existe ningún anuncio con ese id" });
    return;
  }

  res.json(listing);
});

// ---------- POST /api/listings (publicar) ----------
router.post("/", async (req, res) => {
  const body = req.body ?? {};

  for (const field of ["title", "description", "category", "city"] as const) {
    if (!isNonEmptyString(body[field])) {
      res.status(400).json({ error: `${field} es obligatorio y tiene que ser un texto no vacío` });
      return;
    }
  }

  if (!isValidPrice(body.price)) {
    res.status(400).json({ error: "price es obligatorio y tiene que ser un número mayor o igual que 0" });
    return;
  }

  if (
    body.attributes !== undefined &&
    (typeof body.attributes !== "object" || body.attributes === null || Array.isArray(body.attributes))
  ) {
    res.status(400).json({ error: "attributes tiene que ser un objeto" });
    return;
  }

  if (typeof body.sellerId !== "string" || !ObjectId.isValid(body.sellerId)) {
    res.status(400).json({ error: "sellerId no tiene un formato válido" });
    return;
  }

  // MongoDB no comprueba las referencias: lo hacemos nosotros
  const seller = await usersCollection().findOne({ _id: new ObjectId(body.sellerId) });
  if (!seller) {
    res.status(400).json({ error: "No existe ningún usuario con ese sellerId" });
    return;
  }

  // Construimos el anuncio campo a campo: nunca guardamos req.body tal cual.
  // status, publishedAt, views y photos los pone la API, no el cliente.
  const newListing: Listing = {
    title: body.title,
    description: body.description,
    price: body.price,
    category: body.category,
    status: "AVAILABLE",
    city: body.city,
    publishedAt: new Date(),
    views: 0,
    seller: { id: seller._id, name: seller.name }, // copia del nombre (desnormalización)
    photos: [],
    attributes: body.attributes ?? {},
  };

  const result = await listingsCollection().insertOne(newListing);

  res.status(201).json({ _id: result.insertedId, ...newListing });
});

export default router;
