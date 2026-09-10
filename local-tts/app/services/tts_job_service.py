import asyncio
import logging
import multiprocessing as mp
import uuid
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone
from multiprocessing import Manager
from threading import Lock
from typing import Optional

from app.services.tts_worker import generate_tts

logger = logging.getLogger("indicf5.jobs")

TTS_TIMEOUT_SECONDS = 15 * 60
PROGRESS_POLL_INTERVAL_SECONDS = 0.5


class TTSJobService:
    def __init__(self):
        self.jobs = {}
        self.lock = Lock()

        self.manager = Manager()
        self.progress = self.manager.dict()

        self.executor = ProcessPoolExecutor(
            max_workers=1,
            mp_context=mp.get_context("spawn"),
        )

    def create_job(
        self,
        text: str,
        voice_mode: str = "preset",
        preset_voice: Optional[str] = None,
        custom_voice_id: Optional[str] = None,
        reference_audio_base64: Optional[str] = None,
        reference_text: Optional[str] = None,
        speed: float = 1.0,
        speaking_style: str = "conversational",
        steps: Optional[int] = None,
        debug: bool = True,
    ) -> dict:
        job_id = str(uuid.uuid4())

        job = {
            "id": job_id,
            "status": "queued",
            "totalGroups": 0,
            "completedGroups": 0,
            "progress": 0,
            "outputFilename": None,
            "outputPath": None,
            "errorMessage": None,
            "createdAt": self._now(),
            "updatedAt": self._now(),
        }

        with self.lock:
            self.jobs[job_id] = job

        self.progress[job_id] = {
            "totalGroups": 0,
            "completedGroups": 0,
            "progress": 0,
        }

        asyncio.create_task(
            self._process_job(
                job_id,
                text,
                voice_mode=voice_mode,
                preset_voice=preset_voice,
                custom_voice_id=custom_voice_id,
                reference_audio_base64=reference_audio_base64,
                reference_text=reference_text,
                speed=speed,
                speaking_style=speaking_style,
                steps=steps,
                debug=debug,
            )
        )

        return self.get_job(job_id)

    def get_job(self, job_id: str) -> dict | None:
        with self.lock:
            job = self.jobs.get(job_id)

            if job is None:
                return None

            return dict(job)

    async def _process_job(
        self,
        job_id: str,
        text: str,
        voice_mode: str = "preset",
        preset_voice: Optional[str] = None,
        custom_voice_id: Optional[str] = None,
        reference_audio_base64: Optional[str] = None,
        reference_text: Optional[str] = None,
        speed: float = 1.0,
        speaking_style: str = "conversational",
        steps: Optional[int] = None,
        debug: bool = True,
    ):
        self._update_job(
            job_id,
            status="processing",
        )

        try:
            progress = self.progress[job_id]

            future = self.executor.submit(
                generate_tts,
                text,
                progress,
                voice_mode,
                preset_voice,
                custom_voice_id,
                reference_audio_base64,
                reference_text,
                speed,
                speaking_style,
                steps,
                debug,
            )

            wrapped_future = asyncio.wrap_future(future)
            start_time = asyncio.get_running_loop().time()

            while not wrapped_future.done():
                elapsed = asyncio.get_running_loop().time() - start_time

                if elapsed >= TTS_TIMEOUT_SECONDS:
                    future.cancel()
                    raise TimeoutError(
                        "IndicF5 TTS generation timed out after 15 minutes."
                    )

                current_progress = dict(progress)

                self._update_job(
                    job_id,
                    totalGroups=current_progress.get("totalGroups", 0),
                    completedGroups=current_progress.get("completedGroups", 0),
                    progress=current_progress.get("progress", 0),
                )

                await asyncio.sleep(PROGRESS_POLL_INTERVAL_SECONDS)

            result = await wrapped_future

            audio_duration = 0.0
            try:
                import wave
                with wave.open(str(result["path"]), 'rb') as wf:
                    audio_duration = round(wf.getnframes() / float(wf.getframerate()), 3)
            except Exception as e:
                logger.warning(f"Could not calculate audio duration: {e}")

            processing_time = round(elapsed, 3)
            rtf = round(processing_time / audio_duration, 4) if audio_duration > 0 else 0.0
            chars_per_sec = round(len(text) / processing_time, 2) if processing_time > 0 else 0.0

            self._update_job(
                job_id,
                status="completed",
                totalGroups=result["totalGroups"],
                completedGroups=result["totalGroups"],
                progress=100,
                outputFilename=result["filename"],
                outputPath=str(result["path"]),
                audioDurationSeconds=audio_duration,
                processingTimeSeconds=processing_time,
                rtf=rtf,
                charsPerSecond=chars_per_sec,
                telemetry=result.get("telemetry"),
            )

            logger.info("TTS job completed | job=%s", job_id)

        except TimeoutError as error:
            logger.error("TTS job timed out | job=%s", job_id)
            self._update_job(
                job_id,
                status="failed",
                errorMessage=str(error),
            )

        except Exception as error:
            logger.exception("TTS job failed | job=%s", job_id)
            self._update_job(
                job_id,
                status="failed",
                errorMessage=str(error),
            )

        finally:
            self.progress.pop(job_id, None)

    def _update_job(self, job_id: str, **updates):
        with self.lock:
            job = self.jobs.get(job_id)

            if job is None:
                return

            job.update(updates)
            job["updatedAt"] = self._now()

    @staticmethod
    def _now():
        return datetime.now(timezone.utc).isoformat()


tts_job_service = TTSJobService()