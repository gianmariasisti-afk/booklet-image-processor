CREATE TABLE `cropped_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` int NOT NULL,
	`croppedImageUrl` text NOT NULL,
	`croppedImageKey` varchar(512) NOT NULL,
	`detectionConfidence` varchar(20) NOT NULL,
	`regionCoordinates` json NOT NULL,
	`imageType` varchar(64) NOT NULL,
	`processingStatus` enum('detected','cropped','described','failed') NOT NULL DEFAULT 'detected',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cropped_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `descriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`croppedImageId` int NOT NULL,
	`uploadId` int NOT NULL,
	`description` text NOT NULL,
	`contextSummary` text,
	`generationModel` varchar(128) DEFAULT 'gpt-4-vision',
	`generationTokens` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `descriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`originalImageUrl` text NOT NULL,
	`originalImageKey` varchar(512) NOT NULL,
	`mimeType` varchar(64) NOT NULL,
	`fileSize` int NOT NULL,
	`processingStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`totalImagesDetected` int DEFAULT 0,
	`totalImagesProcessed` int DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uploads_id` PRIMARY KEY(`id`)
);
