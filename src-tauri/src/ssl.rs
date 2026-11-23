use std::fs;
use std::path::PathBuf;
use std::process::Command;
use time::{Duration, OffsetDateTime};
use rcgen::{
    BasicConstraints, CertificateParams, DnType, ExtendedKeyUsagePurpose, IsCa, KeyPair, KeyUsagePurpose,
};

pub struct SslManager {
    base_dir: PathBuf,
}

impl SslManager {
    pub fn new() -> Self {
        let app_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("/Users/ruhulamin/Library/Application Support"))
            .join("Spark")
            .join("ssl");
        
        fs::create_dir_all(&app_dir).ok();
        Self { base_dir: app_dir }
    }

    pub fn ca_cert_path(&self) -> PathBuf {
        self.base_dir.join("rootCA.pem")
    }

    pub fn ca_key_path(&self) -> PathBuf {
        self.base_dir.join("rootCA.key")
    }

    pub fn site_cert_path(&self, domain: &str) -> PathBuf {
        self.base_dir.join(format!("{}.crt", domain))
    }

    pub fn site_key_path(&self, domain: &str) -> PathBuf {
        self.base_dir.join(format!("{}.key", domain))
    }

    pub fn is_ca_installed(&self) -> bool {
        self.ca_cert_path().exists() && self.ca_key_path().exists()
    }

    /// Check if the Root CA certificate is actually trusted in the macOS keychain
    pub fn is_ca_trusted_in_system(&self) -> bool {
        let cert_path = self.ca_cert_path();
        if !cert_path.exists() {
            return false;
        }
        Command::new("security")
            .args(["verify-cert", "-c", &cert_path.to_string_lossy()])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    pub fn is_site_secured(&self, domain: &str) -> bool {
        self.site_cert_path(domain).exists() && self.site_key_path(domain).exists()
    }

    /// Generate the Root CA if it doesn't already exist
    pub fn ensure_root_ca(&self) -> Result<(), String> {
        if self.is_ca_installed() {
            return Ok(());
        }

        let key_pair = KeyPair::generate()
            .map_err(|e| format!("Failed to generate CA keypair: {}", e))?;
        
        let mut params = CertificateParams::default();
        params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        params.distinguished_name.push(DnType::CommonName, "Spark Local Development CA");
        params.distinguished_name.push(DnType::OrganizationName, "Spark");
        params.not_before = OffsetDateTime::now_utc() - Duration::days(1);
        params.not_after = OffsetDateTime::now_utc() + Duration::days(3650);
        params.key_usages = vec![
            KeyUsagePurpose::KeyCertSign,
            KeyUsagePurpose::CrlSign,
            KeyUsagePurpose::DigitalSignature,
        ];

        let cert = params.self_signed(&key_pair)
            .map_err(|e| format!("Failed to generate self-signed CA: {}", e))?;

        let cert_pem = cert.pem();
        let key_pem = key_pair.serialize_pem();

        fs::write(self.ca_cert_path(), cert_pem)
            .map_err(|e| format!("Failed to write CA cert: {}", e))?;
        fs::write(self.ca_key_path(), key_pem)
            .map_err(|e| format!("Failed to write CA key: {}", e))?;

        Ok(())
    }

    /// Trust the Root CA in the macOS System Keychain using PrivilegeManager
    pub fn trust_root_ca_in_keychain(&self) -> Result<String, String> {
        self.ensure_root_ca()?;
        let cert_path = self.ca_cert_path();
        let cert_path_str = cert_path.to_string_lossy();
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let user_keychain = home.join("Library/Keychains/login.keychain-db");

        // 1. Immediately trust in User login keychain with SSL policy (no admin prompt needed)
        let _ = Command::new("security")
            .args([
                "add-trusted-cert",
                "-p", "ssl",
                "-p", "basic",
                "-r", "trustRoot",
                "-k", &user_keychain.to_string_lossy(),
                &cert_path_str,
            ])
            .output();

        // 2. If already trusted in System keychain, avoid prompting!
        if self.is_ca_trusted_in_system() {
            return Ok("Spark Root CA is already trusted in Keychain".to_string());
        }

        // 3. Register in System keychain via PrivilegeManager
        let cmd = format!(
            "security add-trusted-cert -d -p ssl -p basic -r trustRoot -k /Library/Keychains/System.keychain '{}'",
            cert_path_str
        );

        let _ = crate::privilege::PrivilegeManager::run_privileged(&cmd);

        Ok("Root CA successfully added and trusted in macOS Keychain".to_string())
    }

    /// Generate a per-site leaf certificate for <domain>.test and *.<domain>.test
    pub fn generate_site_certificate(&self, domain: &str) -> Result<(PathBuf, PathBuf), String> {
        self.ensure_root_ca()?;

        let ca_key_pem = fs::read_to_string(self.ca_key_path())
            .map_err(|e| format!("Failed to read CA key: {}", e))?;

        let ca_key_pair = KeyPair::from_pem(&ca_key_pem)
            .map_err(|e| format!("Failed to parse CA keypair: {}", e))?;

        let mut ca_params = CertificateParams::default();
        ca_params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        ca_params.distinguished_name.push(DnType::CommonName, "Spark Local Development CA");
        ca_params.distinguished_name.push(DnType::OrganizationName, "Spark");
        ca_params.not_before = OffsetDateTime::now_utc() - Duration::days(1);
        ca_params.not_after = OffsetDateTime::now_utc() + Duration::days(3650);
        ca_params.key_usages = vec![
            KeyUsagePurpose::KeyCertSign,
            KeyUsagePurpose::CrlSign,
            KeyUsagePurpose::DigitalSignature,
        ];

        let ca_cert = ca_params.self_signed(&ca_key_pair)
            .map_err(|e| format!("Failed to regenerate CA handle: {}", e))?;

        let leaf_key_pair = KeyPair::generate()
            .map_err(|e| format!("Failed to generate leaf keypair: {}", e))?;

        let mut leaf_params = CertificateParams::new(vec![
            domain.to_string(),
            format!("*.{}", domain),
        ]).map_err(|e| format!("Failed to create cert params: {}", e))?;

        leaf_params.distinguished_name.push(DnType::CommonName, domain);
        leaf_params.distinguished_name.push(DnType::OrganizationName, "Spark Development Environment");
        leaf_params.use_authority_key_identifier_extension = true;
        leaf_params.not_before = OffsetDateTime::now_utc() - Duration::days(1);
        leaf_params.not_after = OffsetDateTime::now_utc() + Duration::days(365);
        leaf_params.key_usages = vec![
            KeyUsagePurpose::DigitalSignature,
        ];
        leaf_params.extended_key_usages = vec![
            ExtendedKeyUsagePurpose::ServerAuth,
        ];

        let leaf_cert = leaf_params.signed_by(&leaf_key_pair, &ca_cert, &ca_key_pair)
            .map_err(|e| format!("Failed to sign leaf cert with Root CA: {}", e))?;

        let cert_path = self.site_cert_path(domain);
        let key_path = self.site_key_path(domain);

        // Append Root CA certificate to create a full chain bundle for Nginx
        let mut full_chain = leaf_cert.pem();
        if let Ok(ca_pem) = fs::read_to_string(self.ca_cert_path()) {
            full_chain.push('\n');
            full_chain.push_str(&ca_pem);
        }

        fs::write(&cert_path, full_chain)
            .map_err(|e| format!("Failed to write site cert: {}", e))?;
        fs::write(&key_path, leaf_key_pair.serialize_pem())
            .map_err(|e| format!("Failed to write site key: {}", e))?;

        Ok((cert_path, key_path))
    }

    /// Remove a site certificate
    pub fn remove_site_certificate(&self, domain: &str) {
        let _ = fs::remove_file(self.site_cert_path(domain));
        let _ = fs::remove_file(self.site_key_path(domain));
    }
}
