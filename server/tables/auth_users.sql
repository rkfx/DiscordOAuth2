CREATE TABLE `auth_users` (
                              `token_type` CHAR(10),
                              `access_token` VARCHAR(255),
                              `last_refresh_stamp` BIGINT,
                              `expire_stamp` BIGINT,
                              `refresh_token` VARCHAR(255),
                              `did` VARCHAR(255)
);