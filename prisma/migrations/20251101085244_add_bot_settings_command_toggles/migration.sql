-- CreateTable
CREATE TABLE `BotSettings` (
    `id` VARCHAR(191) NOT NULL,
    `activityType` VARCHAR(191) NOT NULL DEFAULT 'Watching',
    `activityText` VARCHAR(191) NOT NULL DEFAULT 'over servers',
    `status` VARCHAR(191) NOT NULL DEFAULT 'online',
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `maintenanceMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommandToggle` (
    `id` VARCHAR(191) NOT NULL,
    `commandName` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `category` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommandToggle_commandName_key`(`commandName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
