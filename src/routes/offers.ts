import { Router } from "express";
import { ObjectId } from "mongodb";
import { listingsCollection, offersCollection, usersCollection } from "../db";
import type { Offer } from "../types";

const router = Router();

// ---------- POST /api/offers (hacer una oferta) ----------
router.post("/", async (req, res) => {
  const { listingId, buyerId, amount } = req.body ?? {};

  // 1. Formato de los ids
  if (typeof listingId !== "string" || !ObjectId.isValid(listingId)) {
    res.status(400).json({ error: "listingId no tiene un formato válido" });
    return;
  }
  if (typeof buyerId !== "string" || !ObjectId.isValid(buyerId)) {
    res.status(400).json({ error: "buyerId no tiene un formato válido" });
    return;
  }

  // 2. La cantidad es un número mayor que 0
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "amount tiene que ser un número mayor que 0" });
    return;
  }

  // 3. El anuncio existe (es un id del body: si no existe, 400)
  const listing = await listingsCollection().findOne({ _id: new ObjectId(listingId) });
  if (!listing) {
    res.status(400).json({ error: "No existe ningún anuncio con ese listingId" });
    return;
  }

  // 4. El comprador existe
  const buyer = await usersCollection().findOne({ _id: new ObjectId(buyerId) });
  if (!buyer) {
    res.status(400).json({ error: "No existe ningún usuario con ese buyerId" });
    return;
  }

  // 5. La petición es correcta, pero choca con el estado del anuncio
  if (listing.status !== "AVAILABLE") {
    res.status(409).json({ error: `No se puede ofertar: el anuncio está ${listing.status}` });
    return;
  }

  // Guardamos copias del anuncio y del comprador (desnormalización)
  const newOffer: Offer = {
    amount,
    status: "PENDING",
    createdAt: new Date(),
    listing: { id: listing._id, title: listing.title, price: listing.price },
    buyer: { id: buyer._id, name: buyer.name },
  };

  const result = await offersCollection().insertOne(newOffer);

  res.status(201).json({ _id: result.insertedId, ...newOffer });
});

// ---------- PATCH /api/offers/:id (aceptar una oferta) ----------
router.patch("/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  // De momento solo se puede aceptar una oferta
  if (req.body?.status !== "ACCEPTED") {
    res.status(400).json({ error: 'status tiene que ser "ACCEPTED"' });
    return;
  }

  const offerId = new ObjectId(id);

  const offer = await offersCollection().findOne({ _id: offerId });
  if (!offer) {
    res.status(404).json({ error: "No existe ninguna oferta con ese id" });
    return;
  }

  if (offer.status !== "PENDING") {
    res.status(409).json({ error: `No se puede aceptar: la oferta está ${offer.status}` });
    return;
  }

  const listing = await listingsCollection().findOne({ _id: offer.listing.id });
  if (!listing || listing.status !== "AVAILABLE") {
    res.status(409).json({ error: "No se puede aceptar: el anuncio ya no está disponible" });
    return;
  }

  // Escritura 1: la oferta pasa a ACCEPTED.
  // Filtramos también por status PENDING por si otra petición la ha cambiado entre medias.
  const acceptedOffer = await offersCollection().findOneAndUpdate(
    { _id: offerId, status: "PENDING" },
    { $set: { status: "ACCEPTED" } },
    { returnDocument: "after" },
  );
  if (!acceptedOffer) {
    res.status(409).json({ error: "No se puede aceptar: la oferta ya no está PENDING" });
    return;
  }

  // Escritura 2: el anuncio pasa a RESERVED.
  // Si el servidor se apagara justo entre la 1 y la 2, quedaría la oferta aceptada
  // y el anuncio AVAILABLE. Para evitarlo de verdad haría falta una transacción.
  await listingsCollection().updateOne({ _id: offer.listing.id }, { $set: { status: "RESERVED" } });

  res.json(acceptedOffer);
});

export default router;
