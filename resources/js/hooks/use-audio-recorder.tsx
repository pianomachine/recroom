import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
  duration: number;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getUserMedia' in navigator.mediaDevices;

  const updateDuration = useCallback(() => {
    if (startTimeRef.current > 0) {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('お使いのブラウザは音声録音をサポートしていません。');
      return;
    }

    try {
      setError(null);
      setDuration(0);
      
      // マイクアクセスを要求
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      chunksRef.current = [];

      // MediaRecorderの設定
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
      };

      mediaRecorderRef.current = new MediaRecorder(stream, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('録音中にエラーが発生しました。');
        setIsRecording(false);
      };

      mediaRecorderRef.current.start(1000); // 1秒ごとにデータを記録
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      // 録音時間の更新
      timerRef.current = setInterval(updateDuration, 1000);

    } catch (err: any) {
      console.error('Audio recording error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('マイクアクセスが拒否されました。ブラウザの許可設定を確認してください。');
      } else if (err.name === 'NotFoundError') {
        setError('マイクが見つかりません。');
      } else {
        setError('音声録音の開始に失敗しました: ' + err.message);
      }
    }
  }, [isSupported, updateDuration]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        setIsRecording(false);
        startTimeRef.current = 0;
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
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
    duration,
  };
}