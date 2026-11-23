use std::fs;

pub struct DnsResolverManager;

impl DnsResolverManager {
    pub const RESOLVER_FILE: &'static str = "/etc/resolver/test";

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
}
