use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;
use crate::models::{AppSettings, FrameworkType, Site};
use crate::ssl::SslManager;

pub struct ConfigStore {
    config_file: PathBuf,
}

impl ConfigStore {
    pub fn new() -> Self {
        let app_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("/Users/ruhulamin/Library/Application Support"))
            .join("Spark");
        
        fs::create_dir_all(&app_dir).ok();
        Self {
            config_file: app_dir.join("config.json"),
        }
    }

    pub fn load(&self) -> (AppSettings, Vec<Site>) {
        if let Ok(content) = fs::read_to_string(&self.config_file) {
            #[derive(serde::Deserialize)]
            struct StoredData {
                settings: Option<AppSettings>,
                sites: Option<Vec<Site>>,
            }

            if let Ok(data) = serde_json::from_str::<StoredData>(&content) {
                let settings = data.settings.unwrap_or_default();
                let sites = data.sites.unwrap_or_default();
                return (settings, sites);
            }
        }

        (AppSettings::default(), Vec::new())
    }

    pub fn save(&self, settings: &AppSettings, sites: &[Site]) -> Result<(), String> {
        #[derive(serde::Serialize)]
        struct StoredData<'a> {
            settings: &'a AppSettings,
            sites: &'a [Site],
        }

        let data = StoredData { settings, sites };
        let json = serde_json::to_string_pretty(&data)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        fs::write(&self.config_file, json)
            .map_err(|e| format!("Failed to write config file: {}", e))?;

        Ok(())
    }

    pub fn scan_project_paths(&self, paths: &[String], existing_sites: &[Site], ssl: &SslManager) -> Vec<Site> {
        let mut site_map: HashMap<String, Site> = existing_sites
            .iter()
            .map(|s| (s.path.clone(), s.clone()))
            .collect();

        let home = dirs::home_dir().unwrap_or_default();

        for raw_path in paths {
            let expanded = if raw_path.starts_with("~/") {
                home.join(&raw_path[2..])
            } else {
                PathBuf::from(raw_path)
            };

            let _ = fs::create_dir_all(&expanded);

            if let Ok(entries) = fs::read_dir(&expanded) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        let path_str = path.to_string_lossy().to_string();
                        let folder_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        
                        // Ignore hidden folders
                        if folder_name.starts_with('.') {
                            continue;
                        }

                        let clean = folder_name.trim().to_lowercase().replace(' ', "-");
                        let domain = if clean.ends_with(".test") {
                            clean
                        } else {
                            format!("{}.test", clean)
                        };
                        let framework = Self::detect_framework(&path);
                        let is_secured = ssl.is_site_secured(&domain);

                        if let Some(existing) = site_map.get_mut(&path_str) {
                            existing.secured = is_secured;
                            existing.framework = framework;
                        } else {
                            site_map.insert(
                                path_str.clone(),
                                Site {
                                    id: uuid_simulated(&folder_name),
                                    name: folder_name,
                                    domain,
                                    path: path_str,
                                    php_version: "default".to_string(),
                                    secured: is_secured,
                                    favorite: false,
                                    framework,
                                    created_at: Utc::now().to_rfc3339(),
                                },
                            );
                        }
                    }
                }
            }
        }

        let mut result: Vec<Site> = site_map.into_values().collect();
        result.sort_by(|a, b| {
            b.favorite.cmp(&a.favorite).then_with(|| a.name.cmp(&b.name))
        });
        result
    }

    pub fn detect_framework(dir: &Path) -> FrameworkType {
        let artisan = dir.join("artisan");
        let composer = dir.join("composer.json");
        let package_json = dir.join("package.json");
        let public_index = dir.join("public").join("index.php");
        let root_index = dir.join("index.php");

        if artisan.exists() {
            if let Ok(content) = fs::read_to_string(&composer) {
                if content.contains("livewire/livewire") {
                    return FrameworkType::Livewire;
                }
            }
            if let Ok(content) = fs::read_to_string(&package_json) {
                if content.contains("\"@inertiajs/react\"") || content.contains("\"react\"") {
                    return FrameworkType::React;
                }
                if content.contains("\"@inertiajs/vue3\"") || content.contains("\"vue\"") {
                    return FrameworkType::Vue;
                }
                if content.contains("\"@inertiajs/svelte\"") || content.contains("\"svelte\"") {
                    return FrameworkType::Svelte;
                }
            }
            return FrameworkType::Laravel;
        }

        if package_json.exists() {
            if let Ok(content) = fs::read_to_string(&package_json) {
                if content.contains("\"svelte\"") {
                    return FrameworkType::Svelte;
                }
                if content.contains("\"vue\"") {
                    return FrameworkType::Vue;
                }
                if content.contains("\"react\"") {
                    return FrameworkType::React;
                }
            }
        }

        if public_index.exists() || root_index.exists() {
            return FrameworkType::Php;
        }

        FrameworkType::Static
    }
}

fn uuid_simulated(input: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    let hash = hasher.finish();
    format!("site_{:x}", hash)
}
