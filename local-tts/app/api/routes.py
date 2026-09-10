import logging
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.model import indicf5_model
from app.services.tts_job_service import tts_job_service

logger = logging.getLogger("indicf5.api")

router = APIRouter()


from typing import Optional
from app.services.tts_service import tts_service


class CloneVoiceRequest(BaseModel):
    reference_audio_base64: str
    reference_text: str
    custom_voice_id: Optional[str] = None


class TTSRequest(BaseModel):
    text: str
    voice_mode: Optional[str] = "preset"
    preset_voice: Optional[str] = None
    custom_voice_id: Optional[str] = None
    reference_audio_base64: Optional[str] = None
    reference_text: Optional[str] = None
    speed: Optional[float] = 1.0
    speaking_style: Optional[str] = "conversational"
    steps: Optional[int] = 8
    debug: Optional[bool] = True


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "IndicF5",
        "language": "te",
        "voiceCloningSupported": True,
        "ready": indicf5_model.ready,
    }


@router.post("/tts/clone")
async def clone_voice(request: CloneVoiceRequest):
    if not request.reference_audio_base64:
        raise HTTPException(
            status_code=400,
            detail="Reference audio is required for voice cloning.",
        )
    if not request.reference_text or not request.reference_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Reference transcript is required for voice cloning.",
        )

    try:
        res = tts_service.calibrate_voice(
            reference_audio_base64=request.reference_audio_base64,
            reference_text=request.reference_text,
            custom_voice_id=request.custom_voice_id,
        )
        return res
    except ValueError as ve:
        raise HTTPException(
            status_code=400,
            detail=str(ve),
        ) from ve
    except Exception as error:
        logger.exception("Voice clone calibration failed")
        raise HTTPException(
            status_code=500,
            detail=f"Voice clone calibration failed: {error}",
        ) from error


@router.post("/tts/jobs")
async def create_tts_job(request: TTSRequest):
    text = request.text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Text is required.",
        )

    if len(text) > 2000:
        raise HTTPException(
            status_code=400,
            detail="Text exceeds the maximum length of 2000 characters.",
        )

    if not indicf5_model.ready:
        raise HTTPException(
            status_code=503,
            detail="IndicF5 model is not ready.",
        )

    clamped_steps = max(4, min(12, int(request.steps))) if request.steps is not None else 8

    try:
        job = tts_job_service.create_job(
            text,
            voice_mode=request.voice_mode or "preset",
            preset_voice=request.preset_voice,
            custom_voice_id=request.custom_voice_id,
            reference_audio_base64=request.reference_audio_base64,
            reference_text=request.reference_text,
            speed=request.speed or 1.0,
            speaking_style=request.speaking_style or "conversational",
            steps=clamped_steps,
            debug=request.debug if request.debug is not None else True,
        )

        return {
            "id": job["id"],
            "status": job["status"],
            "totalGroups": job["totalGroups"],
            "completedGroups": job["completedGroups"],
            "progress": job["progress"],
            "createdAt": job["createdAt"],
            "updatedAt": job["updatedAt"],
        }

    except Exception as error:
        logger.exception(
            "Failed to create TTS job",
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to create TTS job.",
        ) from error


@router.get("/tts/jobs/{job_id}")
async def get_tts_job(job_id: str):
    job = tts_job_service.get_job(job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="TTS job not found.",
        )

    return {
        "id": job["id"],
        "status": job["status"],
        "totalGroups": job["totalGroups"],
        "completedGroups": job["completedGroups"],
        "progress": job["progress"],
        "outputFilename": job["outputFilename"],
        "errorMessage": job.get("errorMessage"),
        "audioDurationSeconds": job.get("audioDurationSeconds", 0.0),
        "processingTimeSeconds": job.get("processingTimeSeconds", 0.0),
        "rtf": job.get("rtf", 0.0),
        "charsPerSecond": job.get("charsPerSecond", 0.0),
        "telemetry": job.get("telemetry"),
        "createdAt": job["createdAt"],
        "updatedAt": job["updatedAt"],
    }


