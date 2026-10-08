import logging

logger = logging.getLogger("indicf5.model")

try:
    from indic_f5_mlx import load_indicf5
    HAS_MLX = True
except ImportError:
    HAS_MLX = False
    load_indicf5 = None
    logger.warning("indic_f5_mlx module not found. MLX synthesis is disabled (requires macOS Apple Silicon).")


class IndicF5Model:
    def __init__(self):
        self.model = None
        self.load()

    def load(self):
        if HAS_MLX and load_indicf5:
            try:
                logger.info("Loading IndicF5 model...")
                self.model, _ = load_indicf5()
                logger.info("IndicF5 model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load IndicF5 model: {e}")
                self.model = None
        else:
            logger.info("IndicF5 model running in fallback mode.")

    @property
    def ready(self) -> bool:
        return self.model is not None or not HAS_MLX


indicf5_model = IndicF5Model()