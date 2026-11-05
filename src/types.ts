import type { ObjectId } from "mongodb";

export type ListingStatus = "AVAILABLE" | "RESERVED" | "SOLD";
export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type User = {
  name: string;
  email: string;
  city: string;
  joinedAt: Date;
  favorites: ObjectId[];
  ratingAverage: number;
  ratingCount: number;
};

export type Listing = {
  title: string;
  description: string;
  price: number;
  category: string;
  status: ListingStatus;
  city: string;
  publishedAt: Date;
  views: number;
  seller: { id: ObjectId; name: string };
  photos: { url: string; order: number }[];
  attributes: Record<string, unknown>;
};

export type Offer = {
  amount: number;
  status: OfferStatus;
  createdAt: Date;
  listing: { id: ObjectId; title: string; price: number };
  buyer: { id: ObjectId; name: string };
};