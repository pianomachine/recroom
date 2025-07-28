<?php

namespace App\Http\Controllers;

use App\Services\TranscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TranscriptionController extends Controller
{
    protected TranscriptionService $transcriptionService;
    
    public function __construct(TranscriptionService $transcriptionService)
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
        $request->validate([
            'audio_file' => 'required|file|max:25600', // 25MB
            'model' => 'sometimes|string|in:tiny,base,small,medium,large'
        ]);
        
        $file = $request->file('audio_file');
        $model = $request->input('model', 'base');
        
        // ファイル形式チェック
        if (!$this->transcriptionService->isSupportedFormat($file->getMimeType())) {
            return response()->json([
                'success' => false,
                'error' => 'サポートされていないファイル形式です。MP3, WAV, MP4などの音声・動画ファイルをアップロードしてください。'
            ], 400);
        }
        
        // ファイルサイズチェック
        if (!$this->transcriptionService->isValidFileSize($file->getSize())) {
            return response()->json([
                'success' => false,
                'error' => 'ファイルサイズが25MBを超えています。'
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