import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Upload, FileAudio, Play, Pause, Download, Radio, Zap } from 'lucide-react';
import { useState, useRef } from 'react';

interface TranscriptionResult {
  text: string;
  language: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  filename: string;
  model: string;
  metadata?: {
    duration: number;
    cost: number;
    confidence: number;
    provider: string;
  };
}

export default function TranscriptionIndex() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [model, setModel] = useState('nova-2');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = [
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 
    'audio/x-m4a', 'audio/ogg', 'audio/webm', 'audio/flac',
    'video/mp4', 'video/quicktime', 'video/x-msvideo'
  ];

  const modelDescriptions = {
    'nova-2': '最新・最高精度（推奨）',
    'nova': '高精度・高速',
    'enhanced': '汎用高精度モデル',
    'base': '基本モデル'
  };

  const handleFileSelect = (file: File) => {
    if (!supportedFormats.includes(file.type)) {
      setError('サポートされていないファイル形式です。MP3, WAV, MP4などの音声・動画ファイルを選択してください。');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズが5MBを超えています。より小さなファイルをお試しください。');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;

    setIsTranscribing(true);
    setError(null);

    const formData = new FormData();
    formData.append('audio_file', selectedFile);
    formData.append('model', model);

    try {
      const response = await fetch('/transcription', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || '文字起こし処理でエラーが発生しました。');
      }
    } catch (err) {
      setError('通信エラーが発生しました。');
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadTranscript = () => {
    if (!result) return;

    const content = `議事録 - ${result.filename}\n生成日時: ${new Date().toLocaleString('ja-JP')}\n使用モデル: ${result.model}\n言語: ${result.language}\n\n--- 全文 ---\n${result.text}\n\n--- タイムスタンプ付き ---\n${result.segments.map(seg => `[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${seg.text}`).join('\n')}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `議事録_${result.filename}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <Head title="議事録作成" />
      
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">議事録作成</h1>
              <p className="text-muted-foreground">
                音声・動画ファイルをアップロードして自動で文字起こしを行います
              </p>
              <div className="mt-2 text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <strong>💰 料金:</strong> Deepgram API使用 - 約0.65円/分（$0.0043/分）
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/transcription/realtime">
                <Button variant="outline" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  ライブ議事録
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* ファイルアップロード */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                ファイルアップロード
              </CardTitle>
              <CardDescription>
                MP3, WAV, MP4などの音声・動画ファイル（最大5MB）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileAudio className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      ファイルをドラッグ＆ドロップ
                    </p>
                    <p className="text-muted-foreground mb-4">または</p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      ファイルを選択
                    </Button>
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="audio/*,video/*,.mp3,.wav,.mp4,.m4a,.ogg,.webm,.flac,.mov,.avi"
                onChange={handleFileInputChange}
              />

              {selectedFile && (
                <div className="mt-4 flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="model">Deepgramモデル</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(modelDescriptions).map(([key, desc]) => (
                          <SelectItem key={key} value={key}>
                            {key} - {desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      onClick={handleTranscribe}
                      disabled={isTranscribing}
                      className="min-w-32"
                    >
                      {isTranscribing ? '文字起こし中...' : '文字起こし開始'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* エラー表示 */}
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}

          {/* 結果表示 */}
          {result && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>文字起こし結果</CardTitle>
                    <CardDescription>
                      ファイル: {result.filename} | 言語: {result.language} | モデル: {result.model}
                      {result.metadata && (
                        <span> | 時間: {Math.round(result.metadata.duration)}秒 | 料金: ${result.metadata.cost}</span>
                      )}
                    </CardDescription>
                  </div>
                  <Button onClick={downloadTranscript} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    ダウンロード
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 全文 */}
                  <div>
                    <h3 className="font-semibold mb-3">全文</h3>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {result.text}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* タイムスタンプ付きセグメント */}
                  <div>
                    <h3 className="font-semibold mb-3">タイムスタンプ付き</h3>
                    <div className="space-y-2">
                      {result.segments.map((segment, index) => (
                        <div key={index} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="text-sm text-muted-foreground font-mono min-w-20">
                            {formatTime(segment.start)} - {formatTime(segment.end)}
                          </div>
                          <div className="flex-1">
                            {segment.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}