import zipfile
from typing import List

class BatchTTSRequest(BaseModel):
    prompts: List[str]
    reference_audio_base64: Optional[str] = None
    reference_text: Optional[str] = None
    speed: Optional[float] = 1.0


# Store batch metadata in memory
batch_jobs_db = {}


@router.post("/tts/batch-jobs")
async def create_batch_tts_job(request: BatchTTSRequest):
    prompts = [p.strip() for p in request.prompts if p.strip()]

    if not prompts:
        raise HTTPException(status_code=400, detail="At least one valid non-empty text prompt is required.")

    if len(prompts) > 50:
        raise HTTPException(status_code=400, detail="Batch limit is 50 prompts per job.")

    batch_id = f"batch_{uuid.uuid4().hex[:12]}"
    created_jobs = []

    for prompt in prompts:
        job = tts_job_service.create_job(
            prompt,
            reference_audio_base64=request.reference_audio_base64,
            reference_text=request.reference_text,
            speed=request.speed or 1.0,
        )
        created_jobs.append({"prompt": prompt, "jobId": job["id"]})

    items = [{"jobId": j["jobId"], "prompt": j["prompt"], "status": "queued", "progress": 0} for j in created_jobs]

    batch_record = {
        "id": batch_id,
        "status": "queued",
        "totalPrompts": len(prompts),
        "completedCount": 0,
        "failedCount": 0,
        "totalAudioDurationSeconds": 0.0,
        "totalProcessingTimeSeconds": 0.0,
        "averageRtf": 0.0,
        "jobs": created_jobs,
        "items": items,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    batch_jobs_db[batch_id] = batch_record

    return batch_record


@router.get("/tts/batch-jobs/{batch_id}")
async def get_batch_tts_job(batch_id: str):
    batch = batch_jobs_db.get(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch job not found.")

    completed_count = 0
    failed_count = 0
    total_duration = 0.0
    total_proc_time = 0.0
    items = []

    for item in batch["jobs"]:
        job_info = tts_job_service.get_job(item["jobId"])
        if job_info:
            status = job_info["status"]
            if status == "completed":
                completed_count += 1
                total_duration += job_info.get("audioDurationSeconds", 0.0)
                total_proc_time += job_info.get("processingTimeSeconds", 0.0)
            elif status == "failed":
                failed_count += 1

            items.append({
                "jobId": item["jobId"],
                "prompt": item["prompt"],
                "status": status,
                "progress": job_info.get("progress", 0),
                "outputFilename": job_info.get("outputFilename"),
                "audioDurationSeconds": job_info.get("audioDurationSeconds", 0.0),
                "processingTimeSeconds": job_info.get("processingTimeSeconds", 0.0),
                "rtf": job_info.get("rtf", 0.0),
                "charsPerSecond": job_info.get("charsPerSecond", 0.0),
            })

    total_prompts = batch["totalPrompts"]
    overall_status = (
        "completed" if completed_count + failed_count == total_prompts
        else "processing" if completed_count > 0 or failed_count > 0
        else "queued"
    )

    avg_rtf = round(total_proc_time / total_duration, 4) if total_duration > 0 else 0.0

    return {
        "id": batch_id,
        "status": overall_status,
        "totalPrompts": total_prompts,
        "completedCount": completed_count,
        "failedCount": failed_count,
        "totalAudioDurationSeconds": round(total_duration, 3),
        "totalProcessingTimeSeconds": round(total_proc_time, 3),
        "averageRtf": avg_rtf,
        "items": items,
        "createdAt": batch["createdAt"],
    }


@router.get("/tts/batch-jobs/{batch_id}/download-zip")
async def download_batch_zip(batch_id: str):
    batch = batch_jobs_db.get(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch job not found.")

    batch_dir = OUTPUT_DIR / "batch"
    batch_dir.mkdir(parents=True, exist_ok=True)
    zip_filename = f"{batch_id}.zip"
    zip_path = batch_dir / zip_filename

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        manifest = []
        for idx, item in enumerate(batch["jobs"]):
            job_info = tts_job_service.get_job(item["jobId"])
            if job_info and job_info.get("outputPath"):
                audio_p = Path(job_info["outputPath"])
                if audio_p.exists():
                    arcname = f"{idx + 1:03d}_{job_info['outputFilename']}"
                    zf.write(audio_p, arcname=arcname)
                    manifest.append({
                        "filename": arcname,
                        "prompt": item["prompt"],
                        "duration": job_info.get("audioDurationSeconds", 0.0),
                        "rtf": job_info.get("rtf", 0.0),
                    })

        manifest_str = json.dumps({"batchId": batch_id, "files": manifest}, indent=2)
        zf.writestr("manifest.json", manifest_str)

    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=zip_filename,
    )


@router.get("/tts/jobs/{job_id}/audio")
async def get_tts_audio(job_id: str):
    job = tts_job_service.get_job(job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="TTS job not found.",
        )

    if job["status"] != "completed":
        raise HTTPException(
            status_code=409,
            detail="TTS job is not completed.",
        )

    output_path = job.get("outputPath")

    if not output_path:
        raise HTTPException(
            status_code=404,
            detail="Generated audio not found.",
        )

    return FileResponse(
        path=output_path,
        media_type="audio/wav",
        filename=job["outputFilename"],
    )


import os
from datetime import datetime, timezone
from app.core.config import OUTPUT_DIR


@router.get("/tts/outputs")
async def list_tts_outputs():
    files = []
    if OUTPUT_DIR.exists():
        for p in OUTPUT_DIR.glob("*.wav"):
            try:
                stat = p.stat()
                files.append({
                    "filename": p.name,
                    "size": stat.st_size,
                    "createdAt": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                })
            except Exception as e:
                logger.warning(f"Error stating file {p}: {e}")
    files.sort(key=lambda x: x["createdAt"], reverse=True)
    return {"files": files}


@router.get("/tts/outputs/{filename}/audio")
async def get_tts_output_audio(filename: str):
    safe_filename = os.path.basename(filename)
    file_path = OUTPUT_DIR / safe_filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(
        path=file_path,
        media_type="audio/wav",
        filename=safe_filename,
    )


@router.delete("/tts/outputs/{filename}")
async def delete_tts_output(filename: str):
    safe_filename = os.path.basename(filename)
    file_path = OUTPUT_DIR / safe_filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found on disk.")
    
    try:
        file_path.unlink()
        logger.info(f"Deleted TTS output file from disk: {safe_filename}")
        return {"success": True, "message": f"Deleted {safe_filename} from disk."}
    except Exception as e:
        logger.exception(f"Failed to delete file {safe_filename}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")


from app.core.config import TTSConfig


class TTSConfigUpdateRequest(BaseModel):
    SAMPLE_RATE: Optional[int] = None
    GENERATION_STEPS: Optional[int] = None
    CFG_STRENGTH: Optional[float] = None
    SWAY_SAMPLING_COEF: Optional[float] = None
    TARGET_RMS: Optional[float] = None
    SENTENCES_PER_GROUP: Optional[int] = None
    MAX_TEXT_LENGTH: Optional[int] = None
    CHUNK_PAUSE_SECONDS: Optional[float] = None
    HOST: Optional[str] = None
    PORT: Optional[int] = None


@router.get("/tts/config")
async def get_tts_config():
    return TTSConfig.to_dict()


@router.post("/tts/config")
@router.put("/tts/config")
async def update_tts_config(request: TTSConfigUpdateRequest):
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    TTSConfig.update_from_dict(update_data)
    return {
        "success": True,
        "config": TTSConfig.to_dict(),
        "message": "TTS engine configuration updated successfully.",
    }