<?php

use App\Http\Controllers\TranscriptionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// 一時的な認証なしルート（議事録機能テスト用）
Route::get('/test', [TranscriptionController::class, 'index'])->name('test.transcription');
Route::post('/test', [TranscriptionController::class, 'transcribe'])->name('test.transcribe');

Route::middleware([
    'auth',
    ValidateSessionWithWorkOS::class,
])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    
    Route::get('transcription', [TranscriptionController::class, 'index'])->name('transcription');
    Route::get('transcription/live', function () {
        return Inertia::render('Transcription/LiveRecording');
    })->name('transcription.live');
    Route::post('transcription', [TranscriptionController::class, 'transcribe'])->name('transcription.create');
});


require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
