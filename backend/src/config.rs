use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub upload_dir: String,
    pub frontend_url: String,
    pub listen_addr: String,
    pub bot_friends: Vec<(String, String)>,
}

impl Config {
    pub fn from_env() -> Self {
        let bot_friends_raw = env::var("BOT_FRIENDS").unwrap_or_default();
        let bot_friends = bot_friends_raw
            .split(',')
            .filter(|s| !s.is_empty())
            .filter_map(|pair| {
                let parts: Vec<&str> = pair.splitn(2, ':').collect();
                if parts.len() == 2 {
                    Some((parts[0].to_string(), parts[1].to_string()))
                } else {
                    None
                }
            })
            .collect();

        Config {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            upload_dir: env::var("UPLOAD_DIR").unwrap_or_else(|_| "/mnt/dots-web-php".to_string()),
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string()),
            listen_addr: env::var("LISTEN_ADDR")
                .unwrap_or_else(|_| "0.0.0.0:3001".to_string()),
            bot_friends,
        }
    }
}
