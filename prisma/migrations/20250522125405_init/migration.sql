-- CreateTable
CREATE TABLE "Authorization" (
    "customerId" VARCHAR(255) NOT NULL,
    "hsPortalId" VARCHAR(255) NOT NULL,
    "accessToken" VARCHAR(512) NOT NULL,
    "refreshToken" VARCHAR(255) NOT NULL,
    "expiresIn" INTEGER,
    "expiresAt" TIMESTAMP(6),

    CONSTRAINT "Authorization_pkey" PRIMARY KEY ("customerId")
);
