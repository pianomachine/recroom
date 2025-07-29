import { useState, useRef, useCallback } from 'react';

interface UseScreenRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
}

export function useScreenRecorder(): UseScreenRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isSupported = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getDisplayMedia' in navigator.mediaDevices;

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('お使いのブラウザは画面録画をサポートしていません。Chrome、Firefox、Edgeをご利用ください。');
      return;
    }

    try {
      setError(null);
      
      // 画面共有 + 音声キャプチャを要求
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } as MediaTrackConstraints,
      });

      // 音声トラックの確認
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        setError('音声が選択されていません。画面共有時に「システム音声を共有」または「タブの音声を共有」を選択してください。');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      chunksRef.current = [];

      // MediaRecorderの設定（WAV優先、フォールバック付き）
      let options: MediaRecorderOptions = {};
      
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      }

      // 音声のみのストリームを作成
      const audioStream = new MediaStream(audioTracks);
      mediaRecorderRef.current = new MediaRecorder(audioStream, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        setIsRecording(false);
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('録音中にエラーが発生しました。');
        setIsRecording(false);
      };

      // 録画終了時の処理
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          if (isRecording) {
            stopRecording();
          }
        };
      });

      mediaRecorderRef.current.start(1000); // 1秒ごとにデータを記録
      setIsRecording(true);

    } catch (err: any) {
      console.error('Screen recording error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('画面共有が拒否されました。ブラウザの許可設定を確認してください。');
      } else if (err.name === 'NotSupportedError') {
        setError('お使いのブラウザは画面共有をサポートしていません。');
      } else if (err.name === 'NotFoundError') {
        setError('共有可能な画面が見つかりません。');
      } else {
        setError('画面共有の開始に失敗しました: ' + err.message);
      }
    }
  }, [isSupported, isRecording]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        // 実際に使用されたMIMEタイプを取得
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
      
      // すべてのトラックを停止
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    });
  }, [isRecording]);

  return {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    error,
  };
}