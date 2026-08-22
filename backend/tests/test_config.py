import os
import unittest

from app.core.config import Settings


class SettingsConfigTest(unittest.TestCase):
    def test_cors_origins_accepts_csv_string(self):
        original = os.environ.get("CORS_ORIGINS")
        os.environ["CORS_ORIGINS"] = "http://localhost:5173,http://127.0.0.1:5173"
        try:
            settings = Settings()
            self.assertEqual(
                settings.CORS_ORIGINS,
                ["http://localhost:5173", "http://127.0.0.1:5173"],
            )
        finally:
            if original is None:
                os.environ.pop("CORS_ORIGINS", None)
            else:
                os.environ["CORS_ORIGINS"] = original


if __name__ == "__main__":
    unittest.main()
