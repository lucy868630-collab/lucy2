"""集中配置：微服务只在这里读取环境变量。"""
import os


class Settings:
    def __init__(self) -> None:
        self.service = "cortex-ai"
        self.version = "1.0.0"
        self.vector_dim = int(os.getenv("VECTOR_DIM", "128"))
        self.log_level = os.getenv("LOG_LEVEL", "info").lower()
        self.allowed_origins = [
            item.strip()
            for item in os.getenv(
                "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"
            ).split(",")
            if item.strip()
        ]


settings = Settings()
