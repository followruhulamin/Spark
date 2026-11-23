use std::fs;
use std::path::PathBuf;
use std::process::Command;
use crate::models::{NodeVersionInfo, PackageManagersState};

pub struct NodeManager;

impl NodeManager {
    fn get_version_of_binary(bin_path: &str) -> Option<String> {
        let output = Command::new(bin_path).arg("-v").output().ok()?;
        if output.status.success() {
            let out = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !out.is_empty() {
                return Some(out);
            }
        }
        None
    }

    pub fn get_available_versions() -> Vec<NodeVersionInfo> {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let herd_nvm = home.join("Library/Application Support/Herd/config/nvm/versions/node");
        let nvm_default = home.join(".nvm/versions/node");
        let brew_opt = PathBuf::from("/opt/homebrew/opt");

        let active_node = Self::get_active_node_version();
        let mut versions = Vec::new();

        // 1. Scan system node (e.g. /usr/local/bin/node or /opt/homebrew/bin/node)
        if let Ok(output) = Command::new("which").arg("node").output() {
            if output.status.success() {
                let bin_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !bin_str.is_empty() && PathBuf::from(&bin_str).exists() {
                    let full_ver = Self::get_version_of_binary(&bin_str).unwrap_or_else(|| active_node.clone());
                    let major_prefix = full_ver.split('.').next().unwrap_or("v22").to_string();
                    let label = if major_prefix == "v24" {
                        "v24.x (Current)".to_string()
                    } else {
                        format!("{}.x LTS", major_prefix)
                    };
                    versions.push(NodeVersionInfo {
                        version: label,
                        full_version: full_ver,
                        binary_path: bin_str,
                        is_installed: true,
                        is_active: true,
                    });
                }
            }
        }

        // 2. Scan Homebrew versions: node@24, node@22, node@20, node@18, node
        for ver_num in &["24", "22", "20", "18"] {
            let brew_node = brew_opt.join(format!("node@{}", ver_num)).join("bin/node");
            if brew_node.exists() {
                let bin_str = brew_node.to_string_lossy().to_string();
                let full_ver = Self::get_version_of_binary(&bin_str)
                    .unwrap_or_else(|| format!("v{}.0.0", ver_num));
                let major_prefix = format!("v{}", ver_num);
                let label = if *ver_num == "24" {
                    "v24.x (Current)".to_string()
                } else {
                    format!("v{}.x LTS", ver_num)
                };

                if let Some(existing) = versions.iter_mut().find(|v| v.version.starts_with(&major_prefix)) {
                    if existing.binary_path.is_empty() {
                        existing.binary_path = bin_str;
                        existing.full_version = full_ver;
                        existing.is_installed = true;
                    }
                } else {
                    let is_active = active_node.starts_with(&major_prefix);
                    versions.push(NodeVersionInfo {
                        version: label,
                        full_version: full_ver,
                        binary_path: bin_str,
                        is_installed: true,
                        is_active,
                    });
                }
            }
        }

        // 3. Scan Herd NVM
        if let Ok(entries) = fs::read_dir(&herd_nvm) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let folder_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let bin_path = path.join("bin/node");
                    if bin_path.exists() {
                        let major_prefix = folder_name.split('.').next().unwrap_or("v22");
                        let label = if major_prefix == "v24" {
                            "v24.x (Current)".to_string()
                        } else {
                            format!("{}.x LTS", major_prefix)
                        };
                        let is_active = active_node.starts_with(major_prefix);
                        if let Some(existing) = versions.iter_mut().find(|v| v.version.starts_with(major_prefix)) {
                            if !existing.is_installed {
                                existing.binary_path = bin_path.to_string_lossy().to_string();
                                existing.full_version = folder_name;
                                existing.is_installed = true;
                            }
                        } else {
                            versions.push(NodeVersionInfo {
                                version: label,
                                full_version: folder_name,
                                binary_path: bin_path.to_string_lossy().to_string(),
                                is_installed: true,
                                is_active,
                            });
                        }
                    }
                }
            }
        }

        // 4. Scan standard NVM if present
        if let Ok(entries) = fs::read_dir(&nvm_default) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let folder_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let bin_path = path.join("bin/node");
                    if bin_path.exists() {
                        let major_prefix = folder_name.split('.').next().unwrap_or("v22");
                        let label = if major_prefix == "v24" {
                            "v24.x (Current)".to_string()
                        } else {
                            format!("{}.x LTS", major_prefix)
                        };
                        let is_active = active_node.starts_with(major_prefix);
                        if let Some(existing) = versions.iter_mut().find(|v| v.version.starts_with(major_prefix)) {
                            if !existing.is_installed {
                                existing.binary_path = bin_path.to_string_lossy().to_string();
                                existing.full_version = folder_name;
                                existing.is_installed = true;
                            }
                        } else {
                            versions.push(NodeVersionInfo {
                                version: label,
                                full_version: folder_name,
                                binary_path: bin_path.to_string_lossy().to_string(),
                                is_installed: true,
                                is_active,
                            });
                        }
                    }
                }
            }
        }

        // 5. Add available common targets if not present
        let common_targets = [
            ("v24.x (Current)", "v24"),
            ("v22.x LTS", "v22"),
            ("v20.x LTS", "v20"),
            ("v18.x LTS", "v18"),
        ];
        for (label, prefix) in common_targets {
            if !versions.iter().any(|v| v.version.starts_with(prefix)) {
                versions.push(NodeVersionInfo {
                    version: label.to_string(),
                    full_version: format!("{}.0.0", prefix),
                    binary_path: String::new(),
                    is_installed: false,
                    is_active: false,
                });
            }
        }

        // Ensure at least one installed version is marked active if active_node matches
        let has_active = versions.iter().any(|v| v.is_active);
        if !has_active {
            if let Some(matching) = versions.iter_mut().find(|v| active_node.starts_with(&v.version[..3])) {
                matching.is_active = true;
            } else if let Some(first_installed) = versions.iter_mut().find(|v| v.is_installed) {
                first_installed.is_active = true;
            }
        }

        // Sort descending: v24, v22, v20, v18
        versions.sort_by(|a, b| b.version.cmp(&a.version));
        versions
    }

    pub fn get_active_node_version() -> String {
        if let Ok(output) = Command::new("node").arg("-v").output() {
            let out = String::from_utf8_lossy(&output.stdout);
            return out.trim().to_string();
        }
        "v22.23.5".to_string()
    }

    pub fn get_package_managers_state() -> PackageManagersState {
        let npm = Command::new("which").arg("npm").output().map(|o| o.status.success()).unwrap_or(false);
        let pnpm = Command::new("which").arg("pnpm").output().map(|o| o.status.success()).unwrap_or(false);
        let yarn = Command::new("which").arg("yarn").output().map(|o| o.status.success()).unwrap_or(false);

        PackageManagersState { npm, pnpm, yarn }
    }

    pub fn toggle_package_manager(manager: &str, enable: bool) -> Result<String, String> {
        let action = if enable { "enable" } else { "disable" };
        
        let output = Command::new("corepack")
            .args([action, manager])
            .output();

        match output {
            Ok(out) if out.status.success() => {
                Ok(format!("{} has been {}d", manager, action))
            }
            Ok(out) => {
                let err = String::from_utf8_lossy(&out.stderr);
                if enable {
                    let npm_install = Command::new("npm")
                        .args(["install", "-g", manager])
                        .output();
                    if let Ok(res) = npm_install {
                        if res.status.success() {
                            return Ok(format!("{} installed globally via npm", manager));
                        }
                    }
                }
                Err(format!("Could not toggle {}: {}", manager, err))
            }
            Err(e) => Err(format!("Failed to execute corepack: {}", e)),
        }
    }

    pub fn set_active_version(version: &str) -> Result<String, String> {
        let ver_num = if version.contains("24") {
            "24"
        } else if version.contains("22") {
            "22"
        } else if version.contains("20") {
            "20"
        } else if version.contains("18") {
            "18"
        } else {
            "22"
        };

        // Link brew version if installed
        let _ = Command::new("brew").args(["unlink", "node"]).output();
        for v in &["24", "22", "20", "18"] {
            let _ = Command::new("brew").args(["unlink", &format!("node@{}", v)]).output();
        }
        let _ = Command::new("brew").args(["link", "--overwrite", "--force", &format!("node@{}", ver_num)]).output();

        Ok(format!("Active Node.js switched to v{}", ver_num))
    }

    pub fn install_version(version: &str) -> Result<String, String> {
        let ver_num = if version.contains("24") {
            "24"
        } else if version.contains("22") {
            "22"
        } else if version.contains("20") {
            "20"
        } else if version.contains("18") {
            "18"
        } else {
            "22"
        };

        let output = Command::new("brew")
            .args(["install", &format!("node@{}", ver_num)])
            .output()
            .map_err(|e| format!("Failed to run brew install: {}", e))?;
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Installation failed: {}", err));
        }
        Ok(format!("Node.js v{} installed successfully", ver_num))
    }

    pub fn uninstall_version(version: &str) -> Result<String, String> {
        let ver_num = if version.contains("24") {
            "24"
        } else if version.contains("22") {
            "22"
        } else if version.contains("20") {
            "20"
        } else if version.contains("18") {
            "18"
        } else {
            "22"
        };

        // Brew unlink & uninstall
        let _ = Command::new("brew").args(["unlink", &format!("node@{}", ver_num)]).output();
        let _ = Command::new("brew").args(["uninstall", "--force", &format!("node@{}", ver_num)]).output();

        // Remove from NVM directories if present
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let herd_nvm = home.join("Library/Application Support/Herd/config/nvm/versions/node");
        let nvm_default = home.join(".nvm/versions/node");
        for nvm_dir in [&herd_nvm, &nvm_default] {
            if let Ok(entries) = fs::read_dir(nvm_dir) {
                for entry in entries.flatten() {
                    if let Ok(name) = entry.file_name().into_string() {
                        if name.starts_with(&format!("v{}.", ver_num)) || name == format!("v{}", ver_num) {
                            let _ = fs::remove_dir_all(entry.path());
                        }
                    }
                }
            }
        }

        let brew_opt = PathBuf::from(format!("/opt/homebrew/opt/node@{}", ver_num));
        let _ = fs::remove_dir_all(brew_opt);

        Ok(format!("Node.js v{} uninstalled successfully", ver_num))
    }
}
