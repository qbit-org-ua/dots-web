use std::path::PathBuf;

/// Generate solution filename:
/// {solutionId}_{problemId}.{userId}.{langId}{checkType}
pub fn solution_filename(sid: u32, pid: u32, uid: u32, lang: i32, check_type: &str) -> String {
    format!("{}_{}.{}.{}{}", sid, pid, uid, lang, check_type)
}

/// Get full path to a solution source file.
/// Tries new path first, then legacy padded path, then flat sources dir.
pub fn solution_fullname(upload_dir: &str, sid: u32, pid: u32, uid: u32, lang: i32, check_type: &str) -> PathBuf {
    let filename = solution_filename(sid, pid, uid, lang, check_type);

    // New-style: sorted/<userId>/<problemId>/<filename>
    let new_path: PathBuf = [upload_dir, "sorted", &uid.to_string(), &pid.to_string(), &filename].iter().collect();
    if new_path.exists() {
        return new_path;
    }

    // Legacy padded: sorted/<uid:04>/<pid:04>/<filename_padded>
    let padded_filename = format!("{:06}_{:04}.{:04}.{:02}{}", sid, pid, uid, lang, check_type);
    let legacy_path: PathBuf = [upload_dir, "sorted", &format!("{:04}", uid), &format!("{:04}", pid), &padded_filename].iter().collect();
    if legacy_path.exists() {
        return legacy_path;
    }

    // Flat sources fallback
    let sources_path: PathBuf = [upload_dir, "sources", &filename].iter().collect();
    if sources_path.exists() {
        return sources_path;
    }

    new_path
}

/// Get the directory for saving a new solution source file.
pub fn solution_dir(upload_dir: &str, uid: u32, pid: u32) -> PathBuf {
    [upload_dir, "sorted", &uid.to_string(), &pid.to_string()].iter().collect()
}

/// Get full path to a result file.
pub fn results_fullname(upload_dir: &str, sid: u32) -> PathBuf {
    let subdir = (sid / 1000).to_string();
    let fname = format!("{:06}", sid);

    let new_path: PathBuf = [upload_dir, "results", &subdir, &fname].iter().collect();
    if new_path.exists() {
        return new_path;
    }

    let flat_path: PathBuf = [upload_dir, "results", &fname].iter().collect();
    if flat_path.exists() {
        return flat_path;
    }

    new_path
}

/// Get path for creating a new result file.
pub fn results_fullname_create(upload_dir: &str, sid: u32) -> PathBuf {
    let subdir = (sid / 1000).to_string();
    let fname = format!("{:06}", sid);
    [upload_dir, "results", &subdir, &fname].iter().collect()
}

/// Get path to test archive for a problem.
pub fn test_archive_path(upload_dir: &str, pid: u32) -> PathBuf {
    let fname = format!("{}.tar.gz", pid);
    [upload_dir, "test_db", &fname].iter().collect()
}

/// Get path to problem attachment file.
pub fn problem_attachment_path(upload_dir: &str, pid: u32) -> PathBuf {
    [upload_dir, "problems", &pid.to_string()].iter().collect()
}

/// Get path to problem config file.
pub fn problem_config_path(upload_dir: &str, pid: u32) -> PathBuf {
    let fname = format!("{}.config", pid);
    [upload_dir, "problems", &fname].iter().collect()
}
