from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "catalog-service"
    database_url: str = "postgresql://meridian:meridian@localhost:5432/meridian"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
