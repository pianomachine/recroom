import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
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
  Zap,
  Wifi
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useScreenRecorder } from '@/hooks/use-screen-recorder';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';

interface TranscriptionChunk {
  text: string;
  timestamp: number;
  confidence?: number;
}

type RecordingMode = 'screen' | 'audio';

export default function RealtimeTranscription() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [model, setModel] = useState('nova-2');
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('screen');
  const [transcriptionChunks, setTranscriptionChunks] = useState<TranscriptionChunk[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const screenRecorder = useScreenRecorder();
  const audioRecorder = useAudioRecorder();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const sendChunkForTranscription = async (audioBlob: Blob) => {
    console.log('Sending chunk for transcription, size:', audioBlob.size);
    
    const formData = new FormData();
    formData.append('audio_file', audioBlob, `chunk_${Date.now()}.wav`);
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

      if (data.success && data.text.trim()) {
        const newChunk: TranscriptionChunk = {
          text: data.text.trim(),
          timestamp: Date.now(),
          confidence: data.metadata?.confidence
        };
        
        setTranscriptionChunks(prev => [...prev, newChunk]);
        console.log('Transcription chunk received:', newChunk.text);
      }
    } catch (err) {
      console.error('Chunk transcription error:', err);
    }
  };

  const handleStartRealTimeRecording = async () => {
    setError(null);
    setTranscriptionChunks([]);
    setConnectionStatus('connecting');
    
    try {
      // 録音開始
      await activeRecorder.startRecording();
      
      // リアルタイム処理用のMediaRecorderを再設定
      const stream = recordingMode === 'screen' 
        ? await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100,
            } as MediaTrackConstraints,
          })
        : await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('音声トラックが見つかりません');
      }

      // 音声のみのストリームを作成
      const audioStream = new MediaStream(audioTracks);
      
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      }

      mediaRecorderRef.current = new MediaRecorder(audioStream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        if (chunksRef.current.length > 0) {
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          sendChunkForTranscription(blob);
          chunksRef.current = [];
        }
      };

      // 3秒間隔で音声チャンクを送信
      mediaRecorderRef.current.start();
      intervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, 3000);

      setIsTranscribing(true);
      setConnectionStatus('connected');
      
    } catch (err: any) {
      console.error('Real-time recording error:', err);
      setError('リアルタイム録音の開始に失敗しました: ' + err.message);
      setConnectionStatus('disconnected');
    }
  };

  const handleStopRealTimeRecording = async () => {
    console.log('Stopping real-time recording...');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    await activeRecorder.stopRecording();
    setIsTranscribing(false);
    setConnectionStatus('disconnected');
  };

  const openMeetingUrl = () => {
    if (meetingUrl) {
      window.open(meetingUrl, '_blank');
    }
  };

  const getMeetingPlatform = (url: string) => {
    if (url.includes('meet.google.com')) return 'Google Meet';
    if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'Microsoft Teams';
    if (url.includes('zoom.us') || url.includes('zoom.com')) return 'Zoom';
    if (url.includes('discord.com') || url.includes('discord.gg')) return 'Discord';
    if (url.includes('slack.com')) return 'Slack';
    if (url.includes('skype.com')) return 'Skype';
    return '会議プラットフォーム';
  };

  const downloadTranscript = () => {
    if (transcriptionChunks.length === 0) return;

    const fullText = transcriptionChunks.map(chunk => chunk.text).join(' ');
    const timestampedText = transcriptionChunks.map((chunk, index) => 
      `[${new Date(chunk.timestamp).toLocaleTimeString()}] ${chunk.text}`
    ).join('\n');

    const content = `リアルタイム議事録\n生成日時: ${new Date().toLocaleString('ja-JP')}\n使用モデル: ${model}\n\n--- 全文 ---\n${fullText}\n\n--- タイムスタンプ付き ---\n${timestampedText}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `リアルタイム議事録_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <AppLayout>
      <Head title="リアルタイム文字起こし" />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Zap className="h-8 w-8 text-blue-500" />
                リアルタイム文字起こし
              </h1>
              <p className="text-muted-foreground">
                録音中にリアルタイムで文字起こしを表示します（3秒間隔）
              </p>
              <div className="mt-2 text-sm bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
                <strong>⚡ リアルタイム機能:</strong> 音声を3秒間隔で処理してリアルタイム表示
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'outline'} className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                {connectionStatus === 'connected' ? '接続中' : 
                 connectionStatus === 'connecting' ? '接続中...' : '未接続'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {/* 会議URL入力 */}
            <Card>
              <CardHeader>
                <CardTitle>会議URL</CardTitle>
                <CardDescription>
                  参加する会議のURLを入力してください（任意）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={openMeetingUrl}
                    disabled={!meetingUrl}
                    variant="outline"
                  >
                    開く
                  </Button>
                </div>
                {meetingUrl && (
                  <div className="text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    {getMeetingPlatform(meetingUrl)} として認識されました
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 録音設定 */}
            <Card>
              <CardHeader>
                <CardTitle>リアルタイム録音設定</CardTitle>
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
                      disabled={isTranscribing}
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
                      disabled={isTranscribing}
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
                  <Select value={model} onValueChange={setModel} disabled={isTranscribing}>
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

                <div className="flex gap-2">
                  {!isTranscribing ? (
                    <Button
                      onClick={handleStartRealTimeRecording}
                      disabled={!activeRecorder.isSupported}
                      className="flex-1 h-12"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      リアルタイム録音開始
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopRealTimeRecording}
                      variant="destructive"
                      className="flex-1 h-12"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      録音停止
                    </Button>
                  )}
                </div>

                {isTranscribing && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="font-medium text-blue-800">リアルタイム録音中</span>
                    </div>
                    <p className="text-sm text-blue-600">
                      音声を3秒間隔で処理してリアルタイム文字起こし中...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* リアルタイム文字起こし結果 */}
          <div className="space-y-6">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>リアルタイム文字起こし結果</CardTitle>
                    <CardDescription>
                      {transcriptionChunks.length > 0 
                        ? `${transcriptionChunks.length}個のチャンク処理済み`
                        : 'リアルタイム録音を開始すると、ここに文字起こし結果が表示されます'
                      }
                    </CardDescription>
                  </div>
                  {transcriptionChunks.length > 0 && (
                    <Button onClick={downloadTranscript} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      ダウンロード
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <div className="h-full bg-muted/30 rounded-lg p-4 overflow-y-auto space-y-3">
                  {transcriptionChunks.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>リアルタイム文字起こし待機中</p>
                        <p className="text-sm">録音を開始すると、ここにリアルタイムで文字が表示されます</p>
                      </div>
                    </div>
                  ) : (
                    transcriptionChunks.map((chunk, index) => (
                      <div key={index} className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="text-xs text-muted-foreground font-mono min-w-20">
                            {new Date(chunk.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="flex-1">
                            <p className="animate-in slide-in-from-left duration-300">
                              {chunk.text}
                            </p>
                            {chunk.confidence && (
                              <div className="text-xs text-muted-foreground mt-1">
                                信頼度: {Math.round(chunk.confidence * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}