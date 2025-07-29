<?php

namespace App\Http\Controllers;

use App\Services\DeepgramTranscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TranscriptionController extends Controller
{
    protected DeepgramTranscriptionService $transcriptionService;
    
    public function __construct(DeepgramTranscriptionService $transcriptionService)
    {
        $this->transcriptionService = $transcriptionService;
    }
    
    /**
     * 議事録作成ページを表示
     */
    public function index()
    {
        return Inertia::render('Transcription/Index');
    }
    
    /**
     * 音声ファイルをアップロードして文字起こし
     */
    public function transcribe(Request $request)
    {
        \Log::info('Transcription request received', [
            'has_file' => $request->hasFile('audio_file'),
            'file' => $request->file('audio_file'),
            'model' => $request->input('model'),
        ]);
        
        $request->validate([
            'audio_file' => 'required|file|max:5120', // 5MB (fits within PHP 8MB limit)
            'model' => 'sometimes|string|in:nova-2,nova,enhanced,base'
        ]);
        
        $file = $request->file('audio_file');
        $model = $request->input('model', 'nova-2');
        
        // ファイル形式チェック
        $detectedMimeType = $file->getMimeType();
        $originalName = $file->getClientOriginalName();
        $fileExtension = pathinfo($originalName, PATHINFO_EXTENSION);
        
        \Log::info('File MIME type check', [
            'detected_mime_type' => $detectedMimeType,
            'original_name' => $originalName,
            'file_extension' => $fileExtension,
            'file_size' => $file->getSize()
        ]);
        
        // MIMEタイプまたはファイル拡張子での判定
        $isSupportedByMime = $this->transcriptionService->isSupportedFormat($detectedMimeType);
        $isSupportedByExtension = in_array(strtolower($fileExtension), ['wav', 'mp3', 'mp4', 'm4a', 'webm', 'ogg', 'flac']);
        
        if (!$isSupportedByMime && !$isSupportedByExtension) {
            \Log::warning('Unsupported file format', [
                'mime_type' => $detectedMimeType,
                'extension' => $fileExtension,
                'original_name' => $originalName
            ]);
            
            return response()->json([
                'success' => false,
                'error' => "サポートされていないファイル形式です。検出されたタイプ: {$detectedMimeType}、拡張子: {$fileExtension}。MP3, WAV, MP4、WebMなどの音声・動画ファイルをアップロードしてください。"
            ], 400);
        }
        
        if (!$isSupportedByMime && $isSupportedByExtension) {
            \Log::info('File accepted by extension despite MIME type mismatch', [
                'mime_type' => $detectedMimeType,
                'extension' => $fileExtension
            ]);
        }
        
        // ファイルサイズチェック
        if (!$this->transcriptionService->isValidFileSize($file->getSize())) {
            $maxSize = config('app.env') === 'production' ? '500MB' : '5MB';
            return response()->json([
                'success' => false,
                'error' => "ファイルサイズが{$maxSize}を超えています。"
            ], 400);
        }
        
        try {
            // 一時ファイルとして保存
            $tempPath = $file->store('temp');
            $fullPath = Storage::path($tempPath);
            
            // 文字起こし実行
            $result = $this->transcriptionService->transcribe($fullPath, $model);
            
            // 一時ファイルを削除
            Storage::delete($tempPath);
            
            if (!$result['success']) {
                return response()->json($result, 500);
            }
            
            // 成功時のレスポンス
            return response()->json([
                'success' => true,
                'text' => $result['text'],
                'language' => $result['language'],
                'segments' => $result['segments'],
                'filename' => $file->getClientOriginalName(),
                'model' => $model
            ]);
            
        } catch (\Exception $e) {
            // エラー時は一時ファイルを削除
            if (isset($tempPath)) {
                Storage::delete($tempPath);
            }
            
            return response()->json([
                'success' => false,
                'error' => '文字起こし処理でエラーが発生しました: ' . $e->getMessage()
            ], 500);
        }
    }
}