pub const _ACCESS_READ_PROBLEMS: u32 = 0x0001;
pub const _ACCESS_READ_CONTESTS: u32 = 0x0002;
pub const ACCESS_READ_PROFILES: u32 = 0x0004;
pub const _ACCESS_READ_STANDINGS: u32 = 0x0008;
pub const _ACCESS_UPLOAD_SOLUTIONS: u32 = 0x0010;
pub const ACCESS_WRITE_PROBLEMS: u32 = 0x0100;
pub const _ACCESS_WRITE_CONTESTS: u32 = 0x0200;
pub const _ACCESS_WRITE_PROFILES: u32 = 0x0400;
pub const _ACCESS_WRITE_REGISTRATION: u32 = 0x0800;
pub const ACCESS_DOWNLOAD_SOLUTIONS: u32 = 0x1000;
pub const _ACCESS_UPLOAD_RESULTS: u32 = 0x2000;
pub const ACCESS_SYSTEM_ADMIN: u32 = 0x8000;

pub const _ACCESS_ANONYMOUS_USER: u32 = 0x0007;
pub const ACCESS_REGISTERED_USER: u32 = 0x001f;
pub const _ACCESS_TEACHER_USER: u32 = 0xfffe;
pub const _ACCESS_ADMIN_USER: u32 = 0xffff;

#[inline]
pub fn has_access(user_access: u32, required: u32) -> bool {
    (user_access & required) == required
}

#[inline]
pub fn is_admin(user_access: u32) -> bool {
    has_access(user_access, ACCESS_SYSTEM_ADMIN)
}

#[inline]
pub fn is_teacher(user_access: u32) -> bool {
    has_access(user_access, ACCESS_WRITE_PROBLEMS)
}
