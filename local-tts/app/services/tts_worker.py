def generate_tts(
    text,
    progress,
    voice_mode="preset",
    preset_voice=None,
    custom_voice_id=None,
    reference_audio_base64=None,
    reference_text=None,
    speed=1.0,
    speaking_style="conversational",
    steps=None,
    debug=False,
):
    from app.services.tts_service import tts_service

    def on_progress(completed_groups, total_groups):
        progress["totalGroups"] = total_groups
        progress["completedGroups"] = completed_groups
        progress["progress"] = int(
            completed_groups / total_groups * 100
        )

    return tts_service.generate_speech(
        text,
        progress_callback=on_progress,
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