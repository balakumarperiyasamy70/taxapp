from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    encryption_key: str

    irs_efin: str = ""
    irs_mef_url: str = "https://la.www4.irs.gov/mef/"
    irs_mef_test_url: str = "https://la.www4.irs.gov/mef/test/"

    app_env: str = "development"
    upload_dir: str = "/var/taxapp/uploads"
    allowed_origins: str = "http://localhost:3000"

    smtp_host: str = "127.0.0.1"
    smtp_port: int = 587
    smtp_user: str = "noreply@taxrefundloan.us"
    smtp_password: str = ""
    smtp_from: str = "noreply@taxrefundloan.us"
    frontend_base_url: str = "https://loan.taxrefundloan.us"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
