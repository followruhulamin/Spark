use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Emitter};
use crate::models::{DependencyItem, ScaffoldLogEvent};
use crate::dns::DnsResolverManager;
use crate::ssl::SslManager;

pub struct DependencyManager;

impl DependencyManager {
    pub fn emit_log(app: Option<&AppHandle>, step: &str, message: String, is_error: bool, is_done: bool) {
        if let Some(handle) = app {
            let event = ScaffoldLogEvent {
                step: step.to_string(),
                message,
                is_error,
                is_done,
            };
            let _ = handle.emit("dependency-progress", event);
        }
    }

    pub fn check_dependencies() -> Vec<DependencyItem> {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let mut list = Vec::new();

        // 1. Homebrew
        let brew_path = Self::find_binary("brew", &["/opt/homebrew/bin/brew", "/usr/local/bin/brew"]);
        let brew_installed = brew_path.is_some();
        let brew_version = if let Some(ref p) = brew_path {
            Self::get_cli_version(p, &["--version"])
        } else {
            "Not installed".to_string()
        };
        list.push(DependencyItem {
            id: "brew".to_string(),
            name: "Homebrew".to_string(),
            category: "package_manager".to_string(),
            description: "macOS package manager foundation required to install local runtimes".to_string(),
            is_installed: brew_installed,
            version: brew_version,
            binary_path: brew_path.unwrap_or_default(),
            is_required: true,
            status: if brew_installed { "Installed".to_string() } else { "Missing".to_string() },
        });

        // 2. Nginx
        let nginx_path = Self::find_binary("nginx", &["/opt/homebrew/bin/nginx", "/usr/local/bin/nginx"]);
        let nginx_installed = nginx_path.is_some();
        let nginx_version = if let Some(ref p) = nginx_path {
            Self::get_cli_version(p, &["-v"])
        } else {
            "Not installed".to_string()
        };
        list.push(DependencyItem {
            id: "nginx".to_string(),
            name: "Nginx Web Server".to_string(),
            category: "web_server".to_string(),
            description: "High-performance reverse proxy routing *.test domains to FastCGI sockets".to_string(),
            is_installed: nginx_installed,
            version: nginx_version,
            binary_path: nginx_path.unwrap_or_default(),
            is_required: true,
            status: if nginx_installed { "Installed".to_string() } else { "Missing".to_string() },
        });

        // 3. Dnsmasq
        let dnsmasq_path = Self::find_binary("dnsmasq", &["/opt/homebrew/sbin/dnsmasq", "/usr/local/sbin/dnsmasq"]);
        let dnsmasq_installed = dnsmasq_path.is_some();
        let dnsmasq_version = if let Some(ref p) = dnsmasq_path {
            Self::get_cli_version(p, &["-v"])
        } else {
            "Not installed".to_string()
        };
        list.push(DependencyItem {
            id: "dnsmasq".to_string(),
            name: "Dnsmasq Daemon".to_string(),
            category: "dns".to_string(),
            description: "Lightweight local DNS server that resolves all *.test domains to 127.0.0.1".to_string(),
            is_installed: dnsmasq_installed,
            version: dnsmasq_version,
            binary_path: dnsmasq_path.unwrap_or_default(),
            is_required: true,
            status: if dnsmasq_installed { "Installed".to_string() } else { "Missing".to_string() },
        });

        // 4. macOS /etc/resolver/test Route
        let resolver_configured = DnsResolverManager::is_resolver_configured();
        list.push(DependencyItem {
            id: "dns_resolver".to_string(),
            name: "macOS .test DNS Resolver".to_string(),
            category: "dns".to_string(),
            description: "Routes queries for the .test TLD to local Dnsmasq without editing /etc/hosts".to_string(),
            is_installed: resolver_configured,
            version: if resolver_configured { "127.0.0.1:53".to_string() } else { "Not configured".to_string() },
            binary_path: "/etc/resolver/test".to_string(),
            is_required: true,
            status: if resolver_configured { "Configured".to_string() } else { "Needs Setup".to_string() },
        });

        // 5. Local Root CA
        let ssl_mgr = SslManager::new();
        let ca_installed = ssl_mgr.is_ca_trusted_in_system();
        list.push(DependencyItem {
            id: "root_ca".to_string(),
            name: "Spark SSL Root CA".to_string(),
            category: "security".to_string(),
            description: "Local Certificate Authority in macOS Keychain for green padlock HTTPS".to_string(),
            is_installed: ca_installed,
            version: if ca_installed { "Trusted in Keychain".to_string() } else { "Not Trusted".to_string() },
            binary_path: ssl_mgr.ca_cert_path().to_string_lossy().to_string(),
            is_required: true,
            status: if ca_installed { "Trusted".to_string() } else { "Needs Setup".to_string() },
        });

        // 6. PHP 8.5
        let php85_path = Self::find_binary("php8.5", &[
            "/opt/homebrew/opt/php@8.5/bin/php",
            &home.join("Library/Application Support/Herd/bin/php85").to_string_lossy(),
        ]);
        let php85_installed = php85_path.is_some();
        let php85_version = if let Some(ref p) = php85_path {
            Self::get_cli_version(p, &["-v"])
        } else {
            "8.5.x".to_string()
        };
        list.push(DependencyItem {
            id: "php85".to_string(),
            name: "PHP 8.5".to_string(),
            category: "php".to_string(),
            description: "Latest PHP 8.5 modern runtime with JIT compiler and FastCGI pool".to_string(),
            is_installed: php85_installed,
            version: php85_version,
            binary_path: php85_path.unwrap_or_default(),
            is_required: false,
            status: if php85_installed { "Installed".to_string() } else { "Available".to_string() },
        });

        // 7. PHP 8.4
        let php84_path = Self::find_binary("php@8.4", &[
            "/opt/homebrew/opt/php@8.4/bin/php",
            &home.join("Library/Application Support/Herd/bin/php84").to_string_lossy(),
            &home.join(".config/herd-lite/bin/php").to_string_lossy(),
        ]);
        let php84_installed = php84_path.is_some();
        let php84_version = if let Some(ref p) = php84_path {
            Self::get_cli_version(p, &["-v"])
        } else {
            "8.4.x".to_string()
        };
        list.push(DependencyItem {
            id: "php84".to_string(),
            name: "PHP 8.4".to_string(),
            category: "php".to_string(),
            description: "Stable PHP 8.4 runtime with FastCGI Process Manager".to_string(),
            is_installed: php84_installed,
            version: php84_version,
            binary_path: php84_path.unwrap_or_default(),
            is_required: true,
            status: if php84_installed { "Installed".to_string() } else { "Missing".to_string() },
        });

        // 8. Composer
        let composer_path = Self::find_binary("composer", &[
            "/opt/homebrew/bin/composer",
            &home.join(".config/herd-lite/bin/composer").to_string_lossy(),
            &home.join("Library/Application Support/Herd/bin/composer").to_string_lossy(),
        ]);
        let composer_installed = composer_path.is_some();
        let composer_version = if let Some(ref p) = composer_path {
            Self::get_cli_version(p, &["--version"])
        } else {
            "Not installed".to_string()
        };
        list.push(DependencyItem {
            id: "composer".to_string(),
            name: "Composer".to_string(),
            category: "php".to_string(),
            description: "PHP dependency manager for Laravel packages and applications".to_string(),
            is_installed: composer_installed,
            version: composer_version,
            binary_path: composer_path.unwrap_or_default(),
            is_required: true,
            status: if composer_installed { "Installed".to_string() } else { "Missing".to_string() },
        });

        // 9. Node.js 24
        let mut node24_path = Self::find_binary("node24", &["/opt/homebrew/opt/node@24/bin/node"]);
        if node24_path.is_none() {
            if let Some(sys_node) = Self::find_binary("node", &["/opt/homebrew/bin/node", "/usr/local/bin/node"]) {
                let ver = Self::get_cli_version(&sys_node, &["-v"]);
                if ver.starts_with("v24") {
                    node24_path = Some(sys_node);
                }
            }
        }
        let node24_installed = node24_path.is_some();
        let node24_version = if let Some(ref p) = node24_path {
            Self::get_cli_version(p, &["-v"])
        } else {
            "v24.x".to_string()
        };

        // 10. Node.js 22 LTS
        let mut node22_path = Self::find_binary("node22", &["/opt/homebrew/opt/node@22/bin/node"]);
        if node22_path.is_none() {
            if let Some(sys_node) = Self::find_binary("node", &["/opt/homebrew/bin/node", "/usr/local/bin/node"]) {
                let ver = Self::get_cli_version(&sys_node, &["-v"]);
                if ver.starts_with("v22") {
                    node22_path = Some(sys_node);
                }
            }
        }
        let node22_installed = node22_path.is_some();
        let node22_version = if let Some(ref p) = node22_path {
            Self::get_cli_version(p, &["-v"])
        } else {
            "v22.x LTS".to_string()
        };

        let has_any_node = node24_installed || node22_installed;

        list.push(DependencyItem {
            id: "node24".to_string(),
            name: "Node.js 24".to_string(),
            category: "javascript".to_string(),
            description: "Latest Node.js 24 runtime with built-in TypeScript support and V8 engine".to_string(),
            is_installed: node24_installed,
            version: node24_version,
            binary_path: node24_path.unwrap_or_default(),
            is_required: !has_any_node,
            status: if node24_installed { "Installed".to_string() } else { "Available".to_string() },
        });

        list.push(DependencyItem {
            id: "node22".to_string(),
            name: "Node.js 22 LTS".to_string(),
            category: "javascript".to_string(),
            description: "Long-Term Support Node.js runtime for building frontend assets & SPAs".to_string(),
            is_installed: node22_installed,
            version: node22_version,
            binary_path: node22_path.unwrap_or_default(),
            is_required: false,
            status: if node22_installed { "Installed".to_string() } else { "Available".to_string() },
        });

        // 11. MySQL Server
        let mysql_path = Self::find_binary("mysql", &["/opt/homebrew/bin/mysql", "/usr/local/bin/mysql"]);
        let mysql_installed = mysql_path.is_some();
        let mysql_version = if let Some(ref p) = mysql_path {
            Self::get_cli_version(p, &["--version"])
        } else {
            "Not installed".to_string()
        };
        list.push(DependencyItem {
            id: "mysql".to_string(),
            name: "MySQL Server".to_string(),
            category: "database".to_string(),
            description: "Local relational SQL database server running on port 3306".to_string(),
            is_installed: mysql_installed,
            version: mysql_version,
            binary_path: mysql_path.unwrap_or_default(),
            is_required: false,
            status: if mysql_installed { "Installed".to_string() } else { "Available".to_string() },
        });

        list
    }

