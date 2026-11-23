use std::path::Path;
use std::process::{Command, Output};

pub struct PrivilegeManager;

impl PrivilegeManager {
    pub const SUDOERS_FILE: &'static str = "/private/etc/sudoers.d/spark";

    /// Test if sudo can run without an interactive password prompt
    pub fn can_run_sudo_without_password() -> bool {
        Command::new("sudo")
            .args(["-n", "true"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    /// Check if the Spark sudoers entry exists and is functional
    pub fn is_passwordless_sudo_configured() -> bool {
        Path::new(Self::SUDOERS_FILE).exists() && Self::can_run_sudo_without_password()
    }

    /// Execute a command with root privileges.
    /// Uses passwordless sudo if available (0 GUI prompts),
    /// otherwise falls back to a single osascript administrator dialog.
    pub fn run_privileged(command: &str) -> Result<Output, String> {
        if Self::can_run_sudo_without_password() {
            let output = Command::new("sudo")
                .args(["-n", "/bin/sh", "-c", command])
                .output()
                .map_err(|e| format!("Failed to run sudo command: {}", e))?;

            if output.status.success() {
                return Ok(output);
            }
        }

        let escaped = command.replace('\\', "\\\\").replace('"', "\\\"");
        let script = format!("do shell script \"{}\" with administrator privileges", escaped);

        let output = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| format!("Failed to execute osascript: {}", e))?;

        if output.status.success() {
            Ok(output)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Authorization failed: {}", stderr.trim()))
        }
    }

    /// Prompts the user ONCE with the macOS administrator dialog to configure
    /// passwordless sudo for Spark operations.
    pub fn enable_passwordless_sudo() -> Result<String, String> {
        if Self::is_passwordless_sudo_configured() {
            return Ok("Passwordless administration is already active.".to_string());
        }

        let user = std::env::var("USER").unwrap_or_else(|_| "ruhulamin".to_string());
        let sudoers_rule = format!("{} ALL=(ALL) NOPASSWD: ALL", user);
        let cmd = format!(
            "mkdir -p /private/etc/sudoers.d && echo '{}' > {} && chmod 0440 {}",
            sudoers_rule,
            Self::SUDOERS_FILE,
            Self::SUDOERS_FILE
        );

        Self::run_privileged(&cmd)?;

        if Self::can_run_sudo_without_password() {
            Ok("Passwordless administrator access enabled successfully. You will not be asked for passwords again.".to_string())
        } else {
            Err("Failed to verify passwordless sudo after setup.".to_string())
        }
    }

    /// Revoke the passwordless sudo entry
    pub fn disable_passwordless_sudo() -> Result<String, String> {
        let cmd = format!("rm -f {}", Self::SUDOERS_FILE);
        Self::run_privileged(&cmd)?;
        Ok("Passwordless administrator access has been revoked.".to_string())
    }
}
