use std::path::Path;

/// Generate solution filename:
/// {solutionId}_{problemId}.{userId}.{langId}{checkType}
/// e.g. "197227_10007.18885.12F"
pub fn solution_filename(sid: u32, pid: u32, uid: u32, lang: i32, check_type: &str) -> String {
    format!(
        "{}_{}.{}.{}{}",
        sid, pid, uid, lang, check_type
    )
}

/// Get full path to a solution source file.
/// Path: <upload_dir>/sorted/<userId>/<problemId>/<filename>
/// Fallback: <upload_dir>/var/sorted/<uid:04>/<pid:04>/<filename_padded> (legacy)
pub fn solution_fullname(
    upload_dir: &str,
    sid: u32,
    pid: u32,
    uid: u32,
    lang: i32,
    check_type: &str,
) -> String {
    let filename = solution_filename(sid, pid, uid, lang, check_type);

    // Try new-style path first: sorted/<userId>/<problemId>/<filename>
    let new_path = format!("{}/sorted/{}/{}/{}", upload_dir, uid, pid, filename);
    if Path::new(&new_path).exists() {
        return new_path;
    }

    // Try legacy padded path: var/sorted/<uid:04>/<pid:04>/<filename_padded>
    let padded_filename = format!(
        "{:06}_{:04}.{:04}.{:02}{}",
        sid, pid, uid, lang, check_type
    );
    let legacy_path = format!(
        "{}/var/sorted/{:04}/{:04}/{}",
        upload_dir, uid, pid, padded_filename
    );
    if Path::new(&legacy_path).exists() {
        return legacy_path;
    }

    // Fallback to sources dir
    let sources_path = format!("{}/sources/{}", upload_dir, filename);
    if Path::new(&sources_path).exists() {
        return sources_path;
    }

    // Return new-style path for creation
    new_path
}

/// Get the directory for saving a new solution source file.
/// Path: <upload_dir>/sorted/<userId>/<problemId>/
pub fn solution_dir(upload_dir: &str, uid: u32, pid: u32) -> String {
    format!("{}/sorted/{}/{}", upload_dir, uid, pid)
}

/// Get full path to a result file.
/// Try results/{sid/1000}/{sid:06} first, fallback results/{sid:06}
pub fn results_fullname(upload_dir: &str, sid: u32) -> String {
    let subdir = sid / 1000;
    let new_path = format!("{}/var/results/{}/{:06}", upload_dir, subdir, sid);
    if Path::new(&new_path).exists() {
        return new_path;
    }

    let flat_path = format!("{}/var/results/{:06}", upload_dir, sid);
    if Path::new(&flat_path).exists() {
        return flat_path;
    }

    new_path
}

/// Get path for creating a new result file.
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
