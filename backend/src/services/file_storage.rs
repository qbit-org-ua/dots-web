use std::path::Path;

/// Generate solution filename matching PHP format:
/// {sid:06}_{pid:04}.{uid:04}.{lang:02}{check_type}
pub fn solution_filename(sid: u32, pid: u32, uid: u32, lang: i32, check_type: &str) -> String {
    format!(
        "{:06}_{:04}.{:04}.{:02}{}",
        sid, pid, uid, lang, check_type
    )
}

/// Get full path to a solution source file.
/// Try sorted/{uid:04}/{pid:04}/{filename} first, fallback sources/{filename}
pub fn solution_fullname(
    upload_dir: &str,
    sid: u32,
    pid: u32,
    uid: u32,
    lang: i32,
    check_type: &str,
) -> String {
    let filename = solution_filename(sid, pid, uid, lang, check_type);

    // Try sorted path first
    let sorted_path = format!(
        "{}/sorted/{:04}/{:04}/{}",
        upload_dir, uid, pid, filename
    );
    if Path::new(&sorted_path).exists() {
        return sorted_path;
    }

    // Fallback to sources
    format!("{}/sources/{}", upload_dir, filename)
}

/// Get full path to a result file.
/// Try results/{sid/1000}/{sid:06} first, fallback results/{sid:06}
pub fn results_fullname(upload_dir: &str, sid: u32) -> String {
    let subdir = sid / 1000;
    let new_path = format!("{}/var/results/{}/{:06}", upload_dir, subdir, sid);
    if Path::new(&new_path).exists() {
        return new_path;
    }

    // Fallback to flat structure
    let flat_path = format!("{}/var/results/{:06}", upload_dir, sid);
    if Path::new(&flat_path).exists() {
        return flat_path;
    }

    // Return new-style path for creation
    new_path
}

/// Get path for creating a new result file.
/// Always uses results/{sid/1000}/{sid:06} and creates directories.
pub fn results_fullname_create(upload_dir: &str, sid: u32) -> String {
    let subdir = sid / 1000;
    format!("{}/var/results/{}/{:06}", upload_dir, subdir, sid)
}

/// Get path to test archive for a problem
pub fn test_archive_path(upload_dir: &str, pid: u32) -> String {
    format!("{}/var/test_db/{}.tar.gz", upload_dir, pid)
}

/// Get path to problem config file
pub fn problem_config_path(upload_dir: &str, pid: u32) -> String {
    format!("{}/var/problems/{}.config", upload_dir, pid)
}
