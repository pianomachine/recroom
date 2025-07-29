<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeepgramTranscriptionService
{
    private string $apiKey;
    private string $apiUrl;

    public function __construct()
    {
        $this->apiKey = config('services.deepgram.api_key');
        $this->apiUrl = config('services.deepgram.api_url');
        
        if (empty($this->apiKey)) {
            throw new Exception('Deepgram API key is not configured. Please set DEEPGRAM_API_KEY in your .env file.');
        }
    }

    /**
     * 音声ファイルを文字起こしする
     */
    public function transcribe(string $filePath, string $model = 'nova-2'): array
    {
        try {
            if (!file_exists($filePath)) {
                throw new Exception('Audio file not found');
            }

            // ファイルサイズチェック（Deepgramは500MB制限）
            $fileSize = filesize($filePath);
            if ($fileSize > 500 * 1024 * 1024) {
                throw new Exception('File size exceeds 500MB limit');
            }

            // 料金計算（秒数ベース）
            $estimatedDuration = $this->estimateAudioDuration($filePath);
            $estimatedCost = $this->calculateCost($estimatedDuration);

            Log::info('Starting Deepgram transcription', [
                'file' => basename($filePath),
                'size' => $fileSize,
                'estimated_duration' => $estimatedDuration,
                'estimated_cost' => $estimatedCost,
                'model' => $model
            ]);

            // Deepgram APIパラメータ
            $params = [
                'model' => $model,
                'smart_format' => 'true',
                'punctuate' => 'true',
                'diarize' => 'true',  // 話者分離
                'paragraphs' => 'true',
                'utterances' => 'true',
                'language' => 'ja',  // 日本語優先、自動検出も可能
            ];

            // ファイルの詳細ログ
            $mimeType = mime_content_type($filePath);
            $fileSize = filesize($filePath);
            
            Log::info('Sending to Deepgram', [
                'file_path' => $filePath,
                'mime_type' => $mimeType,
                'file_size' => $fileSize,
                'params' => $params,
                'api_url' => $this->apiUrl . '/v1/listen'
            ]);

            // Deepgram APIへmultipart form dataとして送信（正式な方法）
            $response = Http::withHeaders([
                'Authorization' => 'Token ' . $this->apiKey,
            ])
            ->timeout(300) // 5分タイムアウト
            ->attach(
                'audio', 
                file_get_contents($filePath), 
                basename($filePath)
            )
            ->post($this->apiUrl . '/v1/listen?' . http_build_query($params));

            if (!$response->successful()) {
                $responseBody = $response->json();
                $error = $responseBody['err_msg'] ?? $responseBody['message'] ?? 'Deepgram API request failed';
                
                Log::error('Deepgram API error', [
                    'status' => $response->status(),
                    'error' => $error,
                    'response' => $response->body(),
                    'file_type' => $mimeType
                ]);
                
                // MP4ファイルで音声処理エラーの場合、より分かりやすいメッセージ
                if (str_contains($mimeType, 'video/') && str_contains($error, 'failed to process audio')) {
                    throw new Exception("MP4/動画ファイルに音声データが見つからないか、サポートされていない音声形式です。WAV、MP3、M4Aファイルをお試しください。");
                }
                
                throw new Exception("Deepgram API error: {$error}");
            }

            $result = $response->json();
            
            // Deepgramレスポンスを標準形式に変換
            return $this->formatDeepgramResponse($result, $estimatedCost);

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
     * Deepgramレスポンスを標準形式に変換
     */
    private function formatDeepgramResponse(array $deepgramResult, float $estimatedCost): array
    {
        $alternatives = $deepgramResult['results']['channels'][0]['alternatives'][0] ?? null;
        
        if (!$alternatives) {
            throw new Exception('No transcription results found');
        }

        // 全文テキスト
        $fullText = $alternatives['transcript'] ?? '';
        
        // セグメント情報（タイムスタンプ付き）
        $segments = [];
        $paragraphs = $alternatives['paragraphs']['paragraphs'] ?? [];
        
        foreach ($paragraphs as $paragraph) {
            foreach ($paragraph['sentences'] as $sentence) {
                $segments[] = [
                    'start' => $sentence['start'],
                    'end' => $sentence['end'],
                    'text' => $sentence['text']
                ];
            }
        }

        // 言語検出
        $detectedLanguage = $deepgramResult['results']['channels'][0]['detected_language'] ?? 'ja';
        
        // 実際の音声時間
        $actualDuration = $deepgramResult['metadata']['duration'] ?? 0;
        $actualCost = $this->calculateCost($actualDuration);

        return [
            'success' => true,
            'text' => $fullText,
            'language' => $detectedLanguage,
            'segments' => $segments,
            'metadata' => [
                'duration' => $actualDuration,
                'model' => $deepgramResult['metadata']['model_info']['name'] ?? 'nova-2',
                'cost' => $actualCost,
                'confidence' => $alternatives['confidence'] ?? 0,
                'provider' => 'deepgram'
            ]
        ];
    }

    /**
     * 音声時間を推定（簡易版）
     */
    private function estimateAudioDuration(string $filePath): float
    {
        // ファイルサイズベースの粗い計算（MP3: 約1MB/分想定）
        $fileSize = filesize($filePath);
        return max($fileSize / (1024 * 1024) * 60, 30); // 最低30秒
    }

    /**
     * 料金計算（Deepgram: $0.0043/分）
     */
    private function calculateCost(float $durationSeconds): float
    {
        $durationMinutes = $durationSeconds / 60;
        return round($durationMinutes * 0.0043, 4); // USD
    }

    /**
     * サポートされている音声フォーマットかチェック
     */
    public function isSupportedFormat(string $mimeType): bool
    {
        $preferredFormats = [
            'audio/mpeg',           // mp3
            'audio/wav',            // wav
            'audio/x-wav',          // wav
            'audio/mp4',            // m4a
            'audio/x-m4a',          // m4a
            'audio/ogg',            // ogg
            'audio/webm',           // webm (ライブ録音用)
            'audio/webm;codecs=opus', // webm opus (ライブ録音用)
            'audio/flac',           // flac
        ];
        
        $videoFormats = [
            'video/mp4',            // mp4 (音声抽出が必要な場合あり)
            'video/quicktime',      // mov
            'video/x-msvideo',      // avi
        ];
        
        // 音声ファイルは優先的にサポート
        if (in_array($mimeType, $preferredFormats)) {
            return true;
        }
        
        // 動画ファイルは注意書きを残してサポート
        if (in_array($mimeType, $videoFormats)) {
            Log::warning('Video file detected - may require audio track', [
                'mime_type' => $mimeType
            ]);
            return true;
        }
        
        return false;
    }
    
    /**
     * ファイルサイズ制限をチェック（開発環境: 5MB、本番環境: 500MB）
     */
    public function isValidFileSize(int $fileSize): bool
    {
        $maxSize = config('app.env') === 'production' ? 500 * 1024 * 1024 : 5 * 1024 * 1024;
        return $fileSize <= $maxSize;
    }
}