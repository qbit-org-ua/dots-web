use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct Contest {
    pub contest_id: i32,
    pub title: String,
    pub contest_type: String,
    pub start_time: i64,
    pub options: i32,
    pub data: String,
    pub info: String,
    pub visible: i8,
    pub author_id: i32,
    pub allow_languages: String,
}

#[derive(Serialize, Deserialize, Default, Clone, Debug)]
pub struct ContestData {
    pub duration_time: Option<i64>,
    pub frozen_time: Option<i64>,
    pub allow_unfreeze: Option<bool>,
    pub absolute_time: Option<bool>,
    pub form_before_reg: Option<String>,
}

impl ContestData {
    /// Parse contest data field - try JSON first, then PHP serialized format
    pub fn parse(raw: &str) -> Self {
        if raw.is_empty() {
            return Self::default();
        }
        // Try JSON first
        if let Ok(data) = serde_json::from_str::<ContestData>(raw) {
            return data;
        }
        // Try PHP serialized format
        Self::from_php_serialized(raw)
    }

    fn from_php_serialized(raw: &str) -> Self {
        let mut data = Self::default();
        let map = parse_php_array(raw);
        if let Some(v) = map.get("duration_time") {
            data.duration_time = v.parse().ok();
        }
        if let Some(v) = map.get("frozen_time") {
            data.frozen_time = v.parse().ok();
        }
        if let Some(v) = map.get("allow_unfreeze") {
            data.allow_unfreeze = Some(v == "1" || v == "true");
        }
        if let Some(v) = map.get("absolute_time") {
            data.absolute_time = Some(v == "1" || v == "true");
        }
        if let Some(v) = map.get("form_before_reg") {
            data.form_before_reg = Some(v.clone());
        }
        data
    }
}

/// Simple PHP unserialize parser for associative arrays
/// Handles: a:N:{s:LEN:"key";TYPE:VALUE;...}
/// TYPE can be: i (int), s (string with length), b (bool)
pub fn parse_php_array(input: &str) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    let input = input.trim();

    // Must start with a:N:{
    if !input.starts_with("a:") {
        return map;
    }

    // Find the opening brace
    let brace_start = match input.find('{') {
        Some(pos) => pos,
        None => return map,
    };

    let inner = &input[brace_start + 1..];
    // Remove trailing }
    let inner = if inner.ends_with('}') {
        &inner[..inner.len() - 1]
    } else {
        inner
    };

    let mut pos = 0;
    let bytes = inner.as_bytes();

    while pos < bytes.len() {
        // Skip whitespace
        while pos < bytes.len() && bytes[pos] == b' ' {
            pos += 1;
        }
        if pos >= bytes.len() {
            break;
        }

        // Parse key (must be s:LEN:"key";)
        let key = match parse_php_string(inner, &mut pos) {
            Some(k) => k,
            None => break,
        };

        // Parse value
        if pos >= bytes.len() {
            break;
        }

        let val = match bytes[pos] {
            b's' => {
                // String value
                match parse_php_string(inner, &mut pos) {
                    Some(v) => v,
                    None => break,
                }
            }
            b'i' => {
                // Integer: i:VALUE;
                pos += 2; // skip "i:"
                let start = pos;
                while pos < bytes.len() && bytes[pos] != b';' {
                    pos += 1;
                }
                let val = inner[start..pos].to_string();
                if pos < bytes.len() {
                    pos += 1; // skip ;
                }
                val
            }
            b'b' => {
                // Boolean: b:0; or b:1;
                pos += 2; // skip "b:"
                let start = pos;
                while pos < bytes.len() && bytes[pos] != b';' {
                    pos += 1;
                }
                let val = inner[start..pos].to_string();
                if pos < bytes.len() {
                    pos += 1; // skip ;
                }
                val
            }
            b'N' => {
                // NULL: N;
                pos += 2; // skip "N;"
                String::new()
            }
            b'd' => {
                // Double: d:VALUE;
                pos += 2; // skip "d:"
                let start = pos;
                while pos < bytes.len() && bytes[pos] != b';' {
                    pos += 1;
                }
                let val = inner[start..pos].to_string();
                if pos < bytes.len() {
                    pos += 1;
                }
                val
            }
            _ => break,
        };

        map.insert(key, val);
    }

    map
}

fn parse_php_string(inner: &str, pos: &mut usize) -> Option<String> {
    let bytes = inner.as_bytes();
    if *pos >= bytes.len() || bytes[*pos] != b's' {
        return None;
    }
    *pos += 2; // skip "s:"

    // Read length
    let len_start = *pos;
    while *pos < bytes.len() && bytes[*pos] != b':' {
        *pos += 1;
    }
    let len: usize = inner[len_start..*pos].parse().ok()?;
    *pos += 1; // skip ':'

    // Skip opening quote
    if *pos < bytes.len() && bytes[*pos] == b'"' {
        *pos += 1;
    }

    // Read string content
    let start = *pos;
    let end = start + len;
    if end > bytes.len() {
        return None;
    }
    let val = inner[start..end].to_string();
    *pos = end;

    // Skip closing quote
    if *pos < bytes.len() && bytes[*pos] == b'"' {
        *pos += 1;
    }
    // Skip semicolon
    if *pos < bytes.len() && bytes[*pos] == b';' {
        *pos += 1;
    }

    Some(val)
}
