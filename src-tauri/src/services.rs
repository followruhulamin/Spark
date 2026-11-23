use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use crate::models::{ServiceHealth, Site};
use crate::mysql_manager::MysqlManager;
use crate::ssl::SslManager;
use crate::dns::DnsResolverManager;

pub struct ServiceManager {
    nginx_conf_dir: PathBuf,
    ssl: SslManager,
    mysql: MysqlManager,
}

impl ServiceManager {
    pub fn new() -> Self {
        let app_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("/Users/ruhulamin/Library/Application Support"))
            .join("Spark");
        
        let nginx_conf_dir = app_dir.join("nginx");
        fs::create_dir_all(&nginx_conf_dir).ok();

        Self {
            nginx_conf_dir,
            ssl: SslManager::new(),
            mysql: MysqlManager::new(),
        }
    }

    pub fn get_service_health(&self) -> ServiceHealth {
        let nginx_status = if self.is_nginx_running() { "running" } else { "stopped" };
        let php_status = if self.is_php_fpm_running() { "running" } else { "stopped" };
        let mysql_status = if self.mysql.check_is_running() { "running" } else { "stopped" };
        let dns_status = if DnsResolverManager::is_resolver_configured() { "running" } else { "stopped" };

        ServiceHealth {
            nginx: nginx_status.to_string(),
            php: php_status.to_string(),
            mysql: mysql_status.to_string(),
            dns: dns_status.to_string(),
        }
    }

    pub fn is_nginx_running(&self) -> bool {
        let lsof = Command::new("lsof")
            .args(["-i", ":80", "-sTCP:LISTEN"])
            .output();

        if let Ok(output) = lsof {
            if output.status.success() && !output.stdout.is_empty() {
                return true;
            }
        }

        let pgrep = Command::new("pgrep").args(["-f", "nginx"]).output();
        if let Ok(output) = pgrep {
            return output.status.success() && !output.stdout.is_empty();
        }

        false
    }

    pub fn is_php_fpm_running(&self) -> bool {
        let pgrep = Command::new("pgrep").args(["-f", "php.*fpm"]).output();
        if let Ok(output) = pgrep {
            return output.status.success() && !output.stdout.is_empty();
        }
        false
    }

    pub fn sync_vhosts(&self, sites: &[Site], default_php: Option<&str>) -> Result<(), String> {
        // Clean up orphaned .conf files from previously deleted sites
        let active_configs: std::collections::HashSet<String> = sites
            .iter()
            .map(|s| format!("{}.conf", s.domain))
            .collect();

        if let Ok(entries) = fs::read_dir(&self.nginx_conf_dir) {
            for entry in entries.flatten() {
                if let Ok(name) = entry.file_name().into_string() {
                    if name.ends_with(".conf") && !active_configs.contains(&name) {
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
        }

        for site in sites {
            self.generate_vhost_config(site, default_php)?;
        }
        self.reload_nginx();
        Ok(())
    }

    pub fn generate_vhost_config(&self, site: &Site, default_php: Option<&str>) -> Result<PathBuf, String> {
        let domain = &site.domain;
        let site_path = Path::new(&site.path);
        
        // Auto-detect root directory: prefer public/ if exists
        let root_dir = if site_path.join("public").exists() {
            site_path.join("public")
        } else {
            site_path.to_path_buf()
        };

        let root_str = root_dir.to_string_lossy();
        let cert_path = self.ssl.site_cert_path(domain);
        let key_path = self.ssl.site_key_path(domain);

        // Auto-generate certificate if site is marked secured but cert is missing
        if site.secured && (!cert_path.exists() || !key_path.exists()) {
            let _ = self.ssl.generate_site_certificate(domain);
        }

        let php_ver_str = if site.php_version == "default" {
            default_php.unwrap_or("8.4")
        } else {
            &site.php_version
        };
        let php_version = php_ver_str.replace('.', "");
        let fpm_socket = format!("/tmp/spark-php{}.sock", php_version);
        let legacy_socket = format!("/tmp/localdev-php{}.sock", php_version);

        #[cfg(unix)]
        if !Path::new(&fpm_socket).exists() && Path::new(&legacy_socket).exists() {
            let _ = std::os::unix::fs::symlink(&legacy_socket, &fpm_socket);
        }

        let conf_content = if site.secured && cert_path.exists() && key_path.exists() {
            format!(
                r#"# Spark virtual host configuration for {domain} (HTTPS Forced)
server {{
    listen 80;
    server_name {domain} *.{domain};
    return 301 https://$host$request_uri;
}}

server {{
    listen 443 ssl;
    http2 on;
    server_name {domain} *.{domain};
    root "{root_str}";

    ssl_certificate "{cert_path_str}";
    ssl_certificate_key "{key_path_str}";
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    index index.php index.html index.htm;
    charset utf-8;

    location / {{
        try_files $uri $uri/ /index.php?$query_string;
    }}

    location = /favicon.ico {{ access_log off; log_not_found off; }}
    location = /robots.txt  {{ access_log off; log_not_found off; }}

    error_page 404 /index.php;

    location ~ \.php$ {{
        fastcgi_pass unix:{fpm_socket};
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }}

    location ~ /\.(?!well-known).* {{
        deny all;
    }}
}}
"#,
                domain = domain,
                root_str = root_str,
                cert_path_str = cert_path.display(),
                key_path_str = key_path.display(),
                fpm_socket = fpm_socket
            )
        } else {
            format!(
                r#"# Spark virtual host configuration for {domain} (HTTP)
server {{
    listen 80;
    server_name {domain} *.{domain};
    root "{root_str}";

    index index.php index.html index.htm;
    charset utf-8;

    location / {{
        try_files $uri $uri/ /index.php?$query_string;
    }}

    location = /favicon.ico {{ access_log off; log_not_found off; }}
    location = /robots.txt  {{ access_log off; log_not_found off; }}

    error_page 404 /index.php;

    location ~ \.php$ {{
        fastcgi_pass unix:{fpm_socket};
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }}

    location ~ /\.(?!well-known).* {{
        deny all;
    }}
}}
"#,
                domain = domain,
                root_str = root_str,
                fpm_socket = fpm_socket
            )
        };

        let conf_file = self.nginx_conf_dir.join(format!("{}.conf", domain));
        fs::write(&conf_file, conf_content)
            .map_err(|e| format!("Failed to write vhost config: {}", e))?;

        Ok(conf_file)
    }

    pub fn remove_vhost_config(&self, domain: &str) {
        let conf_file = self.nginx_conf_dir.join(format!("{}.conf", domain));
        let _ = fs::remove_file(conf_file);
    }

    pub fn ensure_nginx_running(&self) {
        crate::php_manager::PhpManager::ensure_all_fpm_configured_and_running();
        if !self.is_nginx_running() {
            let nginx_bin = if Path::new("/opt/homebrew/bin/nginx").exists() {
                "/opt/homebrew/bin/nginx"
            } else if Path::new("/usr/local/bin/nginx").exists() {
                "/usr/local/bin/nginx"
            } else {
                "nginx"
            };
            let _ = Command::new(nginx_bin).output();
            let _ = Command::new("brew").args(["services", "start", "nginx"]).output();
        }
    }

    pub fn reload_nginx(&self) {
        if !self.is_nginx_running() {
            self.ensure_nginx_running();
            return;
        }
        let _ = Command::new("nginx").args(["-s", "reload"]).output();
        let _ = Command::new("killall").args(["-HUP", "nginx-arm64"]).output();
    }

    pub fn start_all(&self) -> Result<String, String> {
        let _ = self.mysql.start();
        crate::php_manager::PhpManager::ensure_all_fpm_configured_and_running();
        self.ensure_nginx_running();
        Ok("All background services started".to_string())
    }

    pub fn stop_all(&self) -> Result<String, String> {
        let _ = self.mysql.stop();
        let _ = Command::new("nginx").args(["-s", "stop"]).output();
        let _ = Command::new("brew").args(["services", "stop", "nginx"]).output();
        Ok("Background services stopped".to_string())
    }

    pub fn restart_all(&self) -> Result<String, String> {
        let _ = self.mysql.restart();
        crate::php_manager::PhpManager::ensure_all_fpm_configured_and_running();
        let _ = Command::new("killall").args(["-USR2", "php-fpm"]).output();
        if self.is_nginx_running() {
            let _ = Command::new("nginx").args(["-s", "reload"]).output();
        } else {
            self.ensure_nginx_running();
        }
        let _ = Command::new("brew").args(["services", "restart", "nginx"]).output();
        Ok("All background services restarted".to_string())
    }
}
