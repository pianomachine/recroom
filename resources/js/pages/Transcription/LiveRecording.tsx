import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { 
  Monitor, 
  Mic, 
  Square, 
  Play, 
  Download, 
  Clock, 
  Volume2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useScreenRecorder } from '@/hooks/use-screen-recorder';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';

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
}

type RecordingMode = 'screen' | 'audio';

export default function LiveRecording() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [model, setModel] = useState('nova-2');
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('screen');
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const screenRecorder = useScreenRecorder();
  const audioRecorder = useAudioRecorder();

  const activeRecorder = recordingMode === 'screen' ? screenRecorder : audioRecorder;

  const modelDescriptions = {
    'nova-2': '最新・最高精度（推奨）',
    'nova': '高精度・高速',
    'enhanced': '汎用高精度モデル',
    'base': '基本モデル'
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    setError(null);
    setResult(null);
    console.log('Starting recording with mode:', recordingMode);
    await activeRecorder.startRecording();
  };

  const handleStopRecording = async () => {
    console.log('Stopping recording...');
    const blob = await activeRecorder.stopRecording();
    
    console.log('Recording stopped, blob:', blob);
    console.log('Blob size:', blob?.size, 'bytes');
    console.log('Blob type:', blob?.type);
    
    if (blob) {
      console.log('Starting transcription...');
      setIsTranscribing(true);
      
      const formData = new FormData();
      // WebMをWAVとして送信（Deepgram互換性のため）
      formData.append('audio_file', blob, `recording_${Date.now()}.wav`);
      formData.append('model', model);

      console.log('FormData created, sending to /transcription');

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

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
          console.log('Transcription successful:', data);
          setResult(data);
          setError(null);
        } else {
          console.error('Transcription error:', data.error);
          setError(data.error || '文字起こし処理でエラーが発生しました。');
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        setError('アップロードエラーが発生しました: ' + err.message);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      console.warn('No blob received from recorder');
      setError('録音データが取得できませんでした。音声共有が有効になっているか確認してください。');
    }
  };

  const openMeetingUrl = () => {
    if (meetingUrl) {
      window.open(meetingUrl, '_blank');
    }
  };

  const downloadTranscript = () => {
    if (!result) return;

    const content = `議事録 - ${result.filename}\n生成日時: ${new Date().toLocaleString('ja-JP')}\n使用モデル: ${result.model}\n言語: ${result.language}\n会議URL: ${meetingUrl}\n\n--- 全文 ---\n${result.text}\n\n--- タイムスタンプ付き ---\n${result.segments.map(seg => `[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${seg.text}`).join('\n')}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `議事録_${new Date().toISOString().slice(0, 10)}_${new Date().toTimeString().slice(0, 8).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMeetingPlatform = (url: string) => {
    if (url.includes('meet.google.com')) return 'Google Meet';
    if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
    if (url.includes('zoom.us')) return 'Zoom';
    if (url.includes('discord.')) return 'Discord';
    if (url.includes('skype.com')) return 'Skype';
    if (url.includes('slack.com')) return 'Slack';
    return '会議プラットフォーム';
  };

  return (
    <AppLayout>
      <Head title="ライブ議事録作成" />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">ライブ議事録作成</h1>
          <p className="text-muted-foreground">
            会議の音声をリアルタイムで録音・文字起こしします
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 左側: 録音設定 */}
          <div className="space-y-6">
            {/* 会議URL */}
            <Card>
              <CardHeader>
                <CardTitle>会議情報</CardTitle>
                <CardDescription>
                  参加する会議のURLを入力してください（任意）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-url">会議URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="meeting-url"
                      placeholder="https://meet.google.com/xxx-xxxx-xxx"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      onClick={openMeetingUrl}
                      disabled={!meetingUrl}
                    >
                      開く
                    </Button>
                  </div>
                  {meetingUrl && (
                    <p className="text-sm text-muted-foreground">
                      {getMeetingPlatform(meetingUrl)} として認識されました
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 録音設定 */}
            <Card>
              <CardHeader>
                <CardTitle>録音設定</CardTitle>
                <CardDescription>
                  録音方法とモデルを選択してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>録音方法</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={recordingMode === 'screen' ? 'default' : 'outline'}
                      onClick={() => setRecordingMode('screen')}
                      className="h-20 flex-col gap-2"
                    >
                      <Monitor className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">画面共有</div>
                        <div className="text-xs text-muted-foreground">推奨</div>
                      </div>
                    </Button>
                    <Button
                      variant={recordingMode === 'audio' ? 'default' : 'outline'}
                      onClick={() => setRecordingMode('audio')}
                      className="h-20 flex-col gap-2"
                    >
                      <Mic className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">マイク</div>
                        <div className="text-xs text-muted-foreground">基本</div>
                      </div>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
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
              </CardContent>
            </Card>

            {/* 録音コントロール */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {recordingMode === 'screen' ? <Monitor className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  録音コントロール
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!activeRecorder.isSupported && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    お使いのブラウザは録音機能をサポートしていません。Chrome、Firefox、Edgeをご利用ください。
                  </Alert>
                )}

                {activeRecorder.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    {activeRecorder.error}
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </Alert>
                )}

                {activeRecorder.isRecording && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-medium text-red-800">録音中</span>
                    </div>
                    {'duration' in activeRecorder && (
                      <div className="flex items-center gap-2 text-sm text-red-700">
                        <Clock className="h-4 w-4" />
                        {formatTime(activeRecorder.duration)}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {!activeRecorder.isRecording ? (
                    <Button
                      onClick={handleStartRecording}
                      disabled={!activeRecorder.isSupported}
                      className="flex-1"
                      size="lg"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      録音開始
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopRecording}
                      disabled={isTranscribing}
                      variant="destructive"
                      className="flex-1"
                      size="lg"
                    >
                      <Square className="h-5 w-5 mr-2" />
                      {isTranscribing ? '文字起こし中...' : '録音停止'}
                    </Button>
                  )}
                </div>

                {recordingMode === 'screen' && (
                  <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                    <div className="font-medium mb-1">画面共有のヒント:</div>
                    <ul className="space-y-1 text-xs">
                      <li>• 「タブを共有」を選択し、会議のタブを選んでください</li>
                      <li>• 「システム音声を共有」または「タブの音声を共有」をチェック</li>
                      <li>• 共有を停止すると録音も自動で停止します</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右側: 結果表示 */}
          <div className="space-y-6">
            {result && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        文字起こし結果
                      </CardTitle>
                      <CardDescription>
                        言語: {result.language} | モデル: {result.model}
                      </CardDescription>
                    </div>
                    <Button onClick={downloadTranscript} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      ダウンロード
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 max-h-96 overflow-y-auto">
                    {/* 全文 */}
                    <div>
                      <h3 className="font-semibold mb-3">全文</h3>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="whitespace-pre-wrap leading-relaxed text-sm">
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
                            <Badge variant="outline" className="text-xs min-w-fit">
                              {formatTime(segment.start)} - {formatTime(segment.end)}
                            </Badge>
                            <div className="flex-1 text-sm">
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

            {!result && !activeRecorder.isRecording && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Volume2 className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">録音を開始してください</h3>
                  <p className="text-muted-foreground text-sm">
                    会議に参加して「録音開始」ボタンを押すと、<br />
                    自動で文字起こしを開始します
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}