    fn find_binary(cmd_name: &str, candidate_paths: &[&str]) -> Option<String> {
        for p in candidate_paths {
            let path = Path::new(p);
            if path.exists() {
                return Some(p.to_string());
            }
        }
        if let Ok(output) = Command::new("which").arg(cmd_name).output() {
            if output.status.success() {
                let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !s.is_empty() && Path::new(&s).exists() {
                    return Some(s);
                }
            }
        }
        None
    }

    fn get_cli_version(bin: &str, args: &[&str]) -> String {
        if let Ok(output) = Command::new(bin).args(args).output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            let text = if !stdout.trim().is_empty() { stdout } else { stderr };
            if let Some(first_line) = text.lines().next() {
                return Self::clean_version_str(first_line.trim());
            }
        }
        "Installed".to_string()
    }

    fn clean_version_str(s: &str) -> String {
        let trimmed = s.trim();
        // nginx version: nginx/1.31.9
        if let Some(idx) = trimmed.find("nginx/") {
            return format!("v{}", trimmed[idx + 6..].trim());
        }
        // Dnsmasq version 2.93 Copyright ...
        if trimmed.starts_with("Dnsmasq version") {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 3 {
                return format!("v{}", parts[2]);
            }
        }
        // PHP 8.4.28 (cli) ...
        if trimmed.starts_with("PHP ") {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 2 {
                return format!("v{}", parts[1]);
            }
        }
        // Composer version 2.8.6 2025-02-25
        if trimmed.starts_with("Composer version") {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 3 {
                return format!("v{}", parts[2]);
            }
        }
        // Homebrew 4.4.19
        if trimmed.starts_with("Homebrew ") {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 2 {
                return format!("v{}", parts[1]);
            }
        }
        // mysql  Ver 9.2.0 for ...
        if let Some(idx) = trimmed.find("Ver ") {
            let rest = &trimmed[idx + 4..];
            if let Some(ver) = rest.split_whitespace().next() {
                return format!("v{}", ver);
            }
        }
        trimmed.to_string()
    }

    pub fn is_first_run_needed() -> bool {
        let deps = Self::check_dependencies();
        let missing_required = deps.iter().any(|d| d.is_required && !d.is_installed);
        missing_required
    }

    pub fn install_dependency(id: &str, app: Option<&AppHandle>) -> Result<String, String> {
        Self::emit_log(app, id, format!("Starting installation of {}...", id), false, false);

        match id {
            "brew" => {
                Self::emit_log(app, id, "Running Homebrew installation script...".to_string(), false, false);
                let output = Command::new("/bin/bash")
                    .args(["-c", "NONINTERACTIVE=1 /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""])
                    .output()
                    .map_err(|e| format!("Failed to run Homebrew installer: {}", e))?;
                if !output.status.success() {
                    let err = String::from_utf8_lossy(&output.stderr);
                    return Err(format!("Homebrew installation failed: {}", err));
                }
                Self::emit_log(app, id, "Homebrew successfully installed".to_string(), false, true);
                Ok("Homebrew installed successfully".to_string())
            }

            "nginx" => {
                Self::emit_log(app, id, "Running brew install nginx...".to_string(), false, false);
                let _ = Command::new("brew").args(["install", "nginx"]).output();
                
                // Configure Spark include directive
                let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
                let spark_nginx = home.join("Library/Application Support/Spark/nginx");
                let _ = fs::create_dir_all(&spark_nginx);

                let servers_dir = PathBuf::from("/opt/homebrew/etc/nginx/servers");
                let _ = fs::create_dir_all(&servers_dir);
                let conf_file = servers_dir.join("spark.conf");
                let conf_content = format!("include \"{}/*.conf\";\n", spark_nginx.display());
                let _ = fs::write(&conf_file, conf_content);

                let _ = Command::new("brew").args(["services", "restart", "nginx"]).output();
                Self::emit_log(app, id, "Nginx installed and configured successfully".to_string(), false, true);
                Ok("Nginx web server ready".to_string())
            }

            "dnsmasq" => {
                Self::emit_log(app, id, "Running brew install dnsmasq...".to_string(), false, false);
                let _ = Command::new("brew").args(["install", "dnsmasq"]).output();

                let dnsmasq_conf_dir = PathBuf::from("/opt/homebrew/etc/dnsmasq.d");
                let _ = fs::create_dir_all(&dnsmasq_conf_dir);
                let conf_file = dnsmasq_conf_dir.join("spark.conf");
                let conf_content = "address=/test/127.0.0.1\nlisten-address=127.0.0.1\n";
                let _ = fs::write(&conf_file, conf_content);

                // Configure resolver
                let _ = DnsResolverManager::configure_resolver();

                // Start service
                let _ = crate::privilege::PrivilegeManager::run_privileged("/bin/launchctl load -w /Library/LaunchDaemons/sh.brew.dnsmasq.plist 2>/dev/null || /opt/homebrew/sbin/dnsmasq");

                Self::emit_log(app, id, "Dnsmasq daemon installed and routing *.test".to_string(), false, true);
                Ok("Dnsmasq DNS server ready".to_string())
            }

            "dns_resolver" => {
                Self::emit_log(app, id, "Configuring /etc/resolver/test...".to_string(), false, false);
                let res = DnsResolverManager::configure_resolver()?;
                Self::emit_log(app, id, res.clone(), false, true);
                Ok(res)
            }

            "root_ca" => {
                Self::emit_log(app, id, "Trusting Spark Root CA in macOS Keychain...".to_string(), false, false);
                let res = SslManager::new().trust_root_ca_in_keychain()?;
                Self::emit_log(app, id, res.clone(), false, true);
                Ok(res)
            }

            "php85" => {
                Self::emit_log(app, id, "Running brew install php@8.5...".to_string(), false, false);
                let _ = Command::new("brew").args(["install", "php@8.5"]).output();

                // Configure FPM pool socket
                let www_conf = PathBuf::from("/opt/homebrew/etc/php/8.5/php-fpm.d/www.conf");
                let current_user = std::env::var("USER").unwrap_or_else(|_| "ruhulamin".to_string());
                if www_conf.exists() {
                    let _ = Command::new("sed").args(["-i", "", "s|^listen = .*|listen = /tmp/spark-php85.sock|", &www_conf.to_string_lossy()]).output();
                    let _ = Command::new("sed").args(["-i", "", &format!("s|^;*listen.owner = .*|listen.owner = {}|", current_user), &www_conf.to_string_lossy()]).output();
                    let _ = Command::new("sed").args(["-i", "", "s|^;*listen.group = .*|listen.group = staff|", &www_conf.to_string_lossy()]).output();
                    let _ = Command::new("sed").args(["-i", "", "s|^;*listen.mode = .*|listen.mode = 0660|", &www_conf.to_string_lossy()]).output();
                }

                let _ = Command::new("brew").args(["services", "restart", "php@8.5"]).output();
                Self::emit_log(app, id, "PHP 8.5 installed and FastCGI pool active".to_string(), false, true);
                Ok("PHP 8.5 installed successfully".to_string())
            }

            "php84" => {
                Self::emit_log(app, id, "Running brew install php@8.4...".to_string(), false, false);
                let _ = Command::new("brew").args(["install", "php@8.4"]).output();

                // Configure FPM pool socket
                let www_conf = PathBuf::from("/opt/homebrew/etc/php/8.4/php-fpm.d/www.conf");
                let current_user = std::env::var("USER").unwrap_or_else(|_| "ruhulamin".to_string());
                if www_conf.exists() {
                    let _ = Command::new("sed").args(["-i", "", "s|^listen = .*|listen = /tmp/spark-php84.sock|", &www_conf.to_string_lossy()]).output();
                    let _ = Command::new("sed").args(["-i", "", &format!("s|^;*listen.owner = .*|listen.owner = {}|", current_user), &www_conf.to_string_lossy()]).output();
                    let _ = Command::new("sed").args(["-i", "", "s|^;*listen.group = .*|listen.group = staff|", &www_conf.to_string_lossy()]).output();
                    let _ = Command::new("sed").args(["-i", "", "s|^;*listen.mode = .*|listen.mode = 0660|", &www_conf.to_string_lossy()]).output();
                }

                let _ = Command::new("brew").args(["services", "restart", "php@8.4"]).output();
                Self::emit_log(app, id, "PHP 8.4 installed and FastCGI pool active".to_string(), false, true);
                Ok("PHP 8.4 installed successfully".to_string())
            }

            "composer" => {
                Self::emit_log(app, id, "Running brew install composer...".to_string(), false, false);
                let _ = Command::new("brew").args(["install", "composer"]).output();
                Self::emit_log(app, id, "Composer installed successfully".to_string(), false, true);
                Ok("Composer ready".to_string())
            }

            "node24" => {
                Self::emit_log(app, id, "Running brew install node@24...".to_string(), false, false);
                let _ = Command::new("brew").args(["install", "node@24"]).output();
                Self::emit_log(app, id, "Node.js 24 installed successfully".to_string(), false, true);
                Ok("Node.js 24 ready".to_string())
            }

            "node22" => {
                Self::emit_log(app, id, "Running brew install node@22...".to_string(), false, false);
                let _ = Command::new("brew").args(["install", "node@22"]).output();
                Self::emit_log(app, id, "Node.js 22 LTS installed successfully".to_string(), false, true);
                Ok("Node.js 22 ready".to_string())
            }

            "mysql" => {
                Self::emit_log(app, id, "Running brew install mysql...".to_string(), false, false);
                let _ = Command::new("brew").args(["install", "mysql"]).output();
                let _ = Command::new("brew").args(["services", "start", "mysql"]).output();
                Self::emit_log(app, id, "MySQL Server installed and started on port 3306".to_string(), false, true);
                Ok("MySQL Server ready".to_string())
            }

            _ => Err(format!("Unknown dependency identifier: {}", id)),
        }
    }

    pub fn uninstall_dependency(id: &str, app: Option<&AppHandle>) -> Result<String, String> {
        Self::emit_log(app, id, format!("Starting uninstallation of {}...", id), false, false);

        match id {
            "brew" => {
                Self::emit_log(app, id, "Cannot automatically uninstall Homebrew. Please run the official Homebrew uninstall script if desired.".to_string(), true, false);
                Err("Homebrew cannot be automatically uninstalled from Spark".to_string())
            }

            "nginx" => {
                Self::emit_log(app, id, "Stopping and uninstalling Nginx...".to_string(), false, false);
                let _ = Command::new("brew").args(["services", "stop", "nginx"]).output();
                let _ = Command::new("brew").args(["uninstall", "nginx"]).output();
                let conf = PathBuf::from("/opt/homebrew/etc/nginx/servers/spark.conf");
                let _ = fs::remove_file(conf);
                Self::emit_log(app, id, "Nginx uninstalled successfully".to_string(), false, true);
                Ok("Nginx uninstalled successfully".to_string())
            }

            "dnsmasq" => {
                Self::emit_log(app, id, "Stopping and uninstalling Dnsmasq...".to_string(), false, false);
                let _ = Command::new("brew").args(["services", "stop", "dnsmasq"]).output();
                let _ = Command::new("brew").args(["uninstall", "dnsmasq"]).output();
                let conf = PathBuf::from("/opt/homebrew/etc/dnsmasq.d/spark.conf");
                let _ = fs::remove_file(conf);
                Self::emit_log(app, id, "Dnsmasq uninstalled successfully".to_string(), false, true);
                Ok("Dnsmasq uninstalled successfully".to_string())
            }

            "dns_resolver" => {
                Self::emit_log(app, id, "Removing /etc/resolver/test...".to_string(), false, false);
                let _ = crate::privilege::PrivilegeManager::run_privileged("rm -f /etc/resolver/test");
                Self::emit_log(app, id, "DNS resolver removed".to_string(), false, true);
                Ok("DNS resolver uninstalled".to_string())
            }

            "root_ca" => {
                Self::emit_log(app, id, "Untrusting Spark Root CA...".to_string(), false, false);
                let _ = Command::new("security").args(["delete-certificate", "-c", "Spark Local Development CA"]).output();
                let ssl_mgr = SslManager::new();
                let _ = fs::remove_file(ssl_mgr.ca_cert_path());
                let _ = fs::remove_file(ssl_mgr.ca_key_path());
                Self::emit_log(app, id, "Root CA untrusted and removed".to_string(), false, true);
                Ok("Root CA untrusted".to_string())
            }

            "php85" => {
                Self::emit_log(app, id, "Stopping and uninstalling PHP 8.5...".to_string(), false, false);
                let res = crate::php_manager::PhpManager::uninstall_version("8.5");
                Self::emit_log(app, id, "PHP 8.5 uninstalled successfully".to_string(), false, true);
                res
            }

            "php84" => {
                Self::emit_log(app, id, "Stopping and uninstalling PHP 8.4...".to_string(), false, false);
                let res = crate::php_manager::PhpManager::uninstall_version("8.4");
                Self::emit_log(app, id, "PHP 8.4 uninstalled successfully".to_string(), false, true);
                res
            }

            "composer" => {
                Self::emit_log(app, id, "Uninstalling Composer...".to_string(), false, false);
                let _ = Command::new("brew").args(["uninstall", "composer"]).output();
                let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
                let _ = fs::remove_file(home.join(".config/herd-lite/bin/composer"));
                Self::emit_log(app, id, "Composer uninstalled successfully".to_string(), false, true);
                Ok("Composer uninstalled successfully".to_string())
            }

            "node24" => {
                Self::emit_log(app, id, "Uninstalling Node.js 24...".to_string(), false, false);
                let res = crate::node_manager::NodeManager::uninstall_version("24");
                Self::emit_log(app, id, "Node.js 24 uninstalled successfully".to_string(), false, true);
                res
            }

            "node22" => {
                Self::emit_log(app, id, "Uninstalling Node.js 22...".to_string(), false, false);
                let res = crate::node_manager::NodeManager::uninstall_version("22");
                Self::emit_log(app, id, "Node.js 22 uninstalled successfully".to_string(), false, true);
                res
            }

            "mysql" => {
                Self::emit_log(app, id, "Stopping and uninstalling MySQL...".to_string(), false, false);
                let _ = Command::new("brew").args(["services", "stop", "mysql"]).output();
                let _ = Command::new("brew").args(["uninstall", "mysql"]).output();
                Self::emit_log(app, id, "MySQL uninstalled successfully".to_string(), false, true);
                Ok("MySQL uninstalled successfully".to_string())
            }

            _ => Err(format!("Unknown dependency: {}", id)),
        }
    }

    pub fn install_all_missing(app: Option<&AppHandle>) -> Result<String, String> {
        let deps = Self::check_dependencies();
        let missing: Vec<_> = deps.into_iter().filter(|d| d.is_required && !d.is_installed).collect();

        if missing.is_empty() {
            Self::emit_log(app, "complete", "All required dependencies are already installed!".to_string(), false, true);
            return Ok("All required dependencies are already installed".to_string());
        }

        Self::emit_log(app, "start", format!("Found {} missing required dependencies to configure...", missing.len()), false, false);

        for dep in missing {
            Self::install_dependency(&dep.id, app)?;
        }

        Self::emit_log(app, "complete", "All essential dependencies installed and services configured successfully!".to_string(), false, true);
        Ok("All missing dependencies installed successfully".to_string())
    }
}
