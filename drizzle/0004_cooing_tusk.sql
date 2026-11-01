CREATE TABLE `employment` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `employment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employment` ADD CONSTRAINT `employment_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_entry` ADD `employment_id` varchar(36);--> statement-breakpoint
INSERT INTO `employment` (`id`, `user_id`, `name`) SELECT UUID(), `users`.`user_id`, 'Vínculo principal' FROM (SELECT DISTINCT `user_id` FROM `monthly_entry`) AS `users`;--> statement-breakpoint
UPDATE `monthly_entry` JOIN `employment` ON `employment`.`user_id` = `monthly_entry`.`user_id` SET `monthly_entry`.`employment_id` = `employment`.`id`;--> statement-breakpoint
ALTER TABLE `monthly_entry` MODIFY COLUMN `employment_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_entry` ADD CONSTRAINT `monthly_entry_employment_id_employment_id_fk` FOREIGN KEY (`employment_id`) REFERENCES `employment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_entry` ADD CONSTRAINT `monthly_entry_employment_period_unique` UNIQUE(`user_id`,`employment_id`,`year`,`month`);--> statement-breakpoint
ALTER TABLE `monthly_entry` DROP INDEX `monthly_entry_user_period_unique`;
