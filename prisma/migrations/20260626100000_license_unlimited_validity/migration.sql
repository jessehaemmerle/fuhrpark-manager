-- Lizenzen koennen unbegrenzt gueltig sein: validUntil = NULL bedeutet "kein Ablauf".
ALTER TABLE "License" ALTER COLUMN "validUntil" DROP NOT NULL;
