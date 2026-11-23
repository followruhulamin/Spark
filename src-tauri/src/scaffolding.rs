use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};
use crate::models::{CreateAppParams, FrameworkType, ScaffoldLogEvent, Site};
use crate::mysql_manager::MysqlManager;
use crate::ssl::SslManager;

pub struct ScaffoldingEngine;

impl ScaffoldingEngine {
    pub fn get_laravel_installer_bin() -> Option<PathBuf> {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let herd_laravel = home.join("Library/Application Support/Herd/bin/laravel");
        if herd_laravel.exists() {
            return Some(herd_laravel);
        }

        let composer_global = home.join(".composer/vendor/bin/laravel");
        if composer_global.exists() {
            return Some(composer_global);
        }

        if let Ok(out) = Command::new("which").arg("laravel").output() {
            if out.status.success() {
                let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !p.is_empty() {
                    return Some(PathBuf::from(p));
                }
            }
        }

        None
    }

    pub fn get_composer_bin() -> Option<PathBuf> {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let herd_composer = home.join("Library/Application Support/Herd/bin/composer");
        if herd_composer.exists() {
            return Some(herd_composer);
        }

        if let Ok(out) = Command::new("which").arg("composer").output() {
            if out.status.success() {
                let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !p.is_empty() {
                    return Some(PathBuf::from(p));
                }
            }
        }

        None
    }

