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
  isProcessing?: boolean;
}

type RecordingMode = 'screen' | 'audio';

export default function RealtimeTranscription() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [model, setModel] = useState('nova-2');
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('screen');
  const [transcriptionText, setTranscriptionText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isProcessingChunk, setIsProcessingChunk] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);

  const screenRecorder = useScreenRecorder();
  const audioRecorder = useAudioRecorder();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioBufferRef = useRef<Blob[]>([]);
  const [chunkInterval, setChunkInterval] = useState(10); // 10秒間隔をデフォルトに
  const transcriptionScrollRef = useRef<HTMLDivElement>(null);

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

  const sendChunkForTranscription = async (audioBlob: Blob, isOverlapping = false) => {
    console.log('Sending chunk for transcription, size:', audioBlob.size, 'overlapping:', isOverlapping);
    
    // 処理開始を表示
    setIsProcessingChunk(true);
    setProcessingStartTime(Date.now());
    
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
        const newText = data.text.trim();
        
        // 重複削除処理
        const currentText = transcriptionText;
        const processedText = isOverlapping ? removeDuplicateTextFromString(newText, currentText) : newText;
        
        if (processedText && processedText.length > 0) {
          // 連続したテキストとして追加
          setTranscriptionText(prev => {
            const separator = prev.length > 0 ? ' ' : '';
            return prev + separator + processedText;
          });
          
          // 自動スクロール
          setTimeout(() => {
            if (transcriptionScrollRef.current) {
              transcriptionScrollRef.current.scrollTop = transcriptionScrollRef.current.scrollHeight;
            }
          }, 100);
          
          console.log('Transcription text added:', processedText);
        }
      }
    } catch (err) {
      console.error('Chunk transcription error:', err);
    } finally {
      // 処理完了
      setIsProcessingChunk(false);
      setProcessingStartTime(null);
    }
  };

  // 文字列ベースの重複テキスト除去関数
  const removeDuplicateTextFromString = (newText: string, existingText: string): string => {
    if (!existingText || existingText.length === 0) return newText;
    
    // 日本語の場合、文字単位で重複をチェック
    const newChars = Array.from(newText.replace(/\s+/g, ''));
    const existingChars = Array.from(existingText.replace(/\s+/g, ''));
    
    if (newChars.length === 0) return '';
    
    // 既存テキストの末尾100文字のみをチェック（パフォーマンス向上）
    const checkText = existingText.slice(-100);
    
    // 最長共通接頭辞を見つける
    let overlapLength = 0;
    const maxCheckLength = Math.min(newChars.length, 50); // 最大50文字まで
    
    for (let i = 5; i <= maxCheckLength; i++) { // 最低5文字以上の重複のみ検出
      const newSlice = newChars.slice(0, i).join('');
      if (checkText.includes(newSlice)) {
        overlapLength = i;
      }
    }
    
    // 重複部分を除去
    const uniqueChars = newChars.slice(overlapLength);
    const result = uniqueChars.join('').trim();
    
    console.log('String-based duplicate removal:', {
      original: newText.slice(0, 30) + '...',
      checkText: checkText.slice(-30),
      overlapLength,
      result: result.slice(0, 30) + '...'
    });
    
    return result;
  };

  const handleStartRealTimeRecording = async () => {
    setError(null);
    setTranscriptionText('');
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
          audioBufferRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        if (chunksRef.current.length > 0) {
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          // 重複を最小限に抑制：現在のチャンクのみ送信
          sendChunkForTranscription(blob, false);
          chunksRef.current = [];
          
          // バッファサイズを制限（メモリ使用量を抑制）
          if (audioBufferRef.current.length > 5) {
            audioBufferRef.current = audioBufferRef.current.slice(-3);
          }
        }
      };

      // 10秒間隔で音声チャンクを送信（文脈をより保持）
      mediaRecorderRef.current.start();
      intervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, chunkInterval * 1000);

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
    if (!transcriptionText || transcriptionText.trim().length === 0) return;

    const content = `リアルタイム議事録\n生成日時: ${new Date().toLocaleString('ja-JP')}\n使用モデル: ${model}\n\n--- 全文 ---\n${transcriptionText}`;

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
                録音中にリアルタイムで文字起こしを表示します（{chunkInterval}秒間隔）
              </p>
              <div className="mt-2 text-sm bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
                <strong>⚡ リアルタイム機能:</strong> 音声を{chunkInterval}秒間隔で処理、重複を除去してリアルタイム表示
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

                <div className="grid grid-cols-2 gap-4">
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="chunkInterval">処理間隔</Label>
                    <Select 
                      value={chunkInterval.toString()} 
                      onValueChange={(value) => setChunkInterval(parseInt(value))} 
                      disabled={isTranscribing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3秒 - 高頻度（リアルタイム重視）</SelectItem>
                        <SelectItem value="5">5秒 - 標準</SelectItem>
                        <SelectItem value="7">7秒 - 安定重視</SelectItem>
                        <SelectItem value="10">10秒 - 推奨（文脈重視）</SelectItem>
                        <SelectItem value="30">30秒 - 最高精度（長時間処理）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                      音声を{chunkInterval}秒間隔で処理してリアルタイム文字起こし中...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* リアルタイム文字起こし結果 - Word文書スタイル */}
          <div className="space-y-6">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>議事録</CardTitle>
                    <CardDescription>
                      {transcriptionText.length > 0 
                        ? `${transcriptionText.length}文字の文字起こし済み`
                        : 'リアルタイム録音を開始すると、ここに文字起こし結果が表示されます'
                      }
                    </CardDescription>
                  </div>
                  {transcriptionText.length > 0 && (
                    <Button onClick={downloadTranscript} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      ダウンロード
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <div className="h-full bg-white dark:bg-gray-900 rounded-lg border-2 border-muted shadow-inner">
                  {transcriptionText.length === 0 && !isTranscribing ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">議事録待機中</p>
                        <p className="text-sm">録音を開始すると、ここにリアルタイムで文字が表示されます</p>
                      </div>
                    </div>
                  ) : (
                    <div ref={transcriptionScrollRef} className="h-full overflow-y-auto p-6 space-y-1 scroll-smooth">
                      <div className="min-h-[24px] relative">
                        {/* メインテキスト */}
                        <span className="text-base leading-relaxed whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                          {transcriptionText}
                        </span>
                        
                        {/* 処理中インジケーター */}
                        {isProcessingChunk && (
                          <span className="inline-flex ml-2 items-center gap-1">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                            <span className="text-xs text-blue-600 ml-1">文字起こし中...</span>
                          </span>
                        )}
                        
                        {/* カーソル点滅 */}
                        {isTranscribing && !isProcessingChunk && (
                          <span className="inline-block w-0.5 h-5 bg-gray-900 dark:bg-gray-100 ml-1 animate-pulse"></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* 統計情報 */}
            {isTranscribing && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(transcriptionText.length / 60) || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">推定分数</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {transcriptionText.length}
                      </div>
                      <div className="text-xs text-muted-foreground">文字数</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {transcriptionText.split(/\s+/).filter(word => word.length > 0).length}
                      </div>
                      <div className="text-xs text-muted-foreground">語数</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}