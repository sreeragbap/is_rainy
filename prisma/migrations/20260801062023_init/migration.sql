-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" VARCHAR(2) NOT NULL,
    "state" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_history" (
    "id" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "location_id" TEXT NOT NULL,
    "searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_locations" (
    "id" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "location_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_name_idx" ON "locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "locations_latitude_longitude_key" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "search_history_client_id_searched_at_idx" ON "search_history"("client_id", "searched_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "search_history_client_id_location_id_key" ON "search_history"("client_id", "location_id");

-- CreateIndex
CREATE INDEX "favorite_locations_client_id_idx" ON "favorite_locations"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_locations_client_id_location_id_key" ON "favorite_locations"("client_id", "location_id");

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_locations" ADD CONSTRAINT "favorite_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