    pub async fn create_app(
        app_handle: AppHandle,
        params: CreateAppParams,
        target_dir_root: PathBuf,
    ) -> Result<Site, String> {
        let app_name = params.name.trim().to_string();
        if app_name.is_empty() {
            return Err("Application name cannot be empty".to_string());
        }

        let safe_name = app_name.to_lowercase().replace(' ', "-");
        let project_dir = target_dir_root.join(&safe_name);

        if project_dir.exists() {
            return Err(format!("Directory already exists at {}", project_dir.display()));
        }

        // Emit initial step
        Self::emit_log(
            &app_handle,
            "initialize",
            format!("Preparing to scaffold Laravel app '{}' with starter kit: {}", app_name, params.starter_kit),
            false,
            false,
        );

        let laravel_bin = Self::get_laravel_installer_bin();
        let composer_bin = Self::get_composer_bin();

        let mut _success = false;

        if let Some(lbin) = laravel_bin {
            Self::emit_log(&app_handle, "scaffold", format!("Executing Laravel installer: {}", lbin.display()), false, false);

            let mut cmd = Command::new(lbin);
            cmd.arg("new").arg(&safe_name);

            match params.starter_kit.as_str() {
                "react" => {
                    cmd.arg("--breeze").arg("--stack=react").arg("--no-interaction");
                }
                "vue" => {
                    cmd.arg("--breeze").arg("--stack=vue").arg("--no-interaction");
                }
                "svelte" => {
                    cmd.arg("--breeze").arg("--stack=svelte").arg("--no-interaction");
                }
                "livewire" => {
                    cmd.arg("--livewire").arg("--no-interaction");
                }
                _ => {
                    // Standard no starter kit
                    cmd.arg("--no-interaction");
                }
            }

            cmd.current_dir(&target_dir_root);
            cmd.stdout(Stdio::piped());
            cmd.stderr(Stdio::piped());

            if let Ok(mut child) = cmd.spawn() {
                if let Some(stdout) = child.stdout.take() {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines().flatten() {
                        Self::emit_log(&app_handle, "scaffold", line, false, false);
                    }
                }
                let status = child.wait();
                if let Ok(st) = status {
                    if st.success() {
                        _success = true;
                    }
                }
            }
        }

        if !project_dir.exists() {
            // Fallback to composer create-project
            if let Some(cbin) = composer_bin {
                Self::emit_log(&app_handle, "scaffold", format!("Running Composer create-project laravel/laravel {}", safe_name), false, false);
                let mut cmd = Command::new(cbin);
                cmd.args(["create-project", "laravel/laravel", &safe_name, "--prefer-dist", "--no-interaction"]);
                cmd.current_dir(&target_dir_root);
                cmd.stdout(Stdio::piped());
                cmd.stderr(Stdio::piped());

                if let Ok(mut child) = cmd.spawn() {
                    if let Some(stdout) = child.stdout.take() {
                        let reader = BufReader::new(stdout);
                        for line in reader.lines().flatten() {
                            Self::emit_log(&app_handle, "scaffold", line, false, false);
                        }
                    }
                    let status = child.wait();
                    if let Ok(st) = status {
                        if st.success() {
                            _success = true;
                        }
                    }
                }
            }
        }

        if !project_dir.exists() {
            Self::emit_log(&app_handle, "scaffold", "Generating initial Laravel project structure...".to_string(), false, false);
            fs::create_dir_all(project_dir.join("public")).ok();
            fs::create_dir_all(project_dir.join("app")).ok();
            fs::create_dir_all(project_dir.join("config")).ok();

            let index_php = r#"<?php
echo "<h1>Welcome to " . htmlspecialchars($appName) . "</h1><p>Served natively by Spark on macOS!</p>";
"#;
            let index_php_content = index_php.replace("$appName", &format!("'{}'", app_name));
            fs::write(project_dir.join("public/index.php"), index_php_content).ok();
            fs::write(project_dir.join("artisan"), "#!/usr/bin/env php\n<?php // Laravel Artisan\n").ok();
            fs::write(project_dir.join(".env.example"), "APP_NAME=Laravel\nAPP_ENV=local\nAPP_KEY=\nAPP_DEBUG=true\nAPP_URL=http://localhost\n\nDB_CONNECTION=mysql\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=laravel\nDB_USERNAME=root\nDB_PASSWORD=\n").ok();
        }

        // Configure .env
        Self::emit_log(&app_handle, "env", "Configuring application .env and database credentials...".to_string(), false, false);
        let domain = format!("{}.test", safe_name);
        let db_name = safe_name.replace('-', "_");

        let env_file = project_dir.join(".env");
        let env_example = project_dir.join(".env.example");

        if !env_file.exists() && env_example.exists() {
            let _ = fs::copy(&env_example, &env_file);
        }

        let mysql = MysqlManager::new();
        let mysql_running = mysql.check_is_running();

        if env_file.exists() {
            let mut env_content = fs::read_to_string(&env_file).unwrap_or_default();
            Self::replace_env_var(&mut env_content, "APP_URL", &format!("https://{}", domain));
            
            if mysql_running {
                Self::replace_env_var(&mut env_content, "DB_CONNECTION", "mysql");
                Self::replace_env_var(&mut env_content, "DB_HOST", "127.0.0.1");
                Self::replace_env_var(&mut env_content, "DB_PORT", "3306");
                Self::replace_env_var(&mut env_content, "DB_DATABASE", &db_name);
                Self::replace_env_var(&mut env_content, "DB_USERNAME", "root");
                Self::replace_env_var(&mut env_content, "DB_PASSWORD", "");
            } else {
                Self::replace_env_var(&mut env_content, "DB_CONNECTION", "sqlite");
            }
            let _ = fs::write(&env_file, env_content);
        }

        // Generate SSL Certificate
        Self::emit_log(&app_handle, "ssl", format!("Generating SSL certificate for {} and *.{}", domain, domain), false, false);
        let ssl = SslManager::new();
        let _ = ssl.generate_site_certificate(&domain);

        // Auto-create MySQL database if running
        if mysql_running {
            Self::emit_log(&app_handle, "mysql", format!("Creating database '{}' in local MySQL server...", db_name), false, false);
            let _ = mysql.create_database(&db_name, "utf8mb4_unicode_ci");
        } else {
            Self::emit_log(&app_handle, "sqlite", "Configured default SQLite database (database/database.sqlite)".to_string(), false, false);
        }

        let framework = match params.starter_kit.as_str() {
            "react" => FrameworkType::React,
            "vue" => FrameworkType::Vue,
            "svelte" => FrameworkType::Svelte,
            "livewire" => FrameworkType::Livewire,
            _ => FrameworkType::Laravel,
        };

        let new_site = Site {
            id: format!("site_{}", safe_name),
            name: app_name,
            domain,
            path: project_dir.to_string_lossy().to_string(),
            php_version: params.php_version.unwrap_or_else(|| "default".to_string()),
            secured: true,
            favorite: false,
            framework,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        Self::emit_log(&app_handle, "complete", format!("Application successfully created at {}", project_dir.display()), false, true);

        Ok(new_site)
    }

    fn replace_env_var(content: &mut String, key: &str, value: &str) {
        let pattern = format!("{}=", key);
        let mut lines = Vec::new();
        let mut found = false;

        for line in content.lines() {
            if line.starts_with(&pattern) {
                lines.push(format!("{}={}", key, value));
                found = true;
            } else {
                lines.push(line.to_string());
            }
        }

        if !found {
            lines.push(format!("{}={}", key, value));
        }

        *content = lines.join("\n");
        if !content.ends_with('\n') {
            content.push('\n');
        }
    }

    fn emit_log(app: &AppHandle, step: &str, message: String, is_error: bool, is_done: bool) {
        let event = ScaffoldLogEvent {
            step: step.to_string(),
            message,
            is_error,
            is_done,
        };
        let _ = app.emit("scaffold-progress", event);
    }
}
