use md5::{Digest, Md5};

/// Encrypt password using the same algorithm as the PHP backend:
/// md5(email + ':' + password)
/// See common.php line 345: md5( ($username ? ($username . ':') : '') . $password)
pub fn encrypt_password(email: &str, password: &str) -> String {
    let input = if email.is_empty() {
        password.to_string()
    } else {
        format!("{}:{}", email, password)
    };
    let mut hasher = Md5::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

/// Generate a random alphanumeric password of the given length
pub fn generate_random_password(len: usize) -> String {
    use rand::Rng;
    let charset = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::rng();
    (0..len)
        .map(|_| {
            let idx = rng.random_range(0..charset.len());
            charset[idx] as char
        })
        .collect()
}
