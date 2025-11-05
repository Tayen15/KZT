-- AlterTable
ALTER TABLE `GuildMember` ADD COLUMN `isOwner` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `PrayerTime` ADD COLUMN `customMessage` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ServerMonitoring` ADD COLUMN `checkInterval` INTEGER NULL DEFAULT 5,
    ADD COLUMN `currentPlayers` INTEGER NULL,
    ADD COLUMN `isOnline` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `lastChecked` DATETIME(3) NULL,
    ADD COLUMN `maxPlayers` INTEGER NULL,
    ADD COLUMN `notifyOffline` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notifyOnline` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notifyPlayerCount` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `serverHost` VARCHAR(191) NULL,
    ADD COLUMN `serverName` VARCHAR(191) NULL,
    ADD COLUMN `serverPort` INTEGER NULL DEFAULT 25565,
    ADD COLUMN `version` VARCHAR(191) NULL,
    MODIFY `type` VARCHAR(191) NOT NULL DEFAULT 'minecraft';
