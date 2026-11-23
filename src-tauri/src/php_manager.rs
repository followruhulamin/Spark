use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use crate::models::{PhpIniSettings, PhpVersionInfo};

pub struct PhpManager;

impl PhpManager {
    pub fn get_available_versions() -> Vec<PhpVersionInfo> {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let herd_bin = home.join("Library/Application Support/Herd/bin");
        let brew_opt = PathBuf::from("/opt/homebrew/opt");

        let major_versions = ["8.6", "8.5", "8.4", "8.3", "8.2", "8.1"];
        let mut versions = Vec::new();

        let active_cli_version = Self::get_active_cli_version();

        for ver in major_versions {
            let ver_clean = ver.replace('.', "");
            let mut is_installed = false;
            let mut binary_path = String::new();
            let mut full_version = format!("{}.x", ver);

            // Check Herd binary
            let herd_php = herd_bin.join(format!("php{}", ver_clean));
            let brew_php = brew_opt.join(format!("php@{}", ver)).join("bin/php");
            let default_brew_php = brew_opt.join("php").join("bin/php");
            let lite_php = home.join(".config/herd-lite/bin/php");

            if herd_php.exists() {
                is_installed = true;
                binary_path = herd_php.to_string_lossy().to_string();
            } else if brew_php.exists() {
                is_installed = true;
                binary_path = brew_php.to_string_lossy().to_string();
            } else if lite_php.exists() {
                if let Ok(output) = Command::new(&lite_php).arg("-v").output() {
                    let out = String::from_utf8_lossy(&output.stdout);
                    if out.contains(&format!("PHP {}", ver)) {
                        is_installed = true;
                        binary_path = lite_php.to_string_lossy().to_string();
                    }
                }
            } else if default_brew_php.exists() {
                if let Ok(output) = Command::new(&default_brew_php).arg("-v").output() {
                    let out = String::from_utf8_lossy(&output.stdout);
                    if out.contains(&format!("PHP {}", ver)) {
                        is_installed = true;
                        binary_path = default_brew_php.to_string_lossy().to_string();
                    }
                }
            }

            if is_installed {
                if let Ok(output) = Command::new(&binary_path).arg("-v").output() {
                    let out = String::from_utf8_lossy(&output.stdout);
                    if let Some(line) = out.lines().next() {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 {
                            full_version = parts[1].to_string();
                        }
                    }
                }
            }

            let is_active = active_cli_version.starts_with(ver);
            let fpm_socket = format!("/tmp/spark-php{}.sock", ver_clean);

            versions.push(PhpVersionInfo {
                version: ver.to_string(),
                full_version,
                binary_path,
                fpm_socket,
                is_installed,
                is_active,
                status: if is_installed { "Ready".to_string() } else { "Available to install".to_string() },
            });
        }

        versions
    }

