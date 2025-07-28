# 議事録アプリ - セットアップガイド

OpenAI Whisperを使用した音声文字起こし機能を持つ議事録作成アプリです。

## 機能

- **音声・動画ファイルのアップロード**: MP3, WAV, MP4など様々な形式に対応
- **自動文字起こし**: OpenAI Whisperによる高精度な音声認識
- **タイムスタンプ付き出力**: 発言時間付きで結果を表示
- **複数モデル対応**: 精度と速度のバランスを選択可能
- **結果ダウンロード**: テキストファイルとして保存可能

## 必要な環境

### システム要件
- PHP 8.2以上
- Python 3.8以上
- Node.js 18以上
- Composer
- FFmpeg（音声・動画ファイル処理用）

### Python依存関係
```bash
# OpenAI Whisperのインストール
pip install openai-whisper

# FFmpegのインストール（Ubuntu/Debian）
sudo apt update
sudo apt install ffmpeg

# FFmpegのインストール（macOS）
brew install ffmpeg

# FFmpegのインストール（Windows）
# https://ffmpeg.org/download.html からダウンロード
```

## セットアップ手順

### 1. Laravelアプリケーションの準備
```bash
# プロジェクトディレクトリに移動
cd /path/to/your/laravel/project

# Composer依存関係のインストール
composer install

# Node.js依存関係のインストール
npm install

# アプリケーションキーの生成（未設定の場合）
php artisan key:generate

# データベースマイグレーション
php artisan migrate
```

### 2. ストレージの設定
```bash
# ストレージディレクトリの作成とパーミッション設定
php artisan storage:link
chmod -R 775 storage/
```

### 3. Pythonスクリプトの実行権限設定
```bash
chmod +x scripts/transcribe.py
```

### 4. 設定ファイルの確認
`config/filesystems.php` でファイルアップロードの設定を確認してください：

```php
'disks' => [
    'local' => [
        'driver' => 'local',
        'root' => storage_path('app'),
    ],
    // その他の設定...
],
```

## 使用方法

### 1. アプリケーションの起動
```bash
# 開発サーバーの起動
composer run dev
```

### 2. 議事録作成ページへアクセス
ブラウザで `http://localhost:8000/transcription` にアクセス

### 3. 音声ファイルのアップロード
- ファイルをドラッグ&ドロップまたは「ファイルを選択」ボタンから選択
- サポート形式：MP3, WAV, MP4, M4A, OGG, WebM, FLAC, MOV, AVI
- ファイルサイズ制限：25MB

### 4. Whisperモデルの選択
- **tiny**: 高速・軽量（精度は低い）
- **base**: バランス型（推奨）
- **small**: 高精度（やや重い）
- **medium**: より高精度（重い）
- **large**: 最高精度（非常に重い）

### 5. 文字起こしの実行
「文字起こし開始」ボタンをクリックして処理を開始

### 6. 結果の確認・保存
- 全文とタイムスタンプ付きセグメントを表示
- 「ダウンロード」ボタンでテキストファイルとして保存

## トラブルシューティング

### Python/Whisperが見つからない場合
```bash
# Pythonのパス確認
which python3

# Whisperの動作確認
python3 -c "import whisper; print('Whisper installed successfully')"
```

### FFmpegが見つからない場合
```bash
# FFmpegのインストール確認
ffmpeg -version
```

### ファイルアップロードエラー
`php.ini` の設定を確認：
```ini
upload_max_filesize = 25M
post_max_size = 25M
max_execution_time = 300
memory_limit = 512M
```

### 権限エラー
```bash
# ストレージディレクトリの権限修正
sudo chown -R www-data:www-data storage/
sudo chmod -R 775 storage/
```

## 開発者向け情報

### ファイル構成
```
app/
├── Http/Controllers/TranscriptionController.php  # コントローラー
├── Services/TranscriptionService.php             # サービスクラス

resources/js/pages/Transcription/
├── Index.tsx                                     # メインUI

scripts/
├── transcribe.py                                 # Python文字起こしスクリプト

routes/
├── web.php                                       # ルート定義
```

### API エンドポイント
- `GET /transcription` - 議事録作成ページ
- `POST /transcription` - 文字起こし実行

### カスタマイズ
- モデルの追加：`TranscriptionController.php` のバリデーションルールを変更
- UI の調整：`resources/js/pages/Transcription/Index.tsx` を編集
- 処理時間制限：`TranscriptionService.php` の `shell_exec` タイムアウト設定

## 費用について

このアプリケーションは完全にローカルで動作するため、追加の費用は発生しません：

- **OpenAI Whisper**: オープンソース、無料
- **処理**: ローカル環境で実行
- **ストレージ**: ローカルファイルシステムを使用

ただし、初回のモデルダウンロード時にインターネット接続が必要です。