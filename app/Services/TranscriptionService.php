<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class TranscriptionService
{
    /**
     * 音声ファイルを文字起こしする
     */
    public function transcribe(string $filePath, string $model = 'base'): array
    {
        try {
            // Pythonスクリプトのパス
            $scriptPath = base_path('scripts/transcribe.py');
            
            if (!file_exists($scriptPath)) {
                throw new Exception('Transcription script not found');
            }
            
            if (!file_exists($filePath)) {
                throw new Exception('Audio file not found');
            }
            
            // Pythonスクリプトを実行
            $command = sprintf(
                'python3 %s %s %s 2>&1',
                escapeshellarg($scriptPath),
                escapeshellarg($filePath),
                escapeshellarg($model)
            );
            
            Log::info('Executing transcription command', ['command' => $command]);
            
            $output = shell_exec($command);
            
            if ($output === null) {
                throw new Exception('Failed to execute transcription script');
            }
            
            $result = json_decode($output, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('JSON decode error', ['output' => $output]);
                throw new Exception('Invalid JSON response from transcription script');
            }
            
            if (!$result['success']) {
                throw new Exception($result['error'] ?? 'Transcription failed');
            }
            
            return $result;
            
        } catch (Exception $e) {
            Log::error('Transcription error', [
                'error' => $e->getMessage(),
                'file' => $filePath,
                'model' => $model
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * サポートされている音声フォーマットかチェック
     */
    public function isSupportedFormat(string $mimeType): bool
    {
        $supportedFormats = [
            'audio/mpeg',           // mp3
            'audio/wav',            // wav
            'audio/x-wav',          // wav
            'audio/mp4',            // m4a
            'audio/x-m4a',          // m4a
            'audio/ogg',            // ogg
            'audio/webm',           // webm
            'audio/flac',           // flac
            'video/mp4',            // mp4 (動画からも音声抽出可能)
            'video/quicktime',      // mov
            'video/x-msvideo',      // avi
        ];
        
        return in_array($mimeType, $supportedFormats);
    }
    
    /**
     * ファイルサイズ制限をチェック
     */
    public function isValidFileSize(int $fileSize): bool
    {
        // 25MB制限 (Whisperの推奨制限)
        return $fileSize <= 25 * 1024 * 1024;
    }
}