#!/usr/bin/env python3
"""
音声ファイルを文字起こしするスクリプト
OpenAI Whisperを使用してローカルで処理
"""

import sys
import json
import os
import tempfile
from pathlib import Path

try:
    import whisper
except ImportError:
    print(json.dumps({"error": "whisper is not installed. Run: pip install openai-whisper"}))
    sys.exit(1)


def transcribe_audio(file_path, model_name="base"):
    """
    音声ファイルを文字起こしする
    
    Args:
        file_path (str): 音声ファイルのパス
        model_name (str): Whisperモデル名 (tiny, base, small, medium, large)
        
    Returns:
        dict: 文字起こし結果
    """
    try:
        # Whisperモデルを読み込み
        model = whisper.load_model(model_name)
        
        # 音声ファイルを文字起こし
        result = model.transcribe(file_path)
        
        return {
            "success": True,
            "text": result["text"],
            "language": result["language"],
            "segments": [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"]
                }
                for seg in result["segments"]
            ]
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python transcribe.py <audio_file> [model_name]"}))
        sys.exit(1)
    
    audio_file = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "base"
    
    # ファイルの存在確認
    if not os.path.exists(audio_file):
        print(json.dumps({"error": f"File not found: {audio_file}"}))
        sys.exit(1)
    
    # 文字起こし実行
    result = transcribe_audio(audio_file, model_name)
    
    # 結果をJSON形式で出力
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()