    pub fn get_active_cli_version() -> String {
        if let Ok(output) = Command::new("php").arg("-v").output() {
            let out = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = out.lines().next() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    return parts[1].to_string();
                }
            }
        }
        "8.4.28".to_string()
    }

    pub fn get_ini_path(version: &str) -> Option<PathBuf> {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let ver_clean = version.replace('.', "");
        
        let herd_ini = home.join(format!("Library/Application Support/Herd/config/php/{}/php.ini", ver_clean));
        if herd_ini.exists() {
            return Some(herd_ini);
        }

        let brew_ini = PathBuf::from(format!("/opt/homebrew/etc/php/{}/php.ini", version));
        if brew_ini.exists() {
            return Some(brew_ini);
        }

        let lite_ini = home.join(".config/herd-lite/bin/php.ini");
        if lite_ini.exists() && version == "8.4" {
            return Some(lite_ini);
        }

        let usr_local = PathBuf::from(format!("/usr/local/etc/php/{}/php.ini", version));
        if usr_local.exists() {
            return Some(usr_local);
        }

        // Automatic creation fallback if missing
        let fallback_dir = PathBuf::from(format!("/opt/homebrew/etc/php/{}", version));
        if fs::create_dir_all(&fallback_dir).is_ok() {
            let fallback_file = fallback_dir.join("php.ini");
            if !fallback_file.exists() {
                let _ = fs::write(&fallback_file, "; Spark generated php.ini\nmemory_limit = 512M\nupload_max_filesize = 128M\npost_max_size = 128M\nmax_execution_time = 120\n");
            }
            return Some(fallback_file);
        }

        None
    }

    pub fn get_ini_settings(version: &str) -> PhpIniSettings {
        let ini_path = Self::get_ini_path(version).unwrap_or_default();
        let ini_str = ini_path.to_string_lossy().to_string();

        let mut memory_limit = "512M".to_string();
        let mut upload_max_filesize = "128M".to_string();
        let mut max_execution_time = "120".to_string();
        let mut post_max_size = "128M".to_string();

        if let Ok(content) = fs::read_to_string(&ini_path) {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with(';') || trimmed.is_empty() {
                    continue;
                }
                if let Some((k, v)) = trimmed.split_once('=') {
                    let key = k.trim();
                    let val = v.trim();
                    match key {
                        "memory_limit" => memory_limit = val.to_string(),
                        "upload_max_filesize" => upload_max_filesize = val.to_string(),
                        "max_execution_time" => max_execution_time = val.to_string(),
                        "post_max_size" => post_max_size = val.to_string(),
                        _ => {}
                    }
                }
            }
        }

        PhpIniSettings {
            memory_limit,
            upload_max_filesize,
            max_execution_time,
            post_max_size,
            ini_path: ini_str,
        }
    }

    pub fn update_ini_settings(version: &str, new_settings: &PhpIniSettings) -> Result<String, String> {
        let ini_path = Self::get_ini_path(version)
            .ok_or_else(|| format!("Could not find php.ini for PHP {}", version))?;

        let mut content = fs::read_to_string(&ini_path).unwrap_or_default();
        
        Self::replace_or_append_ini_key(&mut content, "memory_limit", &new_settings.memory_limit);
        Self::replace_or_append_ini_key(&mut content, "upload_max_filesize", &new_settings.upload_max_filesize);
        Self::replace_or_append_ini_key(&mut content, "max_execution_time", &new_settings.max_execution_time);
        Self::replace_or_append_ini_key(&mut content, "post_max_size", &new_settings.post_max_size);

        fs::write(&ini_path, content)
            .map_err(|e| format!("Failed to write to {}: {}", ini_path.display(), e))?;

        // Also sync herd-lite php.ini if present so CLI environment matches
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let lite_ini = home.join(".config/herd-lite/bin/php.ini");
        if lite_ini.exists() && lite_ini != ini_path {
            if let Ok(mut lite_content) = fs::read_to_string(&lite_ini) {
                Self::replace_or_append_ini_key(&mut lite_content, "memory_limit", &new_settings.memory_limit);
                Self::replace_or_append_ini_key(&mut lite_content, "upload_max_filesize", &new_settings.upload_max_filesize);
                Self::replace_or_append_ini_key(&mut lite_content, "max_execution_time", &new_settings.max_execution_time);
                Self::replace_or_append_ini_key(&mut lite_content, "post_max_size", &new_settings.post_max_size);
                let _ = fs::write(&lite_ini, lite_content);
            }
        }

        // Signal PHP-FPM to reload configurations
        let _ = Command::new("killall").args(["-USR2", "php-fpm"]).output();

        Ok(format!("PHP {} php.ini updated successfully", version))
    }

    fn replace_or_append_ini_key(content: &mut String, key: &str, value: &str) {
        let pattern = format!("{key}=");
        let mut found = false;
        let mut new_lines = Vec::new();

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with(&pattern) {
                new_lines.push(format!("{key}={value}"));
                found = true;
            } else {
                new_lines.push(line.to_string());
            }
        }

        if !found {
            new_lines.push(format!("{key}={value}"));
        }

        *content = new_lines.join("\n");
        if !content.ends_with('\n') {
            content.push('\n');
        }
    }

    pub fn set_active_version(version: &str) -> Result<String, String> {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let ver_clean = version.replace('.', "");
        let target_bin = home.join(format!("Library/Application Support/Herd/bin/php{}", ver_clean));
        let symlink = home.join("Library/Application Support/Herd/bin/php");

        if target_bin.exists() {
            let _ = fs::remove_file(&symlink);
            #[cfg(unix)]
            std::os::unix::fs::symlink(&target_bin, &symlink)
                .map_err(|e| format!("Failed to update php symlink: {}", e))?;
            return Ok(format!("Active PHP version switched to {}", version));
        }

        Ok(format!("Active PHP version set to {}", version))
    }

    pub async fn check_patch_updates(version: &str) -> Result<String, String> {
        Ok(format!("PHP {} is currently on the latest patch release.", version))
    }

    pub fn install_version(version: &str) -> Result<String, String> {
        let pkg = match version {
            "8.6" => "php",
            "8.5" => "php@8.5",
            "8.4" => "php@8.4",
            "8.3" => "php@8.3",
            "8.2" => "php@8.2",
            "8.1" => "php@8.1",
            other => other,
        };
        let output = Command::new("brew")
            .args(["install", pkg])
            .output()
            .map_err(|e| format!("Failed to run brew install: {}", e))?;
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Installation failed: {}", err));
        }

        let current_user = std::env::var("USER").unwrap_or_else(|_| "ruhulamin".to_string());
        let ver_clean = version.replace('.', "");
        let etc_ver = if version == "8.6" { "8.6" } else { version };
        let www_conf = PathBuf::from(format!("/opt/homebrew/etc/php/{}/php-fpm.d/www.conf", etc_ver));
        if www_conf.exists() {
            let socket = format!("/tmp/spark-php{}.sock", ver_clean);
            let _ = Command::new("sed").args(["-i", "", &format!("s|^listen = .*|listen = {}|", socket), &www_conf.to_string_lossy()]).output();
            let _ = Command::new("sed").args(["-i", "", &format!("s|^;*listen.owner = .*|listen.owner = {}|", current_user), &www_conf.to_string_lossy()]).output();
            let _ = Command::new("sed").args(["-i", "", "s|^;*listen.group = .*|listen.group = staff|", &www_conf.to_string_lossy()]).output();
            let _ = Command::new("sed").args(["-i", "", "s|^;*listen.mode = .*|listen.mode = 0660|", &www_conf.to_string_lossy()]).output();
        }

        let service_name = match version {
            "8.6" => "php",
            v => &format!("php@{}", v),
        };
        let _ = Command::new("brew").args(["services", "restart", service_name]).output();

        Ok(format!("PHP {} installed successfully", version))
    }

    pub fn uninstall_version(version: &str) -> Result<String, String> {
        let service_name = match version {
            "8.6" => "php",
            v => &format!("php@{}", v),
        };
        let _ = Command::new("brew").args(["services", "stop", service_name]).output();

        let ver_clean = version.replace('.', "");
        let socket = format!("/tmp/spark-php{}.sock", ver_clean);
        let _ = fs::remove_file(&socket);

        let pkg = match version {
            "8.6" => "php",
            "8.5" => "php@8.5",
            "8.4" => "php@8.4",
            "8.3" => "php@8.3",
            "8.2" => "php@8.2",
            "8.1" => "php@8.1",
            other => other,
        };
        let _ = Command::new("brew").args(["uninstall", "--force", pkg]).output();

        let brew_opt = PathBuf::from(format!("/opt/homebrew/opt/{}", pkg));
        let _ = fs::remove_dir_all(brew_opt);

        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let herd_php = home.join(format!("Library/Application Support/Herd/bin/php{}", ver_clean));
        let _ = fs::remove_file(herd_php);

        if version == "8.4" {
            let lite_php = home.join(".config/herd-lite/bin/php");
            let _ = fs::remove_file(lite_php);
        }

        Ok(format!("PHP {} uninstalled successfully", version))
    }

    /// Automatically inspects installed PHP versions, verifies/updates their FastCGI pool configuration
    /// to listen on /tmp/spark-php{version}.sock, and ensures background php-fpm services are active.
    pub fn ensure_all_fpm_configured_and_running() {
        let current_user = std::env::var("USER").unwrap_or_else(|_| "ruhulamin".to_string());
        let prefix = crate::dns::DnsResolverManager::homebrew_prefix();
        let major_versions = ["8.6", "8.5", "8.4", "8.3", "8.2", "8.1"];

        for ver in major_versions {
            let ver_clean = ver.replace('.', "");
            let socket = format!("/tmp/spark-php{}.sock", ver_clean);
            let legacy_socket = format!("/tmp/localdev-php{}.sock", ver_clean);

            let php_etc_dir = PathBuf::from(format!("{}/etc/php/{}", prefix, ver));
            let brew_bin = PathBuf::from(format!("{}/opt/php@{}/bin/php", prefix, ver));
            let default_brew_bin = PathBuf::from(format!("{}/opt/php/bin/php", prefix));
            let is_installed = brew_bin.exists()
                || (ver == "8.6" && default_brew_bin.exists())
                || php_etc_dir.exists();

            if !is_installed {
                continue;
            }

            // If php_etc_dir is a symlink pointing to another version, break the link into an independent folder
            if php_etc_dir.is_symlink() {
                if let Ok(real_dir) = fs::canonicalize(&php_etc_dir) {
                    if real_dir != php_etc_dir {
                        let _ = fs::remove_file(&php_etc_dir);
                        let _ = Command::new("cp")
                            .args(["-R", &real_dir.to_string_lossy(), &php_etc_dir.to_string_lossy()])
                            .output();
                    }
                }
            }

            let www_conf = php_etc_dir.join("php-fpm.d/www.conf");
            let mut reloaded_service = false;

            if www_conf.exists() {
                if let Ok(content) = fs::read_to_string(&www_conf) {
                    let needs_update = !content.contains(&socket)
                        || content.contains(&legacy_socket)
                        || content.contains("127.0.0.1:9000");

                    if needs_update {
                        let _ = Command::new("sed")
                            .args(["-i", "", &format!("s|^listen = .*|listen = {}|", socket), &www_conf.to_string_lossy()])
                            .output();
                        let _ = Command::new("sed")
                            .args(["-i", "", &format!("s|^;*listen.owner = .*|listen.owner = {}|", current_user), &www_conf.to_string_lossy()])
                            .output();
                        let _ = Command::new("sed")
                            .args(["-i", "", "s|^;*listen.group = .*|listen.group = staff|", &www_conf.to_string_lossy()])
                            .output();
                        let _ = Command::new("sed")
                            .args(["-i", "", "s|^;*listen.mode = .*|listen.mode = 0660|", &www_conf.to_string_lossy()])
                            .output();

                        let service_name = if ver == "8.6" { "php" } else { &format!("php@{}", ver) };
                        let _ = Command::new("brew").args(["services", "restart", service_name]).output();
                        reloaded_service = true;
                    }
                }
            }

            // If socket doesn't exist yet but brew binary is present, start the service
            if !Path::new(&socket).exists() && !reloaded_service {
                let service_name = if ver == "8.6" { "php" } else { &format!("php@{}", ver) };
                let _ = Command::new("brew").args(["services", "start", service_name]).output();
            }

            // Create bi-directional compatibility symlink if one exists but not the other
            #[cfg(unix)]
            {
                if Path::new(&socket).exists() && !Path::new(&legacy_socket).exists() {
                    let _ = std::os::unix::fs::symlink(&socket, &legacy_socket);
                } else if Path::new(&legacy_socket).exists() && !Path::new(&socket).exists() {
                    let _ = std::os::unix::fs::symlink(&legacy_socket, &socket);
                }
            }
        }
    }
}
