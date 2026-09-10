import logging

from indic_f5_mlx import load_indicf5

logger = logging.getLogger("indicf5.model")

class IndicF5Model:
    def __init__(self):
        self.model = None
        self.load()

    def load(self):
        logger.info("Loading IndicF5 model...")
        self.model, _ = load_indicf5()
        logger.info("IndicF5 model loaded successfully.")

    @property
    def ready(self) -> bool:
        return self.model is not None


indicf5_model = IndicF5Model()