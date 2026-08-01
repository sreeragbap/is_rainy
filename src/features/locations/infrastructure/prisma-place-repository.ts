import type { Location, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { FavoritesLimitError, makePlace, type Place } from "../domain/place";
import type { PlaceRepository } from "../domain/place-repository";

/**
 * Prisma-backed places, deduplicated by coordinates.
 *
 * Locations are shared across clients — two people searching Kochi converge on
 * one row — while history and favourites are always scoped to one anonymous
 * client id.
 */

function toPlace(location: Location): Place {
  return makePlace({
    name: location.name,
    country: location.country,
    admin: location.state,
    latitude: location.latitude,
    longitude: location.longitude,
  });
}

/**
 * Find or create the canonical row for a place. Coordinates are already rounded
 * by `makePlace`, so the unique constraint on (latitude, longitude) is what
 * makes this converge.
 */
async function upsertLocation(
  tx: Pick<PrismaClient, "location">,
  place: Place,
): Promise<{ id: string }> {
  return tx.location.upsert({
    where: {
      latitude_longitude: { latitude: place.latitude, longitude: place.longitude },
    },
    // Refresh the label: geocoding names improve over time, and the row is
    // shared, so the newest spelling wins.
    update: { name: place.name, country: place.country, state: place.admin },
    create: {
      name: place.name,
      country: place.country,
      state: place.admin,
      latitude: place.latitude,
      longitude: place.longitude,
    },
    select: { id: true },
  });
}

export class PrismaPlaceRepository implements PlaceRepository {
  async listRecent(clientId: string, limit: number): Promise<Place[]> {
    const rows = await getPrisma().searchHistory.findMany({
      where: { clientId },
      orderBy: { searchedAt: "desc" },
      take: limit,
      select: { location: true },
    });

    return rows.map((row) => toPlace(row.location));
  }

  async listFavorites(clientId: string): Promise<Place[]> {
    const rows = await getPrisma().favoriteLocation.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
      select: { location: true },
    });

    return rows.map((row) => toPlace(row.location));
  }

  async recordSearch(clientId: string, place: Place, limit: number): Promise<void> {
    await getPrisma().$transaction(async (tx) => {
      const location = await upsertLocation(tx, place);

      // Unique on (clientId, locationId): re-searching a place moves it to the
      // top instead of adding a duplicate row.
      await tx.searchHistory.upsert({
        where: { clientId_locationId: { clientId, locationId: location.id } },
        update: { searchedAt: new Date() },
        create: { clientId, locationId: location.id },
      });

      const keep = await tx.searchHistory.findMany({
        where: { clientId },
        orderBy: { searchedAt: "desc" },
        take: limit,
        select: { id: true },
      });

      await tx.searchHistory.deleteMany({
        where: { clientId, id: { notIn: keep.map((row) => row.id) } },
      });
    });
  }

  async toggleFavorite(clientId: string, place: Place, limit: number): Promise<boolean> {
    return getPrisma().$transaction(async (tx) => {
      const location = await upsertLocation(tx, place);

      const existing = await tx.favoriteLocation.findUnique({
        where: { clientId_locationId: { clientId, locationId: location.id } },
        select: { id: true },
      });

      if (existing) {
        await tx.favoriteLocation.delete({ where: { id: existing.id } });
        return false;
      }

      // Counted inside the transaction so two rapid taps cannot both pass.
      const count = await tx.favoriteLocation.count({ where: { clientId } });
      if (count >= limit) throw new FavoritesLimitError(limit);

      await tx.favoriteLocation.create({ data: { clientId, locationId: location.id } });
      return true;
    });
  }
}
