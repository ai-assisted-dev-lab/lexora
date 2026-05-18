use crate::config::{APP_IDENTIFIER, APP_NAME, APP_VERSION};
use crate::dto::info::AppInfoDto;
use crate::errors::AppError;

#[tauri::command]
pub fn get_app_info() -> Result<AppInfoDto, AppError> {
    let environment = if cfg!(debug_assertions) {
        "development"
    } else {
        "production"
    };

    Ok(AppInfoDto {
        name: APP_NAME.to_string(),
        version: APP_VERSION.to_string(),
        identifier: APP_IDENTIFIER.to_string(),
        environment: environment.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_app_info_returns_valid_dto() {
        let result = get_app_info();
        assert!(result.is_ok());
        let info = result.unwrap();
        assert_eq!(info.name, "lexora");
        assert!(!info.version.is_empty());
        assert_eq!(info.identifier, "com.kieran.lexora");
        assert!(info.environment == "development" || info.environment == "production");
    }
}
