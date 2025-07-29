# 議事録アプリ - セットアップガイド

**Deepgram API**を使用した高速・高精度な音声文字起こし機能を持つ議事録作成アプリです。

## 機能

### 📁 ファイルアップロード機能
- **音声・動画ファイルのアップロード**: MP3, WAV, MP4など様々な形式に対応（最大500MB）
- **高速文字起こし**: Deepgram APIによる高精度・高速な音声認識
- **タイムスタンプ付き出力**: 発言時間付きで結果を表示
- **複数モデル対応**: Nova-2（最新）、Nova、Enhanced、Baseから選択可能
- **話者分離**: 複数話者の識別機能
- **料金表示**: リアルタイムコスト計算（約0.65円/分）
- **結果ダウンロード**: テキストファイルとして保存可能

### 🎙️ ライブ議事録機能（NEW!）
- **リアルタイム録音**: 会議中に音声を直接録音
- **画面共有録音**: Google Meet、Teams、Zoom、Discord、Slack、Skypeの音声をキャプチャ
- **マイク録音**: 従来の音声録音方式
- **会議URL管理**: 参加する会議のURLを管理
- **即座に文字起こし**: 録音停止と同時に自動で文字起こし開始

## 必要な環境

### システム要件
- PHP 8.2以上
- Node.js 18以上
- Composer
- **Deepgram APIキー**（[deepgram.com](https://deepgram.com)で取得）

### API設定
1. [Deepgram](https://deepgram.com)でアカウント作成
2. APIキーを取得（無料クレジット$200付き）
3. `.env`ファイルに設定：
```bash
DEEPGRAM_API_KEY=your_api_key_here
```

### 💰 料金について
- **Deepgram API**: $0.0043/分（約0.65円/分）
- **初回$200無料クレジット**で約46,000分（約770時間）無料利用可能
- **従量課金制**: 使った分だけ課金
- **OpenAIより30%安価**

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

### 2. API設定
`.env`ファイルを編集してDeepgram APIキーを設定：
```bash
# .env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### 3. ストレージの設定
```bash
# ストレージディレクトリの作成とパーミッション設定
php artisan storage:link
chmod -R 775 storage/
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

## 📁 ファイルアップロード機能

### 2. 議事録作成ページへアクセス
ブラウザで `http://localhost:8000/transcription` にアクセス

### 3. 音声ファイルのアップロード
- ファイルをドラッグ&ドロップまたは「ファイルを選択」ボタンから選択
- サポート形式：MP3, WAV, MP4, M4A, OGG, WebM, FLAC, MOV, AVI
- ファイルサイズ制限：500MB

### 4. Deepgramモデルの選択
- **nova-2**: 最新・最高精度（推奨）
- **nova**: 高精度・高速
- **enhanced**: 汎用高精度モデル
- **base**: 基本モデル

### 5. 文字起こしの実行
「文字起こし開始」ボタンをクリックして処理を開始

### 6. 結果の確認・保存
- 全文とタイムスタンプ付きセグメントを表示
- 「ダウンロード」ボタンでテキストファイルとして保存

## 🎙️ ライブ議事録機能

### 1. ライブ議事録ページへアクセス
ブラウザで `http://localhost:8000/transcription/live` にアクセス

### 2. 会議URLの入力（任意）
- 参加する会議のURLを入力
- 「開く」ボタンで新しいタブで会議を起動

### 3. 録音方法の選択

#### 🖥️ 画面共有録音（推奨）
1. 「画面共有」を選択
2. 「録音開始」ボタンをクリック
3. ブラウザの画面共有ダイアログで：
   - 「タブを共有」を選択
   - 会議が開かれているタブを選択
   - **「システム音声を共有」または「タブの音声を共有」をチェック**
4. 「共有」ボタンをクリック
5. 会議終了時に「録音停止」ボタンをクリック

#### 🎤 マイク録音
1. 「マイク」を選択
2. 「録音開始」ボタンをクリック
3. マイクアクセスを許可
4. 会議終了時に「録音停止」ボタンをクリック

### 4. 自動文字起こし
- 録音停止と同時に自動で文字起こしが開始されます
- 結果は画面右側にリアルタイムで表示されます

### 5. 結果の保存
- 「ダウンロード」ボタンで議事録をテキストファイルとして保存

## 🔧 対応会議プラットフォーム

### 完全対応（画面共有録音）
- ✅ **Google Meet** - `meet.google.com`
- ✅ **Microsoft Teams** - `teams.microsoft.com`
- ✅ **Zoom** - `zoom.us`
- ✅ **Discord** - `discord.com`
- ✅ **Slack** - `slack.com`
- ✅ **Skype** - `skype.com`

### 使用時の注意事項
1. **Chrome、Firefox、Edge推奨** - Safari は一部機能に制限あり
2. **音声共有を忘れずに** - 画面共有時に「システム音声」のチェックを忘れがち
3. **プライバシー** - すべての処理はローカルで実行（外部送信なし）
4. **ファイルサイズ** - 長時間録音は25MB制限に注意

## トラブルシューティング

### APIキーエラー
```bash
# .env ファイルを確認
cat .env | grep DEEPGRAM_API_KEY

# Laravel設定キャッシュクリア
php artisan config:clear
```

### ファイルアップロードエラー
`php.ini` の設定を確認：
```ini
upload_max_filesize = 500M
post_max_size = 500M
max_execution_time = 600
memory_limit = 1G
```

### 権限エラー
```bash
# ストレージディレクトリの権限修正
sudo chown -R www-data:www-data storage/
sudo chmod -R 775 storage/
```

### APIレスポンスエラー
- **401 Unauthorized**: APIキーが無効
- **429 Rate Limited**: リクエスト制限に達した
- **500 Internal Error**: Deepgramサーバーエラー（一時的な問題）

## 開発者向け情報

### ファイル構成
```
app/
├── Http/Controllers/TranscriptionController.php  # コントローラー
├── Services/DeepgramTranscriptionService.php     # Deepgram APIサービス

resources/js/pages/Transcription/
├── Index.tsx                                     # ファイルアップロードUI
├── LiveRecording.tsx                             # ライブ録音UI

resources/js/hooks/
├── use-screen-recorder.tsx                       # 画面共有録音フック
├── use-audio-recorder.tsx                        # マイク録音フック

routes/
├── web.php                                       # ルート定義

config/
├── services.php                                  # API設定
```

### API エンドポイント
- `GET /transcription` - 議事録作成ページ
- `POST /transcription` - 文字起こし実行

### カスタマイズ
- **モデルの追加**: `TranscriptionController.php` のバリデーションルールを変更
- **UI調整**: `resources/js/pages/Transcription/` 内のファイルを編集
- **API設定**: `DeepgramTranscriptionService.php` でパラメータ調整
- **料金計算**: `calculateCost()` メソッドで価格設定変更

### Deepgram API機能
- **Smart Format**: 自動句読点・大文字化
- **Diarization**: 話者分離
- **Language Detection**: 自動言語検出
- **Confidence Score**: 信頼度スコア
- **Custom Vocabulary**: カスタム語彙対応

## 🎉 完成！

**Deepgram API**による高速・高精度・低コストな議事録アプリが完成しました：

### ✅ メリット
- **セットアップ簡単**: APIキーのみで動作
- **高速処理**: 数秒で文字起こし完了
- **高精度**: 最新のAI音声認識
- **低コスト**: OpenAIより30%安価
- **スケーラブル**: 同時複数ユーザー対応
- **メンテナンス不要**: サーバー管理不要

### 🚀 今すぐ始める
1. [Deepgram](https://deepgram.com)でAPIキー取得（$200無料クレジット）
2. `.env`にAPIキー設定
3. `composer run dev`でサーバー起動
4. ブラウザで議事録作成開始！