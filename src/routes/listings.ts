import { Router } from "express";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";
import { listingsCollection, offersCollection, usersCollection } from "../db";
import type { Listing } from "../types";

const router = Router();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

const LIST_FIELDS = { title: 1, price: 1, category: 1, city: 1, status: 1 };

/**
 * Obtiene el listado de anuncios con filtros opcionales.
 */
router.get("/", async (req, res) => {
  const filter: Filter<Listing> = {};

  if (typeof req.query.category === "string") {
    filter.category = req.query.category;
  }

  if (typeof req.query.city === "string") {
    filter.city = req.query.city;
  }

  if (req.query.maxPrice !== undefined) {
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

router.get("/stats", async (_req, res) => {
  const stats = await listingsCollection()
    .aggregate([
      { $group: { _id: "$category", count: { $sum: 1 }, averagePrice: { $avg: "$price" } } },
      { $project: { _id: 0, category: "$_id", count: 1, averagePrice: { $round: ["$averagePrice", 2] } } },
      { $sort: { category: 1 } },
    ])
    .toArray();

  res.json(stats);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

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

router.get("/:id/offers", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  const listingId = new ObjectId(id);

  const listing = await listingsCollection().findOne({ _id: listingId }, { projection: { _id: 1 } });
  if (!listing) {
    res.status(404).json({ error: "No existe ningún anuncio con ese id" });
    return;
  }

  const offers = await offersCollection().find({ "listing.id": listingId }).sort({ createdAt: -1 }).toArray();

  res.json(offers);
});

/**
 * Publica un nuevo anuncio validando los datos obligatorios.
 */
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

  const seller = await usersCollection().findOne({ _id: new ObjectId(body.sellerId) });
  if (!seller) {
    res.status(400).json({ error: "No existe ningún usuario con ese sellerId" });
    return;
  }

  const newListing: Listing = {
    title: body.title,
    description: body.description,
    price: body.price,
    category: body.category,
    status: "AVAILABLE",
    city: body.city,
    publishedAt: new Date(),
    views: 0,
    seller: { id: seller._id, name: seller.name },
    photos: [],
    attributes: body.attributes ?? {},
  };

  const result = await listingsCollection().insertOne(newListing);

  res.status(201).json({ _id: result.insertedId, ...newListing });
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  const price = req.body?.price;
  if (!isValidPrice(price)) {
    res.status(400).json({ error: "price es obligatorio y tiene que ser un número mayor o igual que 0" });
    return;
  }

  const listing = await listingsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { price } },
    { returnDocument: "after" },
  );

  if (!listing) {
    res.status(404).json({ error: "No existe ningún anuncio con ese id" });
    return;
  }

  res.json(listing);
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  const result = await listingsCollection().deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    res.status(404).json({ error: "No existe ningún anuncio con ese id" });
    return;
  }

  res.status(204).end();
});

export default router;
