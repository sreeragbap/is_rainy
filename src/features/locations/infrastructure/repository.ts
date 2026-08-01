import type { PlaceRepository } from "../domain/place-repository";
import { PrismaPlaceRepository } from "./prisma-place-repository";

/**
 * Composition root for the locations feature. The one place that decides where
 * a client's places are stored.
 */
export const placeRepository: PlaceRepository = new PrismaPlaceRepository();
