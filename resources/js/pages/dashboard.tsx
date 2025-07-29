import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Zap, 
  FileText, 
  Clock, 
  Download, 
  ArrowRight,
  Play,
  Sparkles
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col items-center justify-center p-8 max-w-4xl mx-auto">
                {/* シンプルなヒーロー */}
                <div className="text-center space-y-8">
                    <div className="space-y-4">
                        <Mic className="h-16 w-16 text-blue-500 mx-auto" />
                        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
                            RecRoom
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-lg">
                            会議の音声を録音して、自動で議事録を作成
                        </p>
                    </div>

                    {/* メインボタン */}
                    <Link href="/transcription/live">
                        <Button size="lg" className="px-8 py-4 text-lg">
                            議事録を作ってみる
                        </Button>
                    </Link>

                    {/* 2つの機能を簡潔に */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-12">
                        <div className="p-6 border rounded-lg text-center space-y-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <Mic className="h-8 w-8 text-blue-500 mx-auto" />
                            <h3 className="font-semibold">議事録作成</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                録音後に文字起こしファイルをダウンロード
                            </p>
                        </div>
                        <div className="p-6 border rounded-lg text-center space-y-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <Zap className="h-8 w-8 text-purple-500 mx-auto" />
                            <h3 className="font-semibold">ライブ議事録</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                録音中にリアルタイムで文字起こしを表示
                            </p>
                        </div>
                    </div>

                    {/* さりげないリンク */}
                    <div className="mt-8">
                        <Link href="/transcription/realtime" className="text-blue-500 hover:text-blue-600 underline">
                            ライブ議事録も試してみる →
                        </Link>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
