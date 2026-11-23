use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub struct DnsResolverManager;

impl DnsResolverManager {
    pub const RESOLVER_FILE: &'static str = "/etc/resolver/test";

    pub fn homebrew_prefix() -> &'static str {
        if Path::new("/opt/homebrew/bin/brew").exists() || Path::new("/opt/homebrew/etc").exists() {
            "/opt/homebrew"
        } else if Path::new("/usr/local/bin/brew").exists() || Path::new("/usr/local/etc/nginx").exists() {
            "/usr/local"
        } else {
            "/opt/homebrew"
        }
    }

    pub fn is_resolver_configured() -> bool {
        if let Ok(content) = fs::read_to_string(Self::RESOLVER_FILE) {
            content.contains("127.0.0.1")
        } else {
            false
        }
    }

    pub fn configure_resolver() -> Result<String, String> {
        if Self::is_resolver_configured() {
            return Ok("Local /etc/resolver/test is already configured".to_string());
        }

        let cmd = "mkdir -p /etc/resolver && echo 'nameserver 127.0.0.1' > /etc/resolver/test && dscacheutil -flushcache && killall -HUP mDNSResponder";
        crate::privilege::PrivilegeManager::run_privileged(cmd)?;
        Ok("Local /etc/resolver/test configured successfully".to_string())
    }

    pub fn is_dnsmasq_configured() -> bool {
        let prefix = Self::homebrew_prefix();
        let spark_conf = PathBuf::from(format!("{}/etc/dnsmasq.d/spark.conf", prefix));
        let main_conf = PathBuf::from(format!("{}/etc/dnsmasq.conf", prefix));
        let conf_dir_line = format!("conf-dir={}/etc/dnsmasq.d/,*.conf", prefix);

        let has_spark_conf = fs::read_to_string(&spark_conf)
            .map(|c| c.contains("address=/test/127.0.0.1"))
            .unwrap_or(false);

        let has_conf_dir = fs::read_to_string(&main_conf)
            .map(|c| c.lines().any(|l| {
                let t = l.trim();
                !t.starts_with('#') && (t == conf_dir_line || t.starts_with(&format!("conf-dir={}/etc/dnsmasq.d", prefix)))
            }))
            .unwrap_or(false);

        has_spark_conf && has_conf_dir
    }

    pub fn is_dnsmasq_running() -> bool {
        Command::new("pgrep")
            .args(["-x", "dnsmasq"])
            .output()
            .map(|o| o.status.success() && !o.stdout.is_empty())
            .unwrap_or(false)
    }

    /// Ensures dnsmasq.d/spark.conf exists, dnsmasq.conf loads dnsmasq.d/*.conf,
    /// and the dnsmasq daemon is running with root privileges (required for port 53).
    pub fn ensure_dnsmasq_configured_and_running() -> Result<String, String> {
        let prefix = Self::homebrew_prefix();
        let dnsmasq_bin = PathBuf::from(format!("{}/sbin/dnsmasq", prefix));
        if !dnsmasq_bin.exists() {
            return Err("Dnsmasq is not installed".to_string());
        }

        let dnsmasq_conf_dir = PathBuf::from(format!("{}/etc/dnsmasq.d", prefix));
        let _ = fs::create_dir_all(&dnsmasq_conf_dir);

        let spark_conf = dnsmasq_conf_dir.join("spark.conf");
        let expected_spark_conf = "address=/test/127.0.0.1\nlisten-address=127.0.0.1\n";
        let mut config_changed = false;

        let current_spark_conf = fs::read_to_string(&spark_conf).unwrap_or_default();
        if current_spark_conf != expected_spark_conf {
            fs::write(&spark_conf, expected_spark_conf)
                .map_err(|e| format!("Failed to write {}: {}", spark_conf.display(), e))?;
            config_changed = true;
        }

        let main_conf = PathBuf::from(format!("{}/etc/dnsmasq.conf", prefix));
        let conf_dir_directive = format!("conf-dir={}/etc/dnsmasq.d/,*.conf", prefix);
        let commented_directive = format!("#{}", conf_dir_directive);

        if main_conf.exists() {
            let content = fs::read_to_string(&main_conf).unwrap_or_default();
            let already_enabled = content.lines().any(|l| {
                let t = l.trim();
                !t.starts_with('#') && t.starts_with(&format!("conf-dir={}/etc/dnsmasq.d", prefix))
            });

            if !already_enabled {
                let updated = if content.contains(&commented_directive) {
                    content.replacen(&commented_directive, &conf_dir_directive, 1)
                } else {
                    format!("{}\n{}\n", content.trim_end(), conf_dir_directive)
                };
                fs::write(&main_conf, updated)
                    .map_err(|e| format!("Failed to update {}: {}", main_conf.display(), e))?;
                config_changed = true;
            }
        } else {
            fs::write(&main_conf, format!("{}\n", conf_dir_directive))
                .map_err(|e| format!("Failed to write {}: {}", main_conf.display(), e))?;
            config_changed = true;
        }

        if config_changed || !Self::is_dnsmasq_running() {
            let brew_bin = format!("{}/bin/brew", prefix);
            let cmd = format!(
                "{brew} services restart dnsmasq || {sbin}",
                brew = brew_bin,
                sbin = dnsmasq_bin.display()
            );
            crate::privilege::PrivilegeManager::run_privileged(&cmd)?;
        }

        Ok("Dnsmasq configured and running".to_string())
    }
}
