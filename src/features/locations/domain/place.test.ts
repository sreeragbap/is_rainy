import { DEVICE_COORDINATE_PRECISION } from "@/config/app";
import { describe, expect, it } from "vitest";
import { makePlace, sameKey } from "./place";

/**
 * Identity across the three sources a place can arrive from.
 *
 * A device reading keeps four decimals, a searched city two, and the database
 * stores everything at two. Raw ids therefore disagree for one spot, which is
 * why favourite matching compares `sameKey` instead.
 */

const HERE = { latitude: 9.9312, longitude: 76.2673 };

describe("sameKey", () => {
  it("matches a device reading against the city saved from it", () => {
    const device = makePlace(
      { name: "Your location", country: "", admin: null, ...HERE },
      DEVICE_COORDINATE_PRECISION,
    );
    // What comes back from the database after reverse geocoding and storage.
    const saved = makePlace({ name: "Kochi", country: "IN", admin: "Kerala", ...HERE });

    expect(device.id).not.toBe(saved.id);
    expect(sameKey(device)).toBe(sameKey(saved));
  });

  it("keeps genuinely different places apart", () => {
    const kochi = makePlace({ name: "Kochi", country: "IN", admin: "Kerala", ...HERE });
    const aluva = makePlace({
      name: "Aluva",
      country: "IN",
      admin: "Kerala",
      latitude: 10.1081,
      longitude: 76.3517,
    });

    expect(sameKey(kochi)).not.toBe(sameKey(aluva));
  });

  it("ignores precision differences below the shared resolution", () => {
    const coarse = makePlace({ name: "Kochi", country: "IN", admin: null, ...HERE });
    const fine = makePlace(
      { name: "Kochi", country: "IN", admin: null, latitude: 9.9299, longitude: 76.2712 },
      DEVICE_COORDINATE_PRECISION,
    );

    expect(sameKey(coarse)).toBe(sameKey(fine));
  });